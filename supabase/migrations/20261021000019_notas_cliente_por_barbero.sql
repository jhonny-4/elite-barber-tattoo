-- Un barbero solo ve o escribe la nota de clientes que aparecen en SUS citas; el dueño, de cualquiera.
-- Los teléfonos se comparan normalizados (solo dígitos, sin el 57 de Colombia), nunca con LIKE.
create function private.norm_phone(p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select case
    when length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) = 12
         and regexp_replace(p, '\D', '', 'g') like '57%'
      then substr(regexp_replace(p, '\D', '', 'g'), 3)
    else regexp_replace(coalesce(p, ''), '\D', '', 'g')
  end;
$$;
revoke execute on function private.norm_phone from public;
grant execute on function private.norm_phone to authenticated, service_role;

-- La política consulta citas por teléfono normalizado: el índice evita recorrer toda la tabla.
create index bookings_norm_phone on public.bookings (private.norm_phone(customer_phone), barber_id);

drop policy notas_staff_lectura on public.client_notes;
drop policy notas_staff_alta on public.client_notes;
drop policy notas_staff_edicion on public.client_notes;

create policy notas_lectura on public.client_notes for select to authenticated
  using (private.is_owner() or exists (
    select 1 from public.bookings b
    where private.norm_phone(b.customer_phone) = client_notes.phone and b.barber_id = private.my_barber_id()));
create policy notas_alta on public.client_notes for insert to authenticated
  with check (private.is_owner() or exists (
    select 1 from public.bookings b
    where private.norm_phone(b.customer_phone) = client_notes.phone and b.barber_id = private.my_barber_id()));
create policy notas_edicion on public.client_notes for update to authenticated
  using (private.is_owner() or exists (
    select 1 from public.bookings b
    where private.norm_phone(b.customer_phone) = client_notes.phone and b.barber_id = private.my_barber_id()))
  with check (private.is_owner() or exists (
    select 1 from public.bookings b
    where private.norm_phone(b.customer_phone) = client_notes.phone and b.barber_id = private.my_barber_id()));
