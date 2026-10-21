-- Numeración diaria atómica e idempotencia para altas desde varios dispositivos.
create function public.join_queue(p_id uuid, p_barber uuid, p_service uuid, p_name text, p_phone text, p_token_hash text)
returns public.queue_tickets language plpgsql security definer set search_path = '' as $$
declare v_day date := (now() at time zone 'America/Bogota')::date; v_row public.queue_tickets;
begin
  perform pg_advisory_xact_lock(hashtextextended('elite_queue_' || v_day::text,0));
  select * into v_row from public.queue_tickets where id=p_id;
  if found then return v_row; end if;
  if not exists(select 1 from public.barbers b join public.barber_services bs on bs.barber_id=b.id join public.services s on s.id=bs.service_id where b.id=p_barber and b.active and s.id=p_service and s.active) then raise exception 'Profesional o servicio no disponible'; end if;
  if exists(select 1 from public.queue_tickets where day=v_day and customer_phone=p_phone and status in ('esperando','llamado','en_atencion')) then raise exception 'Ya tienes un turno activo hoy'; end if;
  insert into public.queue_tickets(id,day,number,barber_id,service_id,customer_name,customer_phone,source,access_token_hash)
  select p_id,v_day,coalesce(max(number),0)+1,p_barber,p_service,p_name,p_phone,'qr',p_token_hash from public.queue_tickets where day=v_day returning * into v_row;
  return v_row;
end; $$;
revoke execute on function public.join_queue from public,anon,authenticated;
grant execute on function public.join_queue to service_role;
