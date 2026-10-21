begin;
select plan(1);
do $$
declare b1 uuid:=gen_random_uuid(); b2 uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); owner_id uuid:=gen_random_uuid(); t1 uuid:=gen_random_uuid(); t2 uuid:=gen_random_uuid(); tomorrow date:=(now() at time zone 'America/Bogota')::date+1;
begin
  perform set_config('elite.qa.b1',b1::text,true); perform set_config('elite.qa.b2',b2::text,true); perform set_config('elite.qa.s',s::text,true); perform set_config('elite.qa.u',u::text,true);
  insert into public.barbers(id,slug,display_name) values(b1,'qa-'||substr(b1::text,1,8),'QA uno'),(b2,'qa-'||substr(b2::text,1,8),'QA dos');
  insert into public.services(id,slug,name,price_cop,duration_min) values(s,'qa-'||substr(s::text,1,8),'QA servicio',25000,45);
  insert into public.barber_services values(b1,s),(b2,s);
  insert into public.work_hours select b,d,'00:00'::time,'23:59'::time from unnest(array[b1,b2]) b cross join generate_series(0,6) d;
  insert into auth.users(id,email) values(u,u::text||'@example.invalid'),(owner_id,owner_id::text||'@example.invalid');
  insert into public.profiles(id,role,barber_id) values(u,'barbero',b1),(owner_id,'dueno',null);
  perform public.create_booking(b1,s,(tomorrow+time '10:00') at time zone 'America/Bogota','QA uno','3000000011','qa@example.invalid',t1::text,t1::text,false);
  perform public.create_booking(b2,s,(tomorrow+time '10:00') at time zone 'America/Bogota','QA dos','3000000012','qa@example.invalid',t2::text,t2::text,false);
  if (select count(*) from public.notifications n join public.bookings b on b.id=n.booking_id where b.barber_id in (b1,b2))<>2 then raise exception 'Falta correo transaccional pendiente'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  begin
    perform public.save_work_hours(b1,jsonb_build_array(jsonb_build_object('weekday',extract(dow from tomorrow),'opens','11:00','closes','18:00')));
    raise exception 'La jornada invalidó una cita' using errcode='XX000';
  exception when raise_exception then null; end;
  begin
    perform public.create_booking(b1,s,(tomorrow+time '23:30') at time zone 'America/Bogota','QA fuera','3000000013','qa@example.invalid',gen_random_uuid()::text,gen_random_uuid()::text,false);
    raise exception 'Permitió reserva fuera de jornada' using errcode='XX000';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claim.sub',u::text,true);
end $$;
set local role authenticated;
do $$
begin
  if (select count(*) from public.bookings where barber_id=current_setting('elite.qa.b1')::uuid)<>1 then raise exception 'El barbero no ve su cita'; end if;
  if exists(select 1 from public.bookings where barber_id=current_setting('elite.qa.b2')::uuid) then raise exception 'El barbero ve citas ajenas'; end if;
  begin
    perform public.save_work_hours(current_setting('elite.qa.b1')::uuid,'[]');
    raise exception 'El barbero pudo alterar jornadas' using errcode='XX000';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$
declare b uuid:=current_setting('elite.qa.b1')::uuid; s uuid:=current_setting('elite.qa.s')::uuid; booking_id uuid:=gen_random_uuid(); ticket public.queue_tickets; slot timestamptz:=greatest(date_trunc('minute',now())-interval '1 hour',((now() at time zone 'America/Bogota')::date)::timestamp at time zone 'America/Bogota');
begin
  -- La última hora del día no dispone de 45 minutos: no simular atención fuera de jornada.
  if (now() at time zone 'America/Bogota')::time>'23:00' then return; end if;
  insert into public.bookings(id,barber_id,service_id,starts_at,ends_at,status,customer_name,customer_phone,customer_email,price_cop,access_token_hash)
  values(booking_id,b,s,slot,slot+interval '45 minutes','confirmada','QA llegada','3000000014','qa@example.invalid',25000,booking_id::text);
  ticket:=public.checkin_booking(booking_id);
  if (public.checkin_booking(booking_id)).id<>ticket.id then raise exception 'Llegada duplicada'; end if;
  update public.bookings set status='en_atencion' where id=booking_id;
  if (select status from public.queue_tickets where id=ticket.id)<>'en_atencion' then raise exception 'Atención no sincronizada'; end if;
  update public.queue_tickets set status='finalizado' where id=ticket.id;
  if (select status from public.bookings where id=booking_id)<>'finalizada' then raise exception 'Cierre no sincronizado'; end if;
  ticket:=public.join_queue(gen_random_uuid(),b,s,'QA presencial','3000000015',gen_random_uuid()::text);
  update public.queue_tickets set status='llamado' where id=ticket.id;
  update public.queue_tickets set status='en_atencion' where id=ticket.id;
  if not exists(select 1 from public.busy_ranges(b,now()-interval '1 minute',now()+interval '1 hour') where starts_at>=now()-interval '1 minute') then raise exception 'Atención presencial no ocupa agenda'; end if;
  begin
    perform public.create_booking(b,s,now()+interval '30 minutes','QA cruce','3000000016','qa@example.invalid',gen_random_uuid()::text,gen_random_uuid()::text,false);
    raise exception 'Reserva cruzó atención presencial' using errcode='XX000';
  exception when raise_exception then null; end;
end $$;
select pass('03_agenda_real');
select * from finish();
rollback;
