-- El ritmo de consumo pasa de "días que dura una unidad" a "N unidades cada M
-- días". Pegar en el SQL Editor de Supabase y ejecutar.
--
-- El modelo anterior no sabía expresar un consumo de más de una unidad al día:
-- dos yogures diarios eran 0,5 días por unidad, que ni la validación ni el
-- check de la columna aceptaban. Guardar los dos enteros en vez del cociente
-- evita además que el formulario de edición devuelva un 0,333 en lugar de lo
-- que se escribió.

-- ---------------------------------------------------------------------------
-- Columnas
-- ---------------------------------------------------------------------------

alter table items add column if not exists units_per_cycle integer;
alter table items add column if not exists cycle_days integer;

-- Los artículos que ya existen consumían una unidad cada `days_per_unit` días,
-- que es exactamente el caso "1 unidad cada M días". Ninguna fecha de
-- agotamiento cambia: el ritmo es el mismo escrito de otra forma.
update items
set units_per_cycle = 1,
    cycle_days = days_per_unit
where units_per_cycle is null;

alter table items alter column units_per_cycle set not null;
alter table items alter column cycle_days set not null;

alter table items add constraint units_per_cycle_positive check (units_per_cycle >= 1);
alter table items add constraint cycle_days_positive check (cycle_days >= 1);

-- ---------------------------------------------------------------------------
-- Sumar y restar unidades
-- ---------------------------------------------------------------------------

-- Misma lógica que antes; sólo cambia de dónde sale lo que dura una unidad.
-- El ::numeric no es decorativo: sin él, cycle_days / units_per_cycle es una
-- división entera y "2 unidades cada 1 día" daría 0 días por unidad, con lo que
-- el `+` y el `−` dejarían de mover la fecha.
create or replace function shift_units(item_id uuid, delta integer)
returns items
language sql
security invoker
as $$
	update items
	set depletes_at = greatest(
		now(),
		greatest(now(), depletes_at)
			+ (delta * cycle_days::numeric / units_per_cycle) * interval '1 day'
	)
	where id = item_id
	returning *;
$$;

-- ---------------------------------------------------------------------------
-- Limpieza
-- ---------------------------------------------------------------------------

-- En último lugar y como sentencia aparte: hasta aquí, si algo hubiera fallado,
-- los datos originales seguían intactos. Comprueba antes que la app funciona
-- con las columnas nuevas, porque esto no tiene vuelta atrás.
alter table items drop column if exists days_per_unit;
