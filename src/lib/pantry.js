/**
 * El estado de la pausa. La despensa entera se para durante una ausencia
 * larga: `pausedAt` es el instante en que se congeló el reloj y `resumesOn` el
 * día de vuelta previsto, si se dio uno.
 *
 * Aquí sólo vive lo que se puede calcular sin base de datos ni React, para que
 * se pueda probar con `node --test`: ver pantry.test.js. Quien habla con
 * Supabase es context/PantryContext.jsx.
 */

export const fromRow = row => ({
	pausedAt: row?.paused_at ?? null,
	resumesOn: row?.resumes_on ?? null
});

export const isPaused = pantry => Boolean(pantry.pausedAt);

/**
 * Un día suelto en formato ISO ('2026-09-15'), que es lo que entiende el input
 * de fecha del navegador y lo que guarda Postgres en una columna `date`.
 *
 * A mano y no con `toISOString()`: ese convierte a UTC, así que en España
 * cualquier hora anterior a las 02:00 devolvería el día anterior y el
 * calendario aparecería abierto por el día equivocado.
 */
export const toISODate = date =>
	[
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, '0'),
		String(date.getDate()).padStart(2, '0')
	].join('-');

/**
 * De '2026-09-15' a una fecha local. `new Date('2026-09-15')` la leería como
 * medianoche UTC, que en otro huso puede caer en el día de antes; construirla
 * por partes la ancla al día que pone.
 */
export const fromISODate = value => {
	const [year, month, day] = value.split('-').map(Number);

	return new Date(year, month - 1, day);
};

// Un día suelto ('2026-09-15') y no un instante completo. La distinción no es
// de tipo sino de forma: por aquí pasan los dos como texto —`resumes_on` es un
// día y `paused_at` un timestamp con su huso— y sólo el primero hay que
// anclarlo a mano al calendario de casa.
const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "15/09", o "07/01/27" si cae fuera del año actual, que es cuando el año
 * aporta: una pausa de Navidad vuelve en enero, y un "07/01" a secas se lee
 * como el que ya pasó.
 *
 * En números y no "15 de septiembre" porque esto vive en el banner, donde
 * compite por el ancho con el botón de reanudar: a 360px la fecha larga
 * empujaba el texto a dos líneas.
 */
export const formatDay = (value, today = new Date()) => {
	const date =
		typeof value === 'string' && DAY_ONLY.test(value)
			? fromISODate(value)
			: new Date(value);

	// A mano y no con toLocaleDateString: pidiéndole `2-digit` para el día y el
	// mes, en es-ES devuelve "15/9" igualmente —se queda con el patrón corto
	// del idioma— y el cero delante es justo lo que mantiene todas las fechas
	// del mismo ancho.
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');

	if (date.getFullYear() === today.getFullYear()) return `${day}/${month}`;

	return `${day}/${month}/${String(date.getFullYear()).slice(-2)}`;
};
