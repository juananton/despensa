-- Pausa de la despensa para las ausencias largas. Pegar en el SQL Editor de
-- Supabase y ejecutar.
--
-- La idea entera cabe en una frase: mientras la despensa está en pausa, su
-- "ahora" deja de ser el reloj y pasa a ser el instante en que se pausó. Como
-- `depletes_at` es la única fuente de verdad y todo lo demás se deriva de ella
-- comparándola con el ahora, congelar el ahora congela la cuenta atrás sin
-- tocar un solo dato de `items`. Al reanudar se desplazan todas las fechas de
-- agotamiento por el tiempo que ha durado la pausa, y la despensa continúa
-- donde se quedó.
--
-- Lo que la pausa NO sabe hacer: distinguir consumo de caducidad. El contador
-- mide lo que os coméis, no lo que se pone malo, así que al volver de dos
-- semanas dirá que la leche sigue teniendo los días que tenía. El fresco hay
-- que corregirlo a mano, igual que hoy.

-- ---------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------

-- Una sola fila para toda la despensa: la ausencia es de la casa, no de un
-- artículo ni de una persona. El check sobre la clave primaria es lo que
-- impide que llegue a haber una segunda fila y con ella dos "ahoras" posibles.
--
-- `resumes_on` es un `date` y no un `timestamptz` porque una vuelta se piensa
-- en días ("volvemos el 15"), no en horas: la reanudación automática de ese
-- día la resuelve resume_if_due() más abajo.
create table if not exists pantry (
	id integer primary key default 1 check (id = 1),
	paused_at timestamptz,
	resumes_on date,
	updated_at timestamptz not null default now()
);

insert into pantry (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

-- Mismo criterio que `items`: la despensa es compartida y las dos cuentas ven
-- y tocan lo mismo, así que la política es estar autenticado.
alter table pantry enable row level security;

drop policy if exists "authenticated users share one pantry" on pantry;

create policy "authenticated users share one pantry"
on pantry for all
to authenticated
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- El ahora de la despensa
-- ---------------------------------------------------------------------------

-- Todo lo que necesite saber qué hora es para la despensa tiene que preguntar
-- aquí y no a now(). Es el equivalente en Postgres de src/lib/clock.js, que
-- hace lo mismo en el cliente: si los dos no coincidiesen, un `+` pulsado
-- durante la pausa se calcularía desde el reloj real y luego el desplazamiento
-- del reanudar le sumaría la ausencia por segunda vez.
create or replace function pantry_now()
returns timestamptz
language sql
stable
security invoker
as $$
	select coalesce((select paused_at from pantry where id = 1), now());
$$;

-- ---------------------------------------------------------------------------
-- Sumar y restar unidades
-- ---------------------------------------------------------------------------

-- La misma función de siempre (ver 0004 y 0005) con now() sustituido por
-- pantry_now() en los tres sitios. Con la despensa en marcha son idénticas:
-- pantry_now() sólo se separa del reloj mientras hay una pausa viva.
--
-- `stock_events.created_at` se queda con la hora REAL, no con la congelada: un
-- movimiento pasó cuando pasó, y el historial es un registro de hechos. La
-- consecuencia para el análisis futuro del ritmo de compra es que un hueco
-- entre reposiciones puede incluir una ausencia y parecer más largo de lo que
-- fue; cuando se llegue a eso, habrá que descontar las pausas.
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
		pantry_now(),
		greatest(pantry_now(), depletes_at)
			+ (delta * cycle_days::numeric / units_per_cycle) * interval '1 day'
	)
	where id = item_id
	returning *;
$$;

-- ---------------------------------------------------------------------------
-- Pausar y reanudar
-- ---------------------------------------------------------------------------

-- Pausar dos veces no reinicia el congelado: el coalesce conserva el
-- paused_at original, de modo que volver a llamar sólo sirve para cambiar la
-- fecha de vuelta (o quitarla, pasando null) sin perder el tiempo ya pausado.
create or replace function pause_pantry(resumes date default null)
returns pantry
language sql
security invoker
as $$
	update pantry
	set paused_at = coalesce(paused_at, now()),
		resumes_on = resumes,
		updated_at = now()
	where id = 1
	returning *;
$$;

-- Reanudar es desplazar toda la despensa por lo que ha durado la pausa. Se usa
-- el tiempo REAL transcurrido y no la duración prevista: si volvéis antes o
-- después de lo que decía `resumes_on`, lo que cuenta es cuándo se reanuda de
-- verdad.
--
-- En plpgsql y no en sql por el `for update`: es lo que serializa dos
-- reanudaciones a la vez —el cron de los avisos y alguien abriendo la app— de
-- forma que la segunda espera, encuentra paused_at ya en null y no vuelve a
-- desplazar nada. Sin ese cerrojo, dos llamadas simultáneas leerían el mismo
-- paused_at y la despensa se iría al futuro el doble de lo debido.
--
-- Llamarla con la despensa en marcha no hace nada y no es un error: hace falta
-- que sea así para que resume_if_due() y el botón de la app puedan dispararla
-- sin comprobar antes en qué estado estaba.
create or replace function resume_pantry()
returns pantry
language plpgsql
security invoker
as $$
declare
	paused timestamptz;
	settings pantry;
begin
	select paused_at into paused from pantry where id = 1 for update;

	if paused is null then
		select * into settings from pantry where id = 1;
		return settings;
	end if;

	-- La ausencia afecta a la despensa entera, y aun así lleva `where`: Supabase
	-- activa la extensión safeupdate para los roles de la API, que rechaza
	-- cualquier update sin cláusula (código 21000, "UPDATE requires a WHERE
	-- clause"). Está para que un update masivo no salga por descuido; este lo es
	-- a propósito, y el filtro sobre la clave primaria lo dice en voz alta.
	--
	-- Las banderas de aviso no se tocan: marcan cuándo se avisó, no cuándo se
	-- agota algo.
	update items
	set depletes_at = depletes_at + (now() - paused)
	where id is not null;

	update pantry
	set paused_at = null,
		resumes_on = null,
		updated_at = now()
	where id = 1
	returning * into settings;

	return settings;
end;
$$;

-- Reanuda sólo si ya toca. Existe para que la regla de "ha llegado el día de
-- la vuelta" viva en un único sitio: la llaman tanto el cliente al arrancar
-- como la función de avisos, y así ninguno de los dos tiene que repetirla ni
-- pueden acabar discrepando.
--
-- La comparación es contra current_date, que en el servidor es UTC: el día de
-- la vuelta empieza para la despensa a las 01:00 o 02:00 hora española, unas
-- horas antes que en el calendario de casa. Cae del lado bueno —reanudar un
-- rato antes de tiempo, nunca después— y la escala aquí son días.
create or replace function resume_if_due()
returns pantry
language plpgsql
security invoker
as $$
declare
	settings pantry;
begin
	select * into settings from pantry where id = 1;

	if settings.paused_at is not null
		and settings.resumes_on is not null
		and settings.resumes_on <= current_date
	then
		return resume_pantry();
	end if;

	return settings;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sincronización en vivo
-- ---------------------------------------------------------------------------

-- Que uno pause y al otro se le congele la pantalla sin recargar, igual que
-- pasa al añadir un artículo. Envuelto para poder volver a ejecutar el fichero
-- entero (ver la nota de 0001).
do $$
begin
	alter publication supabase_realtime add table pantry;
exception
	when duplicate_object then null;
end;
$$;
