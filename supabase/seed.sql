-- Datos SOLO para desarrollo local. Ficticios y provisionales: los oficiales los carga el dueño desde el panel.
insert into public.services (slug, name, price_cop, duration_min, sort_order) values
  ('corte', 'Corte', 25000, 45, 1),
  ('corte-barba', 'Corte con barba', 32000, 45, 2);
insert into public.barbers (slug, display_name, sort_order) values
  ('barbero-1', 'Barbero 1', 1), ('barbero-2', 'Barbero 2', 2), ('barbero-3', 'Barbero 3', 3);
insert into public.barber_services select b.id, s.id from public.barbers b cross join public.services s;
insert into public.work_hours select b.id, d, '10:00', '18:00' from public.barbers b cross join generate_series(0, 6) d;
insert into public.breaks (barber_id, weekday, starts, ends, label)
  select b.id, d, '13:00', '14:00', 'Almuerzo' from public.barbers b cross join generate_series(0, 6) d;
