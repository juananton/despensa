export const CATEGORIES = {
	CAT1: 'Comida',
	CAT2: 'Limpieza',
	CAT3: 'Baño'
};

// En modo demo un "día" dura un minuto, para poder ver la cuenta atrás sin
// esperar una semana. Al cambiarlo hay que regenerar los datos con
// `npm run seed`, porque las fechas guardadas están en esta escala.
export const DEMO_MODE = false;

export const MS_PER_DAY = DEMO_MODE ? 60 * 1000 : 24 * 60 * 60 * 1000;

// Cada cuánto se refresca la pantalla para recalcular los días restantes.
// No escribe nada en el servidor: sólo repinta.
export const TICK_MS = Math.min(Math.max(MS_PER_DAY / 60, 1000), 60 * 1000);

// Días de margen a partir de los cuales se avisa de que hay que reponer.
export const WARNING_DAYS = 4;

export const MAX_NAME_LENGTH = 25;
