-- Avisos de la despensa: estado para no repetirlos y cron que los dispara.
-- Pegar en el SQL Editor de Supabase y ejecutar, DESPUÉS de haber desplegado
-- la función `notify` (supabase functions deploy notify).
--
-- Antes de ejecutar hay que sustituir dos cosas, marcadas con AQUÍ:
--   1. el ref del proyecto en la URL de la función
--   2. la service_role key, que se guarda cifrada en Vault

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

-- La service_role key se salta las políticas RLS, así que no puede quedar en
-- claro dentro de la definición del trabajo (cron.job es legible desde el SQL
-- Editor). Vault la guarda cifrada y el trabajo la descifra al ejecutarse.
--
-- El bloque permite volver a ejecutar el fichero entero: create_secret falla
-- si el nombre ya existe.
do $$
begin
	perform vault.create_secret(
		'AQUÍ_LA_SERVICE_ROLE_KEY',
		'service_role_key',
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
		url := 'https://AQUÍ_EL_REF_DEL_PROYECTO.supabase.co/functions/v1/notify',
		headers := jsonb_build_object(
			'Content-Type', 'application/json',
			'Authorization', 'Bearer ' || (
				select decrypted_secret
				from vault.decrypted_secrets
				where name = 'service_role_key'
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
