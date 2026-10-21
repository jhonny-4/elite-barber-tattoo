begin;
select plan(1);
do $$
declare b uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); ticket uuid:=gen_random_uuid(); r public.queue_tickets; r2 public.queue_tickets;
begin
  if has_function_privilege('anon','public.join_queue(uuid,uuid,uuid,text,text,text)','EXECUTE') then raise exception 'anon puede crear turnos directamente'; end if;
  if has_function_privilege('authenticated','public.join_queue(uuid,uuid,uuid,text,text,text)','EXECUTE') then raise exception 'authenticated puede evadir servidor'; end if;
  if not has_function_privilege('service_role','public.join_queue(uuid,uuid,uuid,text,text,text)','EXECUTE') then raise exception 'service_role no puede crear turnos'; end if;
  insert into public.barbers(id,slug,display_name) values(b,'qa-'||substr(b::text,1,8),'Profesional de prueba');
  insert into public.services(id,slug,name,price_cop,duration_min) values(s,'qa-'||substr(s::text,1,8),'Servicio de prueba',25000,45);
  insert into public.barber_services values(b,s);
  r:=public.join_queue(ticket,b,s,'Cliente de prueba','3000000001',encode(extensions.digest(ticket::text,'sha256'),'hex'));
  r2:=public.join_queue(ticket,b,s,'Cliente de prueba','3000000001',encode(extensions.digest(ticket::text,'sha256'),'hex'));
  if r.id<>r2.id or r.number<>r2.number then raise exception 'Reintento duplicó el turno'; end if;
  begin
    perform public.join_queue(gen_random_uuid(),b,s,'Otro intento','3000000001','otro-hash');
    raise exception 'No rechazó teléfono duplicado' using errcode='XX000';
  exception when raise_exception then null; end;
  update public.queue_tickets set status='cancelado' where id=ticket;
  r2:=public.join_queue(gen_random_uuid(),b,s,'Cliente de prueba','3000000001','nuevo-hash');
  if r2.number<=r.number then raise exception 'Se reutilizó número de turno'; end if;
  if (select public from storage.buckets where id='referencias') then raise exception 'Referencias públicas'; end if;
end $$;
select pass('02_fila_real');
select * from finish();
rollback;
