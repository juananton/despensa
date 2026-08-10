-- Avisos de la despensa: estado para no repetirlos y cron que los dispara.
-- Pegar en el SQL Editor de Supabase y ejecutar, DESPUÉS de haber desplegado
-- la función `notify` (supabase functions deploy notify).
--
-- Antes de ejecutar hay que poner la service_role key donde dice AQUÍ.
--
-- IMPORTANTE: hazlo en el editor de Supabase, sobre el texto ya pegado, y NO
-- guardes la clave en este fichero. Se salta todas las políticas RLS, y basta
-- con un commit despistado para que acabe en el historial del repositorio,
-- donde ya no se borra: habría que rotarla.

-- ---------------------------------------------------------------------------
-- Estado
-- ---------------------------------------------------------------------------

-- Sin esto el aviso de "quedan 4 días" volvería a sonar cada mañana hasta que
-- compres. Guardan cuándo se avisó, no un simple booleano, porque saber la
-- fecha es lo único que permite entender después por qué algo no sonó.
--
-- No se llaman `warned_at` y `depleted_at` a secas para que no se confundan
-- con `depletes_at`, que es la fecha de agotamiento y no tiene nada que ver.
alter table items add column if not exists warning_notified_at timestamptz;
alter table items add column if not exists depleted_notified_at timestamptz;

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------

-- pg_cron programa el trabajo; pg_net es lo que le permite llamar por HTTP a
-- la Edge Function, que es quien sabe firmar y cifrar un envío push.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Credencial del cron
-- ---------------------------------------------------------------------------

-- Un secreto propio, que sólo conocen el cron y la función (donde está puesto
-- como CRON_SECRET). No se usa aquí la service_role key: con ella, filtrar
-- esta línea daría acceso completo a la base de datos, mientras que con esto
-- lo peor que puede pasar es que alguien dispare los avisos de hoy.
--
-- Va en Vault y no en claro dentro del trabajo porque cron.job lo puede leer
-- cualquiera que abra el SQL Editor.
--
-- El bloque permite volver a ejecutar el fichero entero: create_secret falla
-- si el nombre ya existe.
do $$
begin
	perform vault.create_secret(
		'AQUÍ_EL_CRON_SECRET',
		'cron_secret',
		'Para que el cron de avisos invoque la Edge Function notify'
	);
exception
	when unique_violation then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cron
-- ---------------------------------------------------------------------------

-- 07:00 UTC = 09:00 en verano y 08:00 en invierno. pg_cron sólo entiende UTC,
-- y perseguir la hora local exacta pediría más maquinaria de la que esto vale:
-- una hora de diferencia media año no cambia nada para un aviso de despensa.
--
-- Un solo trabajo para los dos casos: la función mira si hoy es lunes y manda
-- el resumen en lugar de los avisos sueltos.
--
-- cron.schedule con un nombre ya existente lo reemplaza, así que esto también
-- se puede volver a ejecutar sin duplicar trabajos.
select cron.schedule(
	'despensa-avisos',
	'0 7 * * *',
	$$
	select net.http_post(
		url := 'https://dhsxhmtvvuunnreanncx.supabase.co/functions/v1/notify',
		headers := jsonb_build_object(
			'Content-Type', 'application/json',
			'x-cron-secret', (
				select decrypted_secret
				from vault.decrypted_secrets
				where name = 'cron_secret'
			)
		),
		body := '{}'::jsonb
	);
	$$
);

-- Para comprobarlo:
--   select * from cron.job;                                  -- que esté dado de alta
--   select * from cron.job_run_details order by start_time desc limit 5;
--   select * from net._http_response order by created desc limit 5;  -- qué contestó
