// Con extensión: Vite la resuelve igual sin ella, pero `node --test` no, y
// este módulo se prueba desde Node (src/lib/items.test.js).
import { MS_PER_DAY } from './constants.js';

/**
 * Un artículo guarda una única fuente de verdad: `depletesAt`, la fecha en la
 * que se le acaba el stock. Los días restantes y las unidades se derivan de
 * ella, así que la cuenta atrás no necesita ningún temporizador que la lleve:
 * basta con mirar el reloj. Sobrevive a recargas y a tener la app cerrada.
 *
 * El ritmo de consumo se guarda como dos enteros —`unitsPerCycle` unidades
 * cada `cycleDays` días— y no como los días que dura una unidad. Es lo que
 * permite escribir "2 unidades cada 1 día" sin pedirle a nadie que ponga 0,5
 * días por unidad, y de paso el formulario de edición devuelve exactamente lo
 * que se escribió, en vez de un 0,333 delatando la división.
 *
 * Sumar y restar unidades NO se hace aquí: lo resuelve la función shift_units
 * de Postgres (supabase/migrations/0001_init.sql). Si la fecha la calculase el
 * cliente y la escribiese como valor absoluto, dos personas pulsando `+` a la
 * vez se pisarían y una de las dos compras se perdería.
 */

const depletionTime = item => new Date(item.depletesAt).getTime();

// Lo que dura una unidad. Sale fraccionario en cuanto se consume más de una al
// día, y por eso no se guarda: se deriva del par de enteros cada vez.
const msPerUnit = ({ unitsPerCycle, cycleDays }) =>
	(cycleDays / unitsPerCycle) * MS_PER_DAY;

const remainingMs = (item, now) => Math.max(0, depletionTime(item) - now);

/**
 * Días de consumo que quedan. El instante se lee aquí, no se recibe de un
 * estado que va por detrás: mezclar un reloj cacheado con fechas ancladas a la
 * hora real hace que el `ceil` de abajo redondee de más. Un artículo recién
 * creado con 6 días mostraba 7.
 */
export const daysLeft = (item, now = Date.now()) =>
	Math.ceil(remainingMs(item, now) / MS_PER_DAY);

/**
 * Unidades que quedan. Se calculan del tiempo restante en crudo y NO de
 * `daysLeft`, que ya viene redondeado hacia arriba: encadenar los dos
 * redondeos inventaba existencias en cuanto una unidad duraba menos de un día.
 * Con 5 yogures a media jornada cada uno quedan 2,5 días, que redondeados a 3
 * días daban 6 yogures.
 */
export const unitsLeft = (item, now = Date.now()) =>
	Math.ceil(remainingMs(item, now) / msPerUnit(item));

// Fecha de agotamiento de un stock de `units` unidades empezando ahora.
export const depletionFrom = (units, rate, from = Date.now()) =>
	new Date(from + units * msPerUnit(rate)).toISOString();

/**
 * Recalcula la fecha de agotamiento al cambiar el ritmo de consumo,
 * manteniendo el stock proporcional: si te quedaban 2,4 botes y pasas de 7 a
 * 10 días por bote, tienes 24 días, no 20. Editar una estimación no debería
 * borrar lo que ya llevabas consumido.
 */
export const rescaleToRate = (item, rate, now = Date.now()) => {
	const units = remainingMs(item, now) / msPerUnit(item);

	return depletionFrom(units, rate, now);
};

// Postgres usa snake_case y el resto de la app camelCase. La traducción vive
// aquí y sólo aquí, para que ningún componente vea nombres de columna.

export const fromRow = row => ({
	id: row.id,
	name: row.name,
	category: row.category,
	unitsPerCycle: row.units_per_cycle,
	cycleDays: row.cycle_days,
	depletesAt: row.depletes_at,
	createdAt: row.created_at
});

// Omite lo que no venga definido, para que un update parcial no borre columnas.
export const toRow = item => {
	const row = {};

	if (item.name !== undefined) row.name = item.name;
	if (item.category !== undefined) row.category = item.category;
	if (item.unitsPerCycle !== undefined)
		row.units_per_cycle = item.unitsPerCycle;
	if (item.cycleDays !== undefined) row.cycle_days = item.cycleDays;
	if (item.depletesAt !== undefined) row.depletes_at = item.depletesAt;

	return row;
};
