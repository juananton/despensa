import { MAX_NAME_LENGTH } from './constants';
import { fromISODate, toISODate } from './pantry';

const VALID = { message: '', error: false };

/**
 * `requireValue` sólo se activa al enviar: mientras escribes no tiene sentido
 * reprocharte que el campo esté vacío nada más borrarlo.
 */
export const validateName = (name, { requireValue = false } = {}) => {
	if (requireValue && !name.trim()) {
		return {
			message: 'El campo de nombre no puede quedar vacío.',
			error: true
		};
	}

	if (name.length > MAX_NAME_LENGTH) {
		return {
			message: `El nombre debe tener ${MAX_NAME_LENGTH} caracteres o menos.`,
			error: true
		};
	}

	return VALID;
};

/**
 * Los campos numéricos guardan el texto tal cual se escribe, no un número: al
 * convertirlo en cada pulsación, borrar el campo daba 0 y React lo escribía en
 * el hueco vacío, de modo que el siguiente dígito quedaba como "09". La
 * conversión se hace aquí, al enviar.
 */
const validateWholeNumber = (value, { min, message }) => {
	const number = Number(value);

	if (value === '' || !Number.isInteger(number) || number < min) {
		return { message, error: true };
	}

	return VALID;
};

// El ritmo se pide como dos enteros, "N unidades cada M días", para que nadie
// tenga que escribir 0,5 días por unidad al consumir dos yogures diarios.
export const validateUnitsPerCycle = value =>
	validateWholeNumber(value, {
		min: 1,
		message: 'Las unidades deben ser un número entero de 1 o más.'
	});

export const validateCycleDays = value =>
	validateWholeNumber(value, {
		min: 1,
		message: 'Los días deben ser un número entero de 1 o más.'
	});

export const validateUnits = value =>
	validateWholeNumber(value, {
		min: 0,
		message: 'Las unidades deben ser un número entero de 0 o más.'
	});

/**
 * La fecha de vuelta de una pausa. Es opcional —se puede pausar sin saber
 * cuándo volvéis— pero si se pone tiene que ser de hoy en adelante: una fecha
 * pasada haría que la despensa se reanudase sola en el siguiente arranque, sin
 * llegar a estar parada un solo día.
 */
export const validateReturnDate = (value, today = new Date()) => {
	if (!value) return VALID;

	const date = fromISODate(value);

	if (Number.isNaN(date.getTime())) {
		return { message: 'Esa fecha no vale.', error: true };
	}

	// Contra el día, no contra el instante: elegir hoy es válido aunque sean
	// las seis de la tarde.
	if (toISODate(date) < toISODate(today)) {
		return { message: 'La vuelta no puede ser antes de hoy.', error: true };
	}

	return VALID;
};
