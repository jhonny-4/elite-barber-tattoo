-- Datos SOLO para desarrollo local. Ficticios y provisionales: los oficiales los carga el dueño desde el panel.
insert into public.services (slug, name, price_cop, duration_min, sort_order) values
  ('corte', 'Corte sencillo', 25000, 45, 1),
  ('corte-barba', 'Corte y barba', 32000, 45, 2),
  ('barba', 'Barba', 18000, 30, 3),
  ('cerquillos', 'Cerquillos', 12000, 15, 4),
  ('ceja', 'Ceja', 7000, 15, 5),
  ('mascarilla', 'Mascarilla', 10000, 20, 6),
  ('limpieza-facial', 'Limpieza facial sencilla', 60000, 45, 7),
  ('limpieza-facial-profunda', 'Limpieza facial profunda', 80000, 60, 8)
on conflict (slug) do update set name = excluded.name, price_cop = excluded.price_cop, duration_min = excluded.duration_min, sort_order = excluded.sort_order;
insert into public.barbers (slug, display_name, sort_order) values
  ('ivan', 'Ivan', 1), ('jean-carlos', 'Jeancarlos', 2), ('nelson', 'Nelson', 3);
insert into public.barber_services select b.id, s.id from public.barbers b cross join public.services s;
insert into public.work_hours select b.id, d, '10:00', '18:00' from public.barbers b cross join generate_series(0, 6) d;
insert into public.breaks (barber_id, weekday, starts, ends, label)
  select b.id, d, '13:00', '14:00', 'Almuerzo' from public.barbers b cross join generate_series(0, 6) d;
