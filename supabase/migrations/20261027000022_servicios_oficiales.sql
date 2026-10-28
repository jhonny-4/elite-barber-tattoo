-- Lista oficial de servicios del local (cartel de precios). Los tres barberos hacen todos.
update public.services set name = 'Corte sencillo', sort_order = 1 where slug = 'corte';
update public.services set name = 'Corte y barba', sort_order = 2 where slug = 'corte-barba';
insert into public.services (slug, name, price_cop, duration_min, sort_order) values
  ('barba', 'Barba', 18000, 30, 3),
  ('cerquillos', 'Cerquillos', 12000, 15, 4),
  ('ceja', 'Ceja', 7000, 15, 5),
  ('mascarilla', 'Mascarilla', 10000, 20, 6),
  ('limpieza-facial', 'Limpieza facial sencilla', 60000, 45, 7),
  ('limpieza-facial-profunda', 'Limpieza facial profunda', 80000, 60, 8)
on conflict (slug) do nothing;
insert into public.barber_services (barber_id, service_id)
  select b.id, s.id from public.barbers b cross join public.services s
on conflict do nothing;
