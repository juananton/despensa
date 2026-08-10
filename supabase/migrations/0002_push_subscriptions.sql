-- Suscripciones a los avisos push, una por navegador y dispositivo.
-- Pegar tal cual en el SQL Editor de Supabase y ejecutar.

-- ---------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------

-- El endpoint (la URL del buzón que da el servicio de push) es la clave
-- primaria: el navegador puede rotarlo por su cuenta, y el cliente reescribe la
-- fila en cada arranque, así que un mismo móvil nunca deja dos filas vivas.
--
-- `auth_secret` es la clave que el estándar llama `auth` a secas. Aquí no puede
-- llamarse así: con una columna `auth` en la tabla, Postgres se plantea si
-- `auth.uid()` de las políticas de abajo es una función del esquema `auth` o un
-- campo de esa columna.
create table if not exists push_subscriptions (
	endpoint text primary key,
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	p256dh text not null,
	auth_secret text not null,
	created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
on push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

-- A diferencia de `items`, aquí sí hay dueño: la despensa se comparte, pero el
-- móvil no. Nadie tiene por qué poder dar de baja los avisos del otro, y sin
-- este filtro un `delete` sin `where` desde el cliente los borraría todos.
alter table push_subscriptions enable row level security;

drop policy if exists "each user manages their own devices" on push_subscriptions;

create policy "each user manages their own devices"
on push_subscriptions for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
