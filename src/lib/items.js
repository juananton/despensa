import { MS_PER_DAY } from './constants';

/**
 * Un artículo guarda una única fuente de verdad: `depletesAt`, la fecha en la
 * que se le acaba el stock. Los días restantes y las unidades se derivan de
 * ella, así que la cuenta atrás no necesita ningún temporizador que la lleve:
 * basta con mirar el reloj. Sobrevive a recargas y a tener la app cerrada.
 */

const depletionTime = item => new Date(item.depletesAt).getTime();

// Días de consumo que quedan del artículo en el instante `now`.
export const daysLeft = (item, now) =>
	Math.max(0, Math.ceil((depletionTime(item) - now) / MS_PER_DAY));

// Unidades equivalentes a los días que quedan.
export const unitsLeft = (item, now) =>
	Math.ceil(daysLeft(item, now) / item.daysPerUnit);

// Fecha de agotamiento de un stock de `units` unidades empezando ahora.
export const depletionFrom = (units, daysPerUnit, from = Date.now()) =>
	new Date(from + units * daysPerUnit * MS_PER_DAY).toISOString();

/**
 * Suma o resta unidades moviendo la fecha de agotamiento. Si el artículo ya
 * estaba agotado se cuenta desde ahora, no desde la fecha vencida: comprar un
 * bote que dura 7 días te deja 7 días, aunque llevaras tres sin él.
 */
export const shiftUnits = (item, delta) => {
	const now = Date.now();
	const base = Math.max(now, depletionTime(item));
	const shifted = base + delta * item.daysPerUnit * MS_PER_DAY;

	return new Date(Math.max(now, shifted)).toISOString();
};

/**
 * Recalcula la fecha de agotamiento al cambiar la duración estimada de una
 * unidad, manteniendo el stock proporcional: si te quedaban 2,4 botes y pasas
 * de 7 a 10 días por bote, tienes 24 días, no 20. Editar una estimación no
 * debería borrar lo que ya llevabas consumido.
 */
export const rescaleToDaysPerUnit = (item, daysPerUnit) => {
	const now = Date.now();
	const remaining = Math.max(0, depletionTime(item) - now);
	const units = remaining / (item.daysPerUnit * MS_PER_DAY);

	return depletionFrom(units, daysPerUnit, now);
};
