-- Una atención presencial también ocupa disponibilidad online. Ambas escrituras
-- comparten el cerrojo de jornada para evitar carreras entre fila y reservas.
create or replace function public.busy_ranges(p_barber uuid,p_from timestamptz,p_to timestamptz)
returns table(starts_at timestamptz,ends_at timestamptz)
language sql stable security definer set search_path='' as $$
  select b.starts_at,case when b.status='en_atencion' then greatest(b.ends_at,now()+interval '15 minutes') else b.ends_at end from public.bookings b
  where b.barber_id=p_barber and b.starts_at<p_to and (b.ends_at>p_from or b.status='en_atencion') and (b.status in ('confirmada','en_atencion') or b.status='pendiente_pago' and b.hold_expires_at>now())
  union all select a.starts_at,a.ends_at from public.absences a where a.barber_id=p_barber and a.starts_at<p_to and a.ends_at>p_from
  union all select q.started_at,greatest(q.started_at+make_interval(mins=>s.duration_min),now()+interval '15 minutes') from public.queue_tickets q join public.services s on s.id=q.service_id
  where q.barber_id=p_barber and q.status='en_atencion' and q.started_at<p_to;
$$;
create function private.validate_attention() returns trigger language plpgsql security definer set search_path='' as $$
declare linked uuid; duration int; finish timestamptz; local_start timestamp; local_end timestamp;
begin
  if new.status::text<>'en_atencion' or old.status::text='en_atencion' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('elite_schedule_'||new.barber_id::text,0));
  if tg_table_name='bookings' then
    linked:=new.id;
    if (new.starts_at at time zone 'America/Bogota')::date<>(now() at time zone 'America/Bogota')::date or new.starts_at>now()+interval '30 minutes' then raise exception 'La cita todavía no se puede atender'; end if;
  else
    linked:=new.booking_id;
    if new.day<>(now() at time zone 'America/Bogota')::date or new.barber_id is null then raise exception 'Turno o profesional no disponible'; end if;
    if linked is not null and not exists(select 1 from public.bookings where id=linked and status='confirmada' and starts_at<=now()+interval '30 minutes') then raise exception 'La cita todavía no se puede atender'; end if;
    select duration_min into duration from public.services where id=new.service_id;
    finish:=now()+make_interval(mins=>duration);
    local_start:=now() at time zone 'America/Bogota'; local_end:=finish at time zone 'America/Bogota';
    if local_start::date<>local_end::date or not exists(select 1 from public.work_hours h where h.barber_id=new.barber_id and h.weekday=extract(dow from local_start) and local_start::time>=h.opens and local_end::time<=h.closes)
      or exists(select 1 from public.breaks b where b.barber_id=new.barber_id and b.weekday=extract(dow from local_start) and local_start::time<b.ends and local_end::time>b.starts)
      or exists(select 1 from public.absences a where a.barber_id=new.barber_id and now()<a.ends_at and finish>a.starts_at)
      or exists(select 1 from public.bookings b where b.barber_id=new.barber_id and b.id is distinct from linked and (b.status in ('confirmada','en_atencion') or b.status='pendiente_pago' and b.hold_expires_at>now()) and b.starts_at<finish and (b.ends_at>now() or b.status='en_atencion')) then raise exception 'La atención cruza un descanso o una reserva'; end if;
    new.started_at:=now();
  end if;
  if exists(select 1 from public.bookings b where b.barber_id=new.barber_id and b.status='en_atencion' and b.id is distinct from linked)
    or exists(select 1 from public.queue_tickets q where q.barber_id=new.barber_id and q.status='en_atencion' and q.id<>new.id and (linked is null or q.booking_id is distinct from linked)) then raise exception 'El profesional ya está atendiendo'; end if;
  return new;
end; $$;
create trigger booking_attention before update of status on public.bookings for each row execute function private.validate_attention();
create trigger queue_attention before update of status on public.queue_tickets for each row execute function private.validate_attention();
create function private.validate_booking_queue_range() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status not in ('confirmada','pendiente_pago','en_atencion') then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('elite_schedule_'||new.barber_id::text,0));
  if exists(select 1 from public.queue_tickets q join public.services s on s.id=q.service_id where q.barber_id=new.barber_id and q.status='en_atencion' and q.booking_id is distinct from new.id and q.started_at<new.ends_at and greatest(q.started_at+make_interval(mins=>s.duration_min),now()+interval '15 minutes')>new.starts_at) then raise exception 'horario_ocupado'; end if;
  return new;
end; $$;
create trigger booking_queue_range before insert or update of starts_at,ends_at,barber_id on public.bookings for each row execute function private.validate_booking_queue_range();
