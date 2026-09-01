import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { plan } from './notices.js';

/**
 * Envía los avisos de la despensa. La invoca el cron una vez al día (ver
 * supabase/migrations/0003_notifications.sql); toda la decisión de qué se
 * cuenta y con qué texto vive en notices.js, que se prueba aparte.
 *
 * Los lunes manda el resumen de la semana EN LUGAR de los avisos sueltos, no
 * además: si no, un artículo que llega a cuatro días un lunes sonaría dos
 * veces seguidas. El resumen ya incluye todo lo que dirían los sueltos.
 *
 * Con la despensa en pausa (migración 0006) no se envía nada, y es también el
 * único sitio que reanuda sola una despensa cuyo día de vuelta ya ha llegado
 * sin que nadie haya abierto la app.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Secreto propio, compartido sólo con el cron (ver la migración 0003). No se
// reutiliza aquí la service_role key por dos razones: la que la plataforma
// inyecta en SUPABASE_SERVICE_ROLE_KEY no es la misma cadena que se puede
// copiar del panel —así que la comparación no cuadraba nunca—, y sobre todo
// porque si esto se filtrase daría acceso completo a la base de datos en vez
// de a un simple "manda los avisos de hoy".
const CRON_SECRET = Deno.env.get('CRON_SECRET');
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

// El servicio de push contesta con estos dos cuando la suscripción ya no
// existe (el usuario desinstaló, limpió los datos, o el navegador la rotó).
// Es la única forma de enterarse: no hay aviso de baja.
const GONE = [404, 410];

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async request => {
	// La función se despliega sin verificación de JWT (ver config.toml), así
	// que esta cabecera es lo único que la protege: sin el secreto, cualquiera
	// que diera con la URL podría gastar los avisos del día. El primer término
	// evita que un despliegue sin el secreto puesto deje la puerta abierta a
	// quien tampoco mande la cabecera (undefined === undefined).
	if (!CRON_SECRET || request.headers.get('x-cron-secret') !== CRON_SECRET) {
		return new Response('No autorizado', { status: 401 });
	}

	// El estado de la pausa se consulta ANTES de leer los artículos, y con
	// resume_if_due() en vez de un select: si hoy es el día de la vuelta y
	// nadie ha abierto la app, la despensa se reanuda aquí mismo y todas las
	// fechas de agotamiento se desplazan. Leerlas antes daría los días
	// congelados de la ausencia y se avisaría de lo que no toca.
	const { data: pantry, error: pantryError } = await supabase.rpc(
		'resume_if_due'
	);

	if (pantryError) {
		return Response.json({ error: pantryError.message }, { status: 500 });
	}

	// Con la despensa parada no se manda nada ni se mueve ninguna bandera. No
	// es sólo por no molestar durante el viaje: los días no avanzan, así que un
	// aviso enviado hoy volvería a tocar mañana igual, y el resumen del lunes
	// contaría una foto idéntica a la de la semana anterior.
	if (pantry?.paused_at) {
		return Response.json({ enviados: 0, avisos: 0, pausada: true });
	}

	const { data: items, error } = await supabase
		.from('items')
		.select('id, name, depletes_at, warning_notified_at, depleted_notified_at');

	if (error || !items) {
		return Response.json(
			{ error: error?.message ?? 'sin datos' },
			{
				status: 500
			}
		);
	}

	// El cron dispara a las 07:00 UTC, que en España son las 8 o las 9 según la
	// época del año: nunca cruza la medianoche, así que el día de la semana en
	// UTC y el de aquí son el mismo.
	const monday = new Date().getUTCDay() === 1;
	const { notices, markWarned, markDepleted, clearWarned, clearDepleted } =
		plan(items, Date.now(), monday);

	// El rearme se aplica siempre, se envíe algo o no: no depende de que haya
	// nadie escuchando, sino de que el artículo ha vuelto a tener existencias.
	if (clearWarned.length) {
		await supabase
			.from('items')
			.update({ warning_notified_at: null })
			.in('id', clearWarned);
	}

	if (clearDepleted.length) {
		await supabase
			.from('items')
			.update({ depleted_notified_at: null })
			.in('id', clearDepleted);
	}

	if (!notices.length) {
		return Response.json({ enviados: 0, avisos: 0 });
	}

	const delivered = await send(notices);

	// Si no llegó a nadie, las banderas se quedan como están y mañana se vuelve
	// a intentar. Marcarlas igualmente perdería el aviso para siempre: es lo
	// que pasaría el primer día, con la tabla de suscripciones todavía vacía.
	if (delivered > 0) {
		if (markWarned.length) {
			await supabase
				.from('items')
				.update({ warning_notified_at: new Date().toISOString() })
				.in('id', markWarned);
		}

		if (markDepleted.length) {
			await supabase
				.from('items')
				.update({ depleted_notified_at: new Date().toISOString() })
				.in('id', markDepleted);
		}
	}

	return Response.json({
		enviados: delivered,
		avisos: notices.length,
		resumen: monday
	});
});

/**
 * Manda cada aviso a cada dispositivo suscrito. La despensa es compartida, así
 * que van todos a los dos: no hay avisos "de uno".
 */
const send = async (
	notices: { title: string; body: string; tag: string }[]
) => {
	const { data: subscriptions } = await supabase
		.from('push_subscriptions')
		.select('endpoint, p256dh, auth_secret');

	if (!subscriptions?.length) return 0;

	let delivered = 0;
	const gone: string[] = [];

	for (const subscription of subscriptions) {
		const target = {
			endpoint: subscription.endpoint,
			keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret }
		};

		for (const notice of notices) {
			try {
				// La urgencia es del propio protocolo Web Push (RFC 8030) y `high`
				// es lo que hace que FCM despierte al dispositivo de Doze para
				// entregar ya, en vez de esperar a la siguiente ventana de
				// mantenimiento — justo lo que retrasaba Samsung con la pantalla
				// bloqueada. Se pide siempre alta porque los tres avisos de esta
				// función acaban en una notificación visible para la persona,
				// nunca en trabajo silencioso de fondo, que es la condición bajo
				// la que Google pide reservarla.
				await webpush.sendNotification(
					target,
					JSON.stringify({ ...notice, url: '/' }),
					{ urgency: 'high' }
				);
				delivered++;
			} catch (e) {
				// En TS el error de un catch es `unknown`: web-push cuelga ahí el
				// código con el que contestó el servicio de push.
				const failure = e as { statusCode?: number; message?: string };

				if (GONE.includes(failure.statusCode ?? 0)) {
					gone.push(subscription.endpoint);
					break;
				}

				// Un fallo puntual de un dispositivo no puede llevarse por delante
				// el aviso de los demás, así que se deja constancia y se sigue.
				console.error(
					'Fallo enviando a',
					subscription.endpoint,
					failure.message
				);
			}
		}
	}

	if (gone.length) {
		await supabase.from('push_subscriptions').delete().in('endpoint', gone);
	}

	return delivered;
};
