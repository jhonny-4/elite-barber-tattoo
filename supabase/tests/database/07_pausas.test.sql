begin;
select plan(4);
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d7', 'd7@test.local'), ('00000000-0000-0000-0000-0000000000b7', 'b7@test.local');
insert into public.profiles (id, role, barber_id) values
  ('00000000-0000-0000-0000-0000000000d7', 'dueno', null),
  ('00000000-0000-0000-0000-0000000000b7', 'barbero', (select id from public.barbers order by sort_order limit 1));
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d7","role":"authenticated"}';
select lives_ok($$select public.save_breaks((select id from public.barbers order by sort_order limit 1), '[{"starts":"13:00","ends":"14:00","label":"Almuerzo"}]')$$, 'el dueño guarda pausas');
select is((select count(distinct (starts, ends))::int from public.breaks where barber_id = (select id from public.barbers order by sort_order limit 1)), 1, 'una pausa aplicada a todos sus días');
select throws_ok($$select public.save_breaks((select id from public.barbers order by sort_order limit 1), '[{"starts":"07:00","ends":"08:00","label":"x"}]')$$, 'P0001', 'pausa_fuera_de_jornada', 'pausa fuera de jornada rechazada');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b7","role":"authenticated"}';
select throws_ok($$select public.save_breaks((select id from public.barbers order by sort_order limit 1), '[{"starts":"15:00","ends":"15:30","label":"x"}]')$$, '42501', null, 'un barbero no puede cambiar pausas (RLS)');
select * from finish();
rollback;
