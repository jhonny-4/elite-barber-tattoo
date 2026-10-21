-- Mientras Bold no esté activo, el servidor puede crear la cita ya confirmada (sin retención).
-- Con p_requires_payment = true queda pendiente_pago con retención, como antes.
drop function public.create_booking(uuid, uuid, timestamptz, text, text, text, text, text, int);

create function public.create_booking(
  p_barber uuid, p_service uuid, p_starts timestamptz,
  p_name text, p_phone text, p_email text,
  p_token_hash text, p_idempotency text,
  p_requires_payment boolean default true, p_hold_minutes int default 15
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_service public.services;
  v_row public.bookings;
begin
  select * into v_row from public.bookings where idempotency_key = p_idempotency;
  if found then return v_row; end if;

  select * into v_service from public.services where id = p_service and active;
  if not found then raise exception 'servicio_no_disponible' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.barbers where id = p_barber and active)
     or not exists (select 1 from public.barber_services where barber_id = p_barber and service_id = p_service) then
    raise exception 'profesional_no_disponible' using errcode = 'P0001';
  end if;
  if p_starts < now() then raise exception 'horario_pasado' using errcode = 'P0001'; end if;

  perform public.expire_holds();

  insert into public.bookings (barber_id, service_id, starts_at, ends_at, status, customer_name, customer_phone,
    customer_email, price_cop, access_token_hash, hold_expires_at, idempotency_key)
  values (p_barber, p_service, p_starts, p_starts + make_interval(mins => v_service.duration_min),
    case when p_requires_payment then 'pendiente_pago' else 'confirmada' end::public.booking_status,
    trim(p_name), p_phone, lower(trim(p_email)), v_service.price_cop, p_token_hash,
    case when p_requires_payment then now() + make_interval(mins => p_hold_minutes) end, p_idempotency)
  returning * into v_row;
  return v_row;
exception when exclusion_violation then
  raise exception 'horario_ocupado' using errcode = 'P0001';
end;
$$;

revoke execute on function public.create_booking from public, anon, authenticated;
