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
