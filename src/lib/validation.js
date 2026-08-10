import { MAX_NAME_LENGTH } from './constants';

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
