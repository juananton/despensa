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

export const validateDaysPerUnit = value =>
	validateWholeNumber(value, {
		min: 1,
		message: 'Los días por unidad deben ser un número entero de 1 o más.'
	});

export const validateUnits = value =>
	validateWholeNumber(value, {
		min: 0,
		message: 'Las unidades deben ser un número entero de 0 o más.'
	});
