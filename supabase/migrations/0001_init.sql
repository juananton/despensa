-- Esquema inicial de la despensa.
-- Pegar tal cual en el SQL Editor de Supabase y ejecutar.

-- ---------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------

-- `depletes_at` es la única fuente de verdad: la fecha en la que se agota el
-- artículo. Los días restantes y las unidades se derivan de ella en el cliente.
-- No hay columna `units` a propósito, para que no pueda contradecir a la fecha.
create table if not exists items (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(trim(name)) between 1 and 25),
	category text not null check (category in ('Comida', 'Limpieza', 'Baño')),
	days_per_unit integer not null check (days_per_unit >= 1),
	depletes_at timestamptz not null,
	created_at timestamptz not null default now()
);

-- Para añadir una categoría hay que tocar este check y CATEGORIES en
-- src/lib/constants.js. Si acaban cambiando a menudo, mejor una tabla aparte.

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

-- La base de datos entera ES la despensa compartida: no hay concepto de
-- "dueño" porque las dos cuentas ven y editan lo mismo. Por eso la política es
-- simplemente "estar autenticado", y el control de quién entra se hace cerrando
-- el registro público e invitando a mano a los dos usuarios.
alter table items enable row level security;

drop policy if exists "authenticated users share one pantry" on items;

create policy "authenticated users share one pantry"
on items for all
to authenticated
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- Sumar y restar unidades
-- ---------------------------------------------------------------------------

-- Traducción de shiftUnits() de src/lib/items.js, pero resuelta aquí y de forma
-- atómica. Es la diferencia entre que funcione con una persona y con dos: si el
-- cliente calculase la fecha y la escribiese como valor absoluto, dos `+`
-- simultáneos se sobrescribirían y una de las dos compras se perdería.
--
-- El greatest() interior arranca desde ahora cuando el artículo ya estaba
-- agotado, para que comprar un bote de 7 días te dé 7 días y no arrastre el
-- déficit. El exterior evita fechas en el pasado al restar.
create or replace function shift_units(item_id uuid, delta integer)
returns items
language sql
security invoker
as $$
	update items
	set depletes_at = greatest(
		now(),
		greatest(now(), depletes_at) + (delta * days_per_unit) * interval '1 day'
	)
	where id = item_id
	returning *;
$$;

-- ---------------------------------------------------------------------------
-- Sincronización en vivo
-- ---------------------------------------------------------------------------

-- Permite que el cliente se suscriba a los cambios: si ella añade leche, a ti
-- te aparece sin recargar.
--
-- Envuelto para que el script entero se pueda volver a ejecutar: `alter
-- publication ... add table` es la única sentencia de aquí que falla al
-- repetirse, con "relation is already member of publication".
do $$
begin
	alter publication supabase_realtime add table items;
exception
	when duplicate_object then null;
end;
$$;
