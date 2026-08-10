import { useCallback, useEffect, useState } from 'react';
import {
	currentSubscription,
	disableNotifications,
	enableNotifications,
	pushDenied,
	pushSupported,
	saveSubscription
} from './push';

/**
 * Estado de los avisos en ESTE dispositivo:
 *
 *   checking     mientras se consulta al navegador
 *   unsupported  navegador sin push (aquí no se enseña el botón)
 *   denied       permiso denegado: sólo se arregla desde los ajustes del sitio
 *   off          se puede activar
 *   on           este móvil está suscrito
 */
export const usePush = () => {
	const [status, setStatus] = useState('checking');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		let cancelled = false;

		const check = async () => {
			if (!pushSupported()) return setStatus('unsupported');
			if (pushDenied()) return setStatus('denied');

			const subscription = await currentSubscription();
			if (cancelled) return;

			setStatus(subscription ? 'on' : 'off');

			// El navegador puede rotar el endpoint por su cuenta con la app
			// cerrada, y entonces la fila guardada apunta a un buzón que ya no
			// existe. Reescribirla en cada arranque la mantiene al día sin que
			// haya que volver a pedir permiso.
			if (subscription) {
				try {
					await saveSubscription(subscription);
				} catch {
					// Que falle el refresco no cambia lo que el usuario ve: sigue
					// suscrito en el navegador, y el siguiente arranque lo reintenta.
				}
			}
		};

		check();

		return () => {
			cancelled = true;
		};
	}, []);

	const enable = useCallback(async () => {
		setBusy(true);
		setError(null);

		try {
			const permission = await enableNotifications();

			// 'default' es cerrar el diálogo sin contestar: ni concedido ni
			// denegado, así que el botón se queda como estaba y se puede reintentar.
			if (permission === 'granted') setStatus('on');
			else if (permission === 'denied') setStatus('denied');
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	}, []);

	const disable = useCallback(async () => {
		setBusy(true);
		setError(null);

		try {
			await disableNotifications();
			setStatus('off');
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	}, []);

	return { status, busy, error, enable, disable };
};
