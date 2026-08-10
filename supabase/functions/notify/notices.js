/**
 * Decide qué avisos toca enviar y qué banderas hay que mover. Es todo función
 * pura —entra el estado, sale el plan— para que se pueda probar sin base de
 * datos ni servicio de push: ver notices.test.js.
 *
 * En JavaScript y no TypeScript por lo mismo: así el test corre con `node
 * --test` tal cual, sin cadena de compilación, y Deno lo importa igual.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Copia de WARNING_DAYS en src/lib/constants.js. La función se despliega
// aparte del front y no puede importar de src/, así que si cambia allí hay que
// cambiarlo aquí: el aviso tiene que llegar el mismo día en que el número se
// pone naranja en pantalla, o la app y el móvil dirían cosas distintas.
export const WARNING_DAYS = 4;

/**
 * Misma cuenta que daysLeft() en src/lib/items.js, con el reloj como
 * parámetro para poder fijarlo en las pruebas.
 */
export const daysLeft = (depletesAt, now) =>
	Math.max(0, Math.ceil((new Date(depletesAt).getTime() - now) / MS_PER_DAY));

// "a, b y c", con la 'e' de "Café e Higiénico" resuelta por el propio idioma.
const list = names =>
	new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(
		names
	);

const plural = (count, singular, plural) =>
	count === 1 ? `1 ${singular}` : `${count} ${plural}`;

const depletedNotice = items =>
	items.length === 1
		? {
				title: `${items[0].name} se ha agotado`,
				body: 'Se te ha acabado: añádelo a la compra.',
				tag: 'depleted'
		  }
		: {
				title: `${plural(
					items.length,
					'artículo',
					'artículos'
				)} se han agotado`,
				body: `${list(items.map(item => item.name))}. Añádelos a la compra.`,
				tag: 'depleted'
		  };

const warningNotice = items =>
	items.length === 1
		? {
				title: `${items[0].name} se está agotando`,
				body: 'Revisa tus existencias por si necesitas comprar más.',
				tag: 'warning'
		  }
		: {
				title: `${plural(
					items.length,
					'artículo',
					'artículos'
				)} se están agotando`,
				body: `${list(
					items.map(item => item.name)
				)}. Revisa tus existencias por si necesitas comprar más.`,
				tag: 'warning'
		  };

/**
 * El resumen mira el estado de hoy, no lo que ha cambiado: es una foto para
 * planificar la compra de la semana, así que incluye lo que ya se avisó en su
 * día y sigue pendiente. Si no hay nada que contar no se envía nada, para que
 * el lunes no suene el móvil por costumbre.
 */
const weeklyNotice = (depleted, warned) => {
	if (!depleted.length && !warned.length) return null;

	const parts = [];

	if (depleted.length) {
		parts.push(`Agotados: ${list(depleted.map(item => item.name))}.`);
	}

	if (warned.length) {
		const names = warned.map(item => `${item.name} (${item.days} días)`);
		parts.push(`Se acaban pronto: ${list(names)}.`);
	}

	return {
		title: 'Resumen de la despensa',
		body: parts.join(' '),
		tag: 'weekly'
	};
};

/**
 * @param items filas de `items` con sus dos banderas de aviso
 * @param now milisegundos (Date.now() en producción, fijo en las pruebas)
 * @param weekly si toca resumen semanal en vez de los avisos del día
 *
 * Devuelve los avisos a enviar y tres listas de ids: los que pasan a estar
 * avisados, los que pasan a estar agotados y los que se rearman.
 */
export const plan = (items, now, weekly) => {
	const state = items.map(item => ({
		...item,
		days: daysLeft(item.depletes_at, now)
	}));

	// Reponer rearma los avisos, y cada uno se rearma a su altura. Basta con
	// tener algo para que "se ha agotado" vuelva a tener sentido, pero hay que
	// pasar del umbral para que lo tenga "se está agotando": si se limpiaran a
	// la vez, comprar un bote de tres días dejaría el artículo dentro del
	// umbral con la bandera limpia y volvería a avisar al día siguiente.
	//
	// Al revés es igual de importante: si el agotado sólo se limpiara por
	// encima del umbral, reponer poco lo dejaría marcado para siempre y la
	// segunda vez que se acabase no diría nada.
	const clearDepleted = state
		.filter(item => item.days > 0 && item.depleted_notified_at)
		.map(item => item.id);

	const clearWarned = state
		.filter(item => item.days > WARNING_DAYS && item.warning_notified_at)
		.map(item => item.id);

	const depleted = state.filter(
		item => item.days === 0 && !item.depleted_notified_at
	);

	// Un artículo puede caer de 6 a 0 días de una vez (al restar unidades) sin
	// pasar nunca por "quedan 4": entonces sólo le toca el aviso de agotado, no
	// los dos seguidos.
	const warned = state.filter(
		item =>
			item.days > 0 && item.days <= WARNING_DAYS && !item.warning_notified_at
	);

	const notices = weekly
		? [
				weeklyNotice(
					state.filter(item => item.days === 0),
					state.filter(item => item.days > 0 && item.days <= WARNING_DAYS)
				)
		  ].filter(Boolean)
		: [
				depleted.length && depletedNotice(depleted),
				warned.length && warningNotice(warned)
		  ].filter(Boolean);

	return {
		notices,
		markDepleted: depleted.map(item => item.id),
		markWarned: warned.map(item => item.id),
		clearDepleted,
		clearWarned
	};
};
