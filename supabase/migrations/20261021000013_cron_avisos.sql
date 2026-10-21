-- Cada 5 minutos la base llama a POST {cron_url}/api/cron/tick con el secreto del cron.
-- URL y secreto viven en Supabase Vault (nunca en el repositorio). Sin ambos secretos,
-- la tarea no hace nada: así esta migración es segura en local y en entornos sin configurar.
-- Pasos para crearlos: docs/PRODUCCION.md, sección "Cron de avisos".

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create function private.cron_tick() returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  secret text;
begin
  select decrypted_secret into base from vault.decrypted_secrets where name = 'cron_url' limit 1;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret' limit 1;
  if base is null or secret is null or base !~ '^https?://' then
    return null;
  end if;
  -- pg_net es asíncrono: la respuesta queda en net._http_response y no bloquea el cron.
  return net.http_post(
    url := rtrim(base, '/') || '/api/cron/tick',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end; $$;

revoke execute on function private.cron_tick() from public, anon, authenticated;

-- cron.schedule con nombre reemplaza la tarea si ya existe: reaplicar no la duplica.
select cron.schedule('elite-cron-tick', '*/5 * * * *', 'select private.cron_tick()');
