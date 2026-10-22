begin;
select plan(3);
-- Barbero sin perfil previo (en local puede existir una cuenta de prueba ligada a otro).
create temp table b8 as
  select id from public.barbers b
  where not exists (select 1 from public.profiles p where p.barber_id = b.id)
  order by sort_order limit 1;
grant select on b8 to authenticated;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b8', 'b8@test.local');
insert into public.profiles (id, role, barber_id) values ('00000000-0000-0000-0000-0000000000b8', 'barbero', (select id from b8));
insert into public.media (id, section, barber_id, kind, storage_path, alt, published)
  values ('00000000-0000-0000-0000-00000000aa08', 'barbero', (select id from b8), 'foto', 'gp/x.webp', 'prueba', false);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b8","role":"authenticated"}';
select throws_ok(
  $$insert into public.media (section, barber_id, kind, storage_path, alt, published)
    values ('barbero', (select id from b8), 'foto', 'gp/otra.webp', 'xyz', false)$$,
  '42501', null, 'un barbero no crea filas de galería directo');
delete from public.media where id = '00000000-0000-0000-0000-00000000aa08';
reset role;
select is((select count(*)::int from public.media where id = '00000000-0000-0000-0000-00000000aa08'), 1, 'un barbero no borra su foto pendiente directo');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b8","role":"authenticated"}';
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner) values ('galeria-pendiente', (select id from b8)::text || '/x.webp', auth.uid())$$,
  '42501', null, 'un barbero no sube directo al bucket pendiente');
select * from finish();
rollback;
