import { supabase } from './supabase';

/**
 * Suscripción a los avisos push. El navegador negocia la suscripción con el
 * servicio de push del fabricante (en Android, el de Google) y devuelve un
 * endpoint con dos claves; nosotros lo guardamos en Supabase para que la
 * función programada pueda enviar por él más tarde, con la app cerrada.
 *
 * La suscripción es por navegador y dispositivo, no por cuenta: activar los
 * avisos en un móvil no los activa en el otro, y cada uno tiene que darle una
 * vez a su botón.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const pushSupported = () =>
	'serviceWorker' in navigator &&
	'PushManager' in window &&
	'Notification' in window;

// El permiso denegado no se puede volver a pedir por código: el navegador
// ignora requestPermission() y hay que ir a los ajustes del sitio a mano.
export const pushDenied = () =>
	pushSupported() && Notification.permission === 'denied';

/**
 * applicationServerKey no acepta la clave VAPID tal como la escupe la
 * herramienta que la genera (base64url en texto), sino sus bytes.
 */
const keyToBytes = key => {
	const padding = '='.repeat((4 - (key.length % 4)) % 4);
	const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(base64);

	return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const registerWorker = async () => {
	const registration = await navigator.serviceWorker.register('/sw.js');

	// register() resuelve en cuanto acepta el fichero, no cuando el worker está
	// listo para recibir nada. Suscribirse antes de tiempo falla.
	await navigator.serviceWorker.ready;

	return registration;
};

export const currentSubscription = async () => {
	if (!pushSupported()) return null;

	const registration = await navigator.serviceWorker.getRegistration();

	return registration ? registration.pushManager.getSubscription() : null;
};

/**
 * Guarda (o refresca) la suscripción. El endpoint es la clave primaria: el
 * navegador puede rotarlo por su cuenta, y así el mismo móvil no deja dos
 * filas activas. Las que queden muertas las limpia el que envía, cuando el
 * servicio de push le conteste que ese endpoint ya no existe.
 */
export const saveSubscription = async subscription => {
	const { endpoint, keys } = subscription.toJSON();

	const { error } = await supabase
		.from('push_subscriptions')
		.upsert(
			{ endpoint, p256dh: keys.p256dh, auth_secret: keys.auth },
			{ onConflict: 'endpoint' }
		);

	if (error) throw error;
};

/**
 * Pide el permiso y se suscribe. Devuelve el estado del permiso, porque
 * "denegado" no es un error: es una respuesta legítima del usuario que la
 * interfaz tiene que saber contar.
 */
export const enableNotifications = async () => {
	if (!VAPID_PUBLIC_KEY) {
		throw new Error(
			'Falta VITE_VAPID_PUBLIC_KEY. Genera el par de claves con `npx web-push generate-vapid-keys` (ver .env.example).'
		);
	}

	// requestPermission() tiene que colgar de un gesto del usuario. Pedirlo al
	// cargar la página hace que Chrome lo deniegue de oficio y sin preguntar.
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return permission;

	const registration = await registerWorker();

	// Si ya había una suscripción de antes, subscribe() devuelve la misma en
	// vez de crear otra, así que no hace falta comprobarlo aparte.
	const subscription = await registration.pushManager.subscribe({
		// Obligatorio en Chrome: el push no puede usarse para trabajo silencioso
		// en segundo plano, cada mensaje tiene que acabar en un aviso visible.
		userVisibleOnly: true,
		applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY)
	});

	await saveSubscription(subscription);

	return permission;
};

/**
 * Da de baja el dispositivo. Primero borra la fila y después cancela: si se
 * hiciera al revés y fallase el borrado, quedaría una fila a la que ya nadie
 * escucha y el aviso se daría por entregado.
 */
export const disableNotifications = async () => {
	const subscription = await currentSubscription();
	if (!subscription) return;

	const { error } = await supabase
		.from('push_subscriptions')
		.delete()
		.eq('endpoint', subscription.endpoint);

	if (error) throw error;

	await subscription.unsubscribe();
};
