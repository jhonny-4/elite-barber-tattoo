begin;
select plan(3);
select is((select count(*)::int from public.services where active), 8, 'ocho servicios oficiales activos');
select is((select name from public.services where slug = 'corte'), 'Corte sencillo', 'corte se llama Corte sencillo');
select is((select count(*)::int from public.barbers b cross join public.services s
  where not exists (select 1 from public.barber_services bs where bs.barber_id = b.id and bs.service_id = s.id)), 0,
  'todos los barberos hacen todos los servicios');
select * from finish();
rollback;
