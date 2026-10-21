begin;
select plan(14);

-- Usuarios ficticios: dueño y dos barberos.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'dueno@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@test.local');
insert into public.profiles (id, role, barber_id) values
  ('00000000-0000-0000-0000-0000000000d1', 'dueno', null),
  ('00000000-0000-0000-0000-0000000000b1', 'barbero', (select id from public.barbers where slug = 'barbero-1')),
  ('00000000-0000-0000-0000-0000000000b2', 'barbero', (select id from public.barbers where slug = 'barbero-2'));

-- Reservas creadas por el servidor: precio y duración salen de la base.
-- La hora de ejecución no debe volver aleatoria esta prueba de permisos.
update public.work_hours set opens='00:00', closes='23:59';
delete from public.breaks;
select public.create_booking((select id from public.barbers where slug='barbero-1'), (select id from public.services where slug='corte'),
  date_trunc('hour', now()) + interval '2 days', 'Cliente Uno', '3000000001', 'uno@test.local', 'h1', 'k1');
select public.create_booking((select id from public.barbers where slug='barbero-2'), (select id from public.services where slug='corte-barba'),
  date_trunc('hour', now()) + interval '2 days', 'Cliente Dos', '3000000002', 'dos@test.local', 'h2', 'k2');

select is((select price_cop from public.bookings where idempotency_key='k2'), 32000, 'el precio viene del catálogo');
select is((select ends_at - starts_at from public.bookings where idempotency_key='k2'), interval '45 minutes', 'la duración viene del catálogo');
select is((select id from public.create_booking((select id from public.barbers where slug='barbero-1'), (select id from public.services where slug='corte'),
  date_trunc('hour', now()) + interval '2 days', 'Cliente Uno', '3000000001', 'uno@test.local', 'h1x', 'k1')),
  (select id from public.bookings where idempotency_key='k1'), 'la misma clave de idempotencia devuelve la misma cita');
select throws_ok($$select public.create_booking((select id from public.barbers where slug='barbero-1'), (select id from public.services where slug='corte'),
  date_trunc('hour', now()) + interval '2 days 15 minutes', 'Otro', '3000000003', 'otro@test.local', 'h3', 'k3')$$,
  'P0001', 'horario_ocupado', 'un cruce en el mismo barbero se rechaza');
select throws_ok($$select public.create_booking((select id from public.barbers where slug='barbero-1'), (select id from public.services where slug='corte'),
  now() - interval '1 hour', 'Otro', '3000000003', 'otro@test.local', 'h4', 'k4')$$, 'P0001', 'horario_pasado', 'no se reserva en el pasado');

-- Una retención vencida libera el horario.
update public.bookings set hold_expires_at = now() - interval '1 minute' where idempotency_key = 'k1';
select lives_ok($$select public.create_booking((select id from public.barbers where slug='barbero-1'), (select id from public.services where slug='corte'),
  date_trunc('hour', now()) + interval '2 days', 'Nuevo', '3000000005', 'nuevo@test.local', 'h5', 'k5')$$, 'una retención vencida no bloquea');
select is((select status::text from public.bookings where idempotency_key='k1'), 'expirada', 'la retención vencida queda expirada');

-- Anónimo: no ve citas ni puede crear reservas directamente.
set local role anon;
select is((select count(*)::int from public.bookings), 0, 'anónimo no ve citas');
select throws_ok($$select public.create_booking(null, null, now(), 'x', '1', 'a@b.co', 'h', 'k')$$, '42501', null, 'anónimo no ejecuta create_booking');
select ok((select count(*) from public.busy_ranges((select id from public.barbers where slug='barbero-2'), now(), now() + interval '7 days')) = 1,
  'anónimo ve rangos ocupados sin datos personales');

-- Barbero 1: solo su agenda.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.bookings where barber_id <> private.my_barber_id()), 0, 'el barbero 1 no ve citas del barbero 2');
select is((select count(*)::int from public.bookings), 2, 'el barbero 1 ve sus citas (vigente y expirada)');
select throws_ok($$insert into public.media (section, barber_id, kind, storage_path, alt, published)
  values ('barbero', (select id from public.barbers where slug='barbero-1'), 'foto', 'x/1.webp', 'Corte de prueba', true)$$,
  '42501', null, 'el barbero no publica sin aprobación');

-- Dueño: ve todo.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select is((select count(*)::int from public.bookings), 3, 'el dueño ve todas las citas');

select * from finish();
rollback;
