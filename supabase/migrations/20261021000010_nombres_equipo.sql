-- Nombres confirmados por el usuario; se conservan IDs y cuentas existentes.
update public.barbers set display_name=case slug
  when 'barbero-1' then 'Ivan' when 'barbero-2' then 'Jeancarlos' when 'barbero-3' then 'Nelson' end
where slug in ('barbero-1','barbero-2','barbero-3');
update public.profiles p set full_name=b.display_name from public.barbers b
where p.barber_id=b.id and p.role='barbero' and b.slug in ('barbero-1','barbero-2','barbero-3');
