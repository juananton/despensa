export const CATEGORIES = {
	CAT1: 'Comida',
	CAT2: 'Limpieza',
	CAT3: 'Baño'
};

// Un día. Ya no hay modo demo: el `+`/`−` lo resuelve Postgres con
// `interval '1 day'`, así que el cliente tiene que hablar en la misma escala.
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Cada cuánto se refresca la pantalla para recalcular los días restantes.
// No consulta al servidor: sólo repinta.
export const TICK_MS = 60 * 1000;

// Días de margen a partir de los cuales se avisa de que hay que reponer.
export const WARNING_DAYS = 4;

export const MAX_NAME_LENGTH = 25;
