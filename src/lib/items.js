import { MS_PER_DAY } from './constants';

/**
 * Un artículo guarda una única fuente de verdad: `depletesAt`, la fecha en la
 * que se le acaba el stock. Los días restantes y las unidades se derivan de
 * ella, así que la cuenta atrás no necesita ningún temporizador que la lleve:
 * basta con mirar el reloj. Sobrevive a recargas y a tener la app cerrada.
 *
 * Sumar y restar unidades NO se hace aquí: lo resuelve la función shift_units
 * de Postgres (supabase/migrations/0001_init.sql). Si la fecha la calculase el
 * cliente y la escribiese como valor absoluto, dos personas pulsando `+` a la
 * vez se pisarían y una de las dos compras se perdería.
 */

const depletionTime = item => new Date(item.depletesAt).getTime();

/**
 * Días de consumo que quedan. El instante se lee aquí, no se recibe de un
 * estado que va por detrás: mezclar un reloj cacheado con fechas ancladas a la
 * hora real hace que el `ceil` de abajo redondee de más. Un artículo recién
 * creado con 6 días mostraba 7.
 */
export const daysLeft = (item, now = Date.now()) =>
	Math.max(0, Math.ceil((depletionTime(item) - now) / MS_PER_DAY));

// Unidades equivalentes a los días que quedan.
export const unitsLeft = (item, now = Date.now()) =>
	Math.ceil(daysLeft(item, now) / item.daysPerUnit);

// Fecha de agotamiento de un stock de `units` unidades empezando ahora.
export const depletionFrom = (units, daysPerUnit, from = Date.now()) =>
	new Date(from + units * daysPerUnit * MS_PER_DAY).toISOString();

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

// Postgres usa snake_case y el resto de la app camelCase. La traducción vive
// aquí y sólo aquí, para que ningún componente vea nombres de columna.

export const fromRow = row => ({
	id: row.id,
	name: row.name,
	category: row.category,
	daysPerUnit: row.days_per_unit,
	depletesAt: row.depletes_at,
	createdAt: row.created_at
});

// Omite lo que no venga definido, para que un update parcial no borre columnas.
export const toRow = item => {
	const row = {};

	if (item.name !== undefined) row.name = item.name;
	if (item.category !== undefined) row.category = item.category;
	if (item.daysPerUnit !== undefined) row.days_per_unit = item.daysPerUnit;
	if (item.depletesAt !== undefined) row.depletes_at = item.depletesAt;

	return row;
};
