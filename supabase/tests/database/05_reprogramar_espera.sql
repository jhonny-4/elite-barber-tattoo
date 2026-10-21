begin;
select plan(11);

-- Datos ficticios: un barbero con jornada completa y un servicio de 30 min.
insert into public.barbers (id, slug, display_name) values ('00000000-0000-0000-0000-0000000000a1', 'qa-reprog', 'QA reprogramar');
insert into public.services (id, slug, name, price_cop, duration_min) values ('00000000-0000-0000-0000-0000000000b1', 'qa-reprog-svc', 'QA servicio', 20000, 30);
insert into public.barber_services values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1');
insert into public.work_hours select '00000000-0000-0000-0000-0000000000a1', d, '00:00'::time, '23:59'::time from generate_series(0, 6) d;

-- Citas a dos días para estar siempre fuera de la ventana de 2 h.
select public.create_booking('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
  (((now() at time zone 'America/Bogota')::date + 2 + time '10:00') at time zone 'America/Bogota'),
  'QA Uno', '3000000021', 'qa1@example.invalid', 'hash-reprog-1', 'idem-reprog-1', false);
select public.create_booking('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
  (((now() at time zone 'America/Bogota')::date + 2 + time '12:00') at time zone 'America/Bogota'),
  'QA Dos', '3000000022', 'qa2@example.invalid', 'hash-reprog-2', 'idem-reprog-2', false);

select is((public.reschedule_booking_by_token('hash-reprog-1',
  (((now() at time zone 'America/Bogota')::date + 2 + time '11:00') at time zone 'America/Bogota'))).reschedule_count::int,
  1, 'reprogramar suma una al contador');
select is((select ends_at - starts_at from public.bookings where access_token_hash = 'hash-reprog-1'),
  interval '30 minutes', 'ends_at sigue la duración del servicio');
select is((select count(*)::int from public.audit_log where action = 'reserva_reprogramada_cliente'), 1, 'queda auditoría del cambio');

select throws_ok($$select public.reschedule_booking_by_token('hash-reprog-1',
  (((now() at time zone 'America/Bogota')::date + 2 + time '12:00') at time zone 'America/Bogota'))$$,
  'P0001', 'horario_ocupado', 'no permite pisar la cita de otro cliente');
select throws_ok($$select public.reschedule_booking_by_token('no-existe', now() + interval '3 days')$$,
  'P0001', 'reserva_no_encontrada', 'token desconocido');

-- Segundo y tercer cambio permitidos; el cuarto, no.
select lives_ok($$select public.reschedule_booking_by_token('hash-reprog-1',
  (((now() at time zone 'America/Bogota')::date + 2 + time '14:00') at time zone 'America/Bogota'))$$, 'segundo cambio');
select lives_ok($$select public.reschedule_booking_by_token('hash-reprog-1',
  (((now() at time zone 'America/Bogota')::date + 2 + time '15:00') at time zone 'America/Bogota'))$$, 'tercer cambio');
select throws_ok($$select public.reschedule_booking_by_token('hash-reprog-1',
  (((now() at time zone 'America/Bogota')::date + 2 + time '16:00') at time zone 'America/Bogota'))$$,
  'P0001', 'limite_reprogramaciones', 'el cuarto cambio se rechaza');

-- Dentro de la ventana de 2 h no se puede mover la cita.
update public.bookings set starts_at = now() + interval '1 hour', ends_at = now() + interval '90 minutes' where access_token_hash = 'hash-reprog-2';
select throws_ok($$select public.reschedule_booking_by_token('hash-reprog-2', now() + interval '3 days')$$,
  'P0001', 'fuera_de_ventana', 'menos de 2 h antes no se reprograma');

-- Un visitante anónimo no ejecuta la función ni toca la lista de espera.
set local role anon;
select throws_ok($$select public.reschedule_booking_by_token('hash-reprog-2', now() + interval '3 days')$$,
  '42501', null, 'anon no puede ejecutar la reprogramación');
select throws_ok($$insert into public.waitlist (service_id, day, name, email, phone, token_hash)
  values ('00000000-0000-0000-0000-0000000000b1', current_date, 'QA', 'qa@example.invalid', '3000000023', 'x')$$,
  '42501', null, 'anon no puede anotarse directamente en la lista de espera');

select * from finish();
rollback;
