-- Las reservas reales participan en la misma fila que los clientes presenciales.
create function public.checkin_booking(p_booking uuid)
returns public.queue_tickets language plpgsql security definer set search_path='' as $$
declare b public.bookings; q public.queue_tickets; d date:=(now() at time zone 'America/Bogota')::date;
begin
  perform pg_advisory_xact_lock(hashtextextended('elite_queue_'||d::text,0));
  select * into b from public.bookings where id=p_booking for update;
  if not found or b.status<>'confirmada' or (b.starts_at at time zone 'America/Bogota')::date<>d then raise exception 'La llegada solo se registra para citas confirmadas de hoy'; end if;
  select * into q from public.queue_tickets where booking_id=b.id;
  if found then return q; end if;
  insert into public.queue_tickets(day,number,barber_id,service_id,booking_id,customer_name,customer_phone,source,access_token_hash)
  select d,coalesce(max(number),0)+1,b.barber_id,b.service_id,b.id,b.customer_name,b.customer_phone,'reserva','staff-'||b.id::text from public.queue_tickets where day=d returning * into q;
  return q;
end; $$;
revoke execute on function public.checkin_booking from public,anon,authenticated;
grant execute on function public.checkin_booking to service_role;
create function private.sync_booking_queue() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='queue_tickets' then
    if new.booking_id is not null then
      if new.status='en_atencion' then update public.bookings set status='en_atencion',updated_at=now() where id=new.booking_id and status='confirmada';
      elsif new.status='finalizado' then update public.bookings set status='finalizada',updated_at=now() where id=new.booking_id and status='en_atencion'; end if;
    end if;
  else
    if new.status='en_atencion' then update public.queue_tickets set status='en_atencion',started_at=coalesce(started_at,now()) where booking_id=new.id and status in ('esperando','llamado');
    elsif new.status='finalizada' then update public.queue_tickets set status='finalizado',finished_at=now() where booking_id=new.id and status='en_atencion';
    elsif new.status in ('cancelada','no_asistio') then update public.queue_tickets set status='cancelado' where booking_id=new.id and status in ('esperando','llamado'); end if;
  end if;
  return new;
end; $$;
create trigger queue_sync_booking after update of status on public.queue_tickets for each row when (old.status is distinct from new.status) execute function private.sync_booking_queue();
create trigger booking_sync_queue after update of status on public.bookings for each row when (old.status is distinct from new.status) execute function private.sync_booking_queue();
