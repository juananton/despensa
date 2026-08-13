-- Registro de cada `+` y `−`, para poder comparar más adelante el ritmo
-- declarado de un artículo (units_per_cycle/cycle_days) con el real. Pegar en
-- el SQL Editor de Supabase y ejecutar.
--
-- Es pura infraestructura: hoy nada lee esta tabla, sólo se escribe. Sin
-- historial de antes de ejecutar esto — no hay forma de reconstruir hacia
-- atrás lo que no se guardó.
--
-- Qué NO registra, a propósito:
--   - Crear un artículo. El número inicial de unidades ni se guarda como tal
--     en `items` (sólo la fecha de agotamiento resultante), y no es un
--     movimiento sobre un stock ya existente.
--   - Editar el ritmo de consumo. Es corregir un dato, no un movimiento de
--     stock; mezclarlo aquí falsearía el análisis de "cuánto dura de verdad".

-- ---------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------

create table if not exists stock_events (
	id uuid primary key default gen_random_uuid(),
	-- on delete cascade: si se borra un artículo (típicamente para arreglar un
	-- duplicado o un error), su historial deja de tener a qué referirse. Es un
	-- caso raro e intencionado, no algo que vaya a pasar por accidente.
	item_id uuid not null references items (id) on delete cascade,
	-- Positivo = se repuso stock (+), negativo = se consumió (−). Nunca 0: los
	-- botones de la app sólo llaman a shift_units con 1 o -1.
	delta integer not null check (delta <> 0),
	-- Copia del ritmo del artículo en el momento del movimiento, no una
	-- referencia a `items`: si el ritmo se edita más tarde, los eventos
	-- antiguos no deben cambiar de significado con efecto retroactivo.
	units_per_cycle integer not null,
	cycle_days integer not null,
	created_at timestamptz not null default now()
);

create index if not exists stock_events_item_id_idx on stock_events (item_id);

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

-- Mismo criterio que `items`: la despensa es compartida, sin concepto de
-- "dueño" del movimiento, así que tampoco hay user_id ni política por usuario.
alter table stock_events enable row level security;

drop policy if exists "authenticated users share one pantry" on stock_events;

create policy "authenticated users share one pantry"
on stock_events for all
to authenticated
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- Sumar y restar unidades
-- ---------------------------------------------------------------------------

-- Misma función de siempre (ver 0004), con un insert delante del update: al
-- ser una función `sql` normal y no `plpgsql`, basta con encadenar las dos
-- sentencias — Postgres devuelve el resultado de la última. Leer el ritmo con
-- un `select` aparte en vez de fiarse de un valor ya calculado no cambia nada
-- aquí (shift_units nunca toca units_per_cycle/cycle_days), pero dejarlo
-- explícito evita dudas si esta función se vuelve a tocar más adelante.
create or replace function shift_units(item_id uuid, delta integer)
returns items
language sql
security invoker
as $$
	insert into stock_events (item_id, delta, units_per_cycle, cycle_days)
	select id, delta, units_per_cycle, cycle_days
	from items
	where id = item_id;

	update items
	set depletes_at = greatest(
		now(),
		greatest(now(), depletes_at)
			+ (delta * cycle_days::numeric / units_per_cycle) * interval '1 day'
	)
	where id = item_id
	returning *;
$$;
