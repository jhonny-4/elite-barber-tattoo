-- El catálogo remoto usa slugs propios. Se conservan sus IDs y reservas.
update public.barbers set display_name=case slug
  when 'ivan' then 'Ivan' when 'jean-carlos' then 'Jeancarlos' when 'nelson' then 'Nelson' end
where slug in ('ivan','jean-carlos','nelson');
update public.profiles p set full_name=b.display_name from public.barbers b
where p.barber_id=b.id and p.role='barbero' and b.slug in ('ivan','jean-carlos','nelson');
