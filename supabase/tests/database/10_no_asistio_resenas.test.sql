begin;
select plan(5);
create temp table t10 as select (select id from public.barbers where slug = 'nelson') b, (select id from public.services where slug = 'corte') s;
grant select on t10 to anon;
-- Cita pasada sin llegada, y otra pasada con llegada registrada.
insert into public.bookings (id, barber_id, service_id, starts_at, ends_at, status, customer_name, customer_phone, customer_email, price_cop, access_token_hash)
select '00000000-0000-0000-0000-00000000c101', b, s, now() - interval '30 minutes', now() + interval '15 minutes', 'confirmada', 'Ana', '3000000101', 'a@t.co', 25000, 'h101' from t10;
insert into public.bookings (id, barber_id, service_id, starts_at, ends_at, status, customer_name, customer_phone, customer_email, price_cop, access_token_hash)
select '00000000-0000-0000-0000-00000000c102', b, s, now() - interval '3 hours', now() - interval '2 hours 15 minutes', 'confirmada', 'Beto', '3000000102', 'b@t.co', 25000, 'h102' from t10;
insert into public.queue_tickets (day, number, barber_id, service_id, booking_id, customer_name, source, access_token_hash)
select (now() at time zone 'America/Bogota')::date, 901, b, s, '00000000-0000-0000-0000-00000000c102', 'Beto', 'reserva', 'staff-c102' from t10;
select is(public.mark_no_shows(), 1, 'solo la cita sin llegada se marca');
select is((select status::text from public.bookings where id = '00000000-0000-0000-0000-00000000c101'), 'no_asistio', 'queda como no asistió');
insert into public.reviews (booking_id, barber_id, rating, author_name, status)
select '00000000-0000-0000-0000-00000000c102', b, 5, 'Beto', 'pendiente' from t10;
set local role anon;
select is((select count(*)::int from public.reviews), 0, 'el público no ve reseñas pendientes');
select throws_ok($$insert into public.reviews (booking_id, barber_id, rating, author_name) values ('00000000-0000-0000-0000-00000000c101', (select b from t10), 5, 'X')$$, '42501', null, 'el público no crea reseñas directo');
reset role;
update public.reviews set status = 'aprobada';
set local role anon;
select is((select count(*)::int from public.reviews), 1, 'la aprobada es pública');
select * from finish();
rollback;
