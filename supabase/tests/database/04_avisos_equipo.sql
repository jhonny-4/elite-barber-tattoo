begin;
select plan(1);
insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'qa-avisos-a@example.test'),
  ('00000000-0000-4000-8000-0000000000b1', 'qa-avisos-b@example.test');
insert into public.profiles(id, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'dueno'),
  ('00000000-0000-4000-8000-0000000000b1', 'dueno');
insert into public.staff_push_subscriptions(user_id, endpoint, keys) values
  ('00000000-0000-4000-8000-0000000000a1', 'https://push.example.test/a', '{"p256dh":"x","auth":"y"}'),
  ('00000000-0000-4000-8000-0000000000b1', 'https://push.example.test/b', '{"p256dh":"x","auth":"y"}');

-- Como el usuario A: solo ve, crea y borra sus propias suscripciones.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.staff_push_subscriptions;
  if n <> 1 then raise exception 'RLS: el usuario ve suscripciones ajenas (%)', n; end if;
  delete from public.staff_push_subscriptions where endpoint = 'https://push.example.test/b';
  insert into public.staff_push_subscriptions(user_id, endpoint, keys) values ('00000000-0000-4000-8000-0000000000a1', 'https://push.example.test/a2', '{"p256dh":"x","auth":"y"}');
  begin
    insert into public.staff_push_subscriptions(user_id, endpoint, keys) values ('00000000-0000-4000-8000-0000000000b1', 'https://push.example.test/c', '{"p256dh":"x","auth":"y"}');
    raise exception 'RLS: insertó a nombre de otro usuario';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.daily_digest;
    raise exception 'daily_digest legible por authenticated';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$
begin
  if not exists (select 1 from public.staff_push_subscriptions where endpoint = 'https://push.example.test/b') then raise exception 'RLS: borró una suscripción ajena'; end if;
  begin
    insert into public.staff_push_subscriptions(user_id, endpoint, keys) values ('00000000-0000-4000-8000-0000000000a1', 'http://inseguro.test/x', '{"p256dh":"x","auth":"y"}');
    raise exception 'Aceptó un endpoint sin https';
  exception when check_violation then null; end;
  if has_table_privilege('anon', 'public.staff_push_subscriptions', 'SELECT') then raise exception 'anon puede leer suscripciones'; end if;
  if has_function_privilege('anon', 'private.cron_tick()', 'EXECUTE') or has_function_privilege('authenticated', 'private.cron_tick()', 'EXECUTE') then raise exception 'cron_tick ejecutable desde la API'; end if;
  if not exists (select 1 from cron.job where jobname = 'elite-cron-tick' and schedule = '*/5 * * * *') then raise exception 'Falta la tarea de cron'; end if;
  -- Sin secretos en Vault la tarea no llama a nada.
  if private.cron_tick() is not null then raise exception 'cron_tick llamó sin secretos'; end if;
end $$;
select pass('Avisos del equipo: RLS, privilegios y cron sin secretos');
select * from finish();
rollback;
