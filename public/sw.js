/**
 * Service worker: el único trozo de la app que sigue vivo con la pestaña
 * cerrada, y por eso el que recibe los avisos. No importa nada del resto del
 * código porque se ejecuta en otro contexto, sin acceso al DOM ni al bundle.
 *
 * Vive en public/ para que Vite lo sirva en la raíz: un service worker sólo
 * puede controlar rutas por debajo de la suya, así que desde /assets/ no
 * valdría para nada.
 */

// Sin esto el service worker recién instalado se queda "esperando" a que se
// cierren las pestañas viejas, y un cambio aquí no llega hasta el siguiente
// arranque en frío del navegador.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event =>
	event.waitUntil(self.clients.claim())
);

self.addEventListener('push', event => {
	// Si el payload no es el nuestro (o viene vacío) no se puede tragar el
	// evento en silencio: Chrome exige mostrar algo por cada push recibido y, si
	// no lo haces, acaba mostrando él un aviso genérico de "actualizado en
	// segundo plano" y puede terminar retirando el permiso.
	const notice = readNotice(event.data);

	event.waitUntil(
		self.registration.showNotification(notice.title, {
			body: notice.body,
			lang: 'es',
			// Sin `icon` a propósito: esa opción es la imagen grande de la
			// derecha, y repetía la misma bolsa que ya sale como icono de la
			// app, a la izquierda. Ese icono pequeño no se declara aquí — lo
			// saca Chrome del manifest.
			//
			// Tampoco se pone `badge` (el glifo de la barra de estado): Android
			// lo pinta en monocromo a partir del alfa, y esta bolsa, que tiene
			// relleno opaco, saldría maciza y sin el contorno que la hace
			// reconocible.
			// El tag hace que un aviso sustituya al anterior del mismo tipo en vez
			// de apilarse: si el resumen del lunes sigue sin leerse el lunes
			// siguiente, no quedan dos.
			tag: notice.tag,
			data: { url: notice.url ?? '/' }
		})
	);
});

const readNotice = data => {
	try {
		const notice = data?.json();
		if (notice?.title) return notice;
	} catch {
		// Payload que no es JSON: cae al aviso genérico de abajo.
	}

	return {
		title: 'Despensa',
		body: 'Hay novedades en tu despensa.',
		tag: 'despensa'
	};
};

self.addEventListener('notificationclick', event => {
	event.notification.close();

	// Reutiliza la pestaña si ya está abierta en vez de abrir otra encima.
	event.waitUntil(
		(async () => {
			const url = new URL(
				event.notification.data?.url ?? '/',
				self.location.origin
			);
			const windows = await self.clients.matchAll({
				type: 'window',
				includeUncontrolled: true
			});

			const own = windows.find(client =>
				client.url.startsWith(self.registration.scope)
			);

			if (own) {
				await own.focus();
				return;
			}

			await self.clients.openWindow(url.href);
		})()
	);
});
