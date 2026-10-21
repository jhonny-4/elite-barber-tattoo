create function public.save_work_hours(p_barber uuid,p_hours jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_owner() then raise exception 'Solo el dueño puede guardar jornadas' using errcode='42501'; end if;
  if jsonb_typeof(p_hours)<>'array' or jsonb_array_length(p_hours)>7 then raise exception 'Jornada inválida'; end if;
  perform pg_advisory_xact_lock(hashtextextended('elite_schedule_'||p_barber::text,0));
  if exists(select 1 from jsonb_to_recordset(p_hours) as h(weekday int,opens time,closes time) where weekday not between 0 and 6 or opens is null or closes is null or closes<=opens)
     or (select count(*)<>count(distinct weekday) from jsonb_to_recordset(p_hours) as h(weekday int)) then raise exception 'Jornada inválida'; end if;
  if exists(select 1 from public.bookings b where b.barber_id=p_barber and b.starts_at>=now() and b.status in ('confirmada','pendiente_pago','en_atencion') and not exists(
    select 1 from jsonb_to_recordset(p_hours) as h(weekday int,opens time,closes time)
    where h.weekday=extract(dow from b.starts_at at time zone 'America/Bogota') and (b.starts_at at time zone 'America/Bogota')::time>=h.opens and (b.ends_at at time zone 'America/Bogota')::time<=h.closes and (b.ends_at at time zone 'America/Bogota')::date=(b.starts_at at time zone 'America/Bogota')::date
  )) then raise exception 'La jornada dejaría citas confirmadas fuera de horario'; end if;
  delete from public.work_hours where barber_id=p_barber;
  insert into public.work_hours(barber_id,weekday,opens,closes) select p_barber,weekday,opens,closes from jsonb_to_recordset(p_hours) as h(weekday int,opens time,closes time);
  insert into public.audit_log(actor,action,entity,entity_id) values(auth.uid(),'jornada_actualizada','barber',p_barber::text);
end; $$;
revoke execute on function public.save_work_hours from public,anon;
grant execute on function public.save_work_hours to authenticated;
-- Mismo cerrojo que al cambiar jornadas: una reserva concurrente siempre ve la jornada vigente.
create function private.validate_booking_schedule() returns trigger language plpgsql security definer set search_path='' as $$
declare local_start timestamp:=new.starts_at at time zone 'America/Bogota'; local_end timestamp:=new.ends_at at time zone 'America/Bogota';
begin
  if new.status not in ('confirmada','pendiente_pago','en_atencion') then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('elite_schedule_'||new.barber_id::text,0));
  if local_start::date<>local_end::date or not exists(select 1 from public.work_hours h where h.barber_id=new.barber_id and h.weekday=extract(dow from local_start) and local_start::time>=h.opens and local_end::time<=h.closes)
    or exists(select 1 from public.breaks b where b.barber_id=new.barber_id and b.weekday=extract(dow from local_start) and local_start::time<b.ends and local_end::time>b.starts)
    or exists(select 1 from public.absences a where a.barber_id=new.barber_id and new.starts_at<a.ends_at and new.ends_at>a.starts_at)
    then raise exception 'horario_no_disponible'; end if;
  return new;
end; $$;
create trigger bookings_schedule before insert or update of starts_at,ends_at,barber_id,service_id on public.bookings for each row execute function private.validate_booking_schedule();
