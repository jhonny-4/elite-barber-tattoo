-- Lo que sube un barbero no debe ser accesible antes de que el dueño lo apruebe.
-- Las subidas van a un bucket privado; al aprobar, el servidor copia el archivo a `galeria`
-- (público) y marca `media.published`.
drop policy galeria_barbero on storage.objects;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('galeria-pendiente', 'galeria-pendiente', false, 52428800,
   array['image/webp','image/jpeg','image/png','video/mp4','video/webm']);

-- galeria-pendiente/{barber_id}/...: cada barbero sube y ve solo su carpeta; el dueño todo.
create policy pendiente_barbero_alta on storage.objects for insert to authenticated
  with check (bucket_id = 'galeria-pendiente'
    and (storage.foldername(name))[1] = private.my_barber_id()::text);
create policy pendiente_barbero_lectura on storage.objects for select to authenticated
  using (bucket_id = 'galeria-pendiente'
    and (storage.foldername(name))[1] = private.my_barber_id()::text);
create policy pendiente_dueno on storage.objects for all to authenticated
  using (bucket_id = 'galeria-pendiente' and private.is_owner())
  with check (bucket_id = 'galeria-pendiente' and private.is_owner());
