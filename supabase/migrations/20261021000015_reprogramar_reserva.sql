-- Reprogramación por el cliente desde su enlace privado.
-- El contador limita los cambios por cita: evita usar la agenda como reserva flotante.
alter table public.bookings add column reschedule_count smallint not null default 0 check (reschedule_count between 0 and 3);

create function public.reschedule_booking_by_token(p_token_hash text, p_starts timestamptz)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.bookings;
  v_old timestamptz;
  v_duration int;
begin
  -- Bloqueo de la fila: dos cambios simultáneos del mismo enlace se serializan.
  select * into v_row from public.bookings where access_token_hash = p_token_hash for update;
  if not found then raise exception 'reserva_no_encontrada' using errcode = 'P0001'; end if;
  if v_row.status <> 'confirmada' then raise exception 'reserva_no_reprogramable' using errcode = 'P0001'; end if;
  -- Misma ventana que la cancelación: más de 2 h antes de la hora actual de la cita.
  if v_row.starts_at - now() <= interval '2 hours' then raise exception 'fuera_de_ventana' using errcode = 'P0001'; end if;
  if v_row.reschedule_count >= 3 then raise exception 'limite_reprogramaciones' using errcode = 'P0001'; end if;
  if p_starts < now() then raise exception 'horario_pasado' using errcode = 'P0001'; end if;

  select duration_min into v_duration from public.services where id = v_row.service_id;
  v_old := v_row.starts_at;
  -- Los triggers de jornada y la restricción bookings_no_overlap validan el nuevo horario.
  update public.bookings
     set starts_at = p_starts,
         ends_at = p_starts + make_interval(mins => v_duration),
         reschedule_count = reschedule_count + 1,
         updated_at = now()
   where id = v_row.id
   returning * into v_row;

  insert into public.audit_log (action, entity, entity_id, data)
  values ('reserva_reprogramada_cliente', 'booking', v_row.id::text,
          jsonb_build_object('from', v_old, 'to', p_starts, 'count', v_row.reschedule_count));
  return v_row;
exception when exclusion_violation then
  raise exception 'horario_ocupado' using errcode = 'P0001';
end;
$$;

revoke execute on function public.reschedule_booking_by_token from public, anon, authenticated;
grant execute on function public.reschedule_booking_by_token to service_role;
