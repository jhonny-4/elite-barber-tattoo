begin;
select plan(1);
do $$
declare ua uuid:=gen_random_uuid(); ub uuid:=gen_random_uuid(); uo uuid:=gen_random_uuid();
  ba uuid:=gen_random_uuid(); bb uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); t uuid:=gen_random_uuid();
begin
  insert into public.barbers(id,slug,display_name) values(ba,'qa-'||substr(ba::text,1,8),'QA A'),(bb,'qa-'||substr(bb::text,1,8),'QA B');
  insert into public.services(id,slug,name,price_cop,duration_min) values(s,'qa-'||substr(s::text,1,8),'QA servicio',25000,45);
  insert into public.barber_services values(ba,s),(bb,s);
  insert into auth.users(id,email) values(ua,ua::text||'@example.invalid'),(ub,ub::text||'@example.invalid'),(uo,uo::text||'@example.invalid');
  insert into public.profiles(id,role,barber_id) values(ua,'barbero',ba),(ub,'barbero',bb),(uo,'dueno',null);
  -- Cliente atendido solo por A (teléfono guardado con prefijo +57).
  insert into public.bookings(barber_id,service_id,starts_at,ends_at,status,customer_name,customer_phone,customer_email,price_cop,access_token_hash)
    values(ba,s,now()-interval '1 day',now()-interval '1 day'+interval '45 minutes','finalizada','QA cliente','+573000000077','qa@example.invalid',25000,gen_random_uuid()::text);
  insert into public.tattoo_requests(id,customer_name,customer_phone,customer_email,idea) values(t,'QA tatuaje','3000000077','qa@example.invalid','Idea de prueba para cotizar');
  perform set_config('elite.qa.ua',ua::text,true); perform set_config('elite.qa.ub',ub::text,true); perform set_config('elite.qa.uo',uo::text,true);
  begin
    update public.tattoo_requests set quote_cop=100000,deposit_cop=150000 where id=t;
    raise exception 'Abono mayor que la cotización' using errcode='XX000';
  exception when check_violation then null; end;
  begin
    update public.tattoo_requests set quote_cop=0 where id=t;
    raise exception 'Cotización en cero' using errcode='XX000';
  exception when check_violation then null; end;
  update public.tattoo_requests set quote_cop=300000,deposit_cop=100000,status='cotizada' where id=t;
end $$;

-- Barbero A: ve y escribe la nota de su cliente (teléfono normalizado, sin LIKE).
select set_config('request.jwt.claim.sub',current_setting('elite.qa.ua'),true);
set local role authenticated;
do $$
begin
  insert into public.client_notes(phone,note,updated_by) values('3000000077','le gusta el fade bajo',current_setting('elite.qa.ua')::uuid);
  update public.client_notes set note='fade bajo y barba corta' where phone='3000000077';
  if (select note from public.client_notes where phone='3000000077')<>'fade bajo y barba corta' then raise exception 'El barbero no ve la nota de su cliente'; end if;
  begin
    insert into public.client_notes(phone,note) values('12','corto');
    raise exception 'Aceptó teléfono inválido' using errcode='XX000';
  exception when check_violation or insufficient_privilege then null; end;
  begin
    insert into public.client_notes(phone,note) values('3999999999','cliente ajeno');
    raise exception 'El barbero escribió la nota de un cliente que no atiende' using errcode='XX000';
  exception when insufficient_privilege then null; end;
end $$;

-- Barbero B: no lee ni modifica la nota de un cliente atendido solo por A.
reset role;
select set_config('request.jwt.claim.sub',current_setting('elite.qa.ub'),true);
set local role authenticated;
do $$
declare changed int;
begin
  if exists(select 1 from public.client_notes where phone='3000000077') then raise exception 'El barbero B lee la nota del cliente de A'; end if;
  update public.client_notes set note='pisada por B' where phone='3000000077';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'El barbero B modificó la nota del cliente de A'; end if;
  begin
    insert into public.client_notes(phone,note) values('3000000077','intento de B');
    raise exception 'El barbero B escribió la nota del cliente de A' using errcode='XX000';
  exception when insufficient_privilege or unique_violation then null; end;
end $$;

-- El dueño lee cualquier nota.
reset role;
select set_config('request.jwt.claim.sub',current_setting('elite.qa.uo'),true);
set local role authenticated;
do $$
begin
  if (select note from public.client_notes where phone='3000000077')<>'fade bajo y barba corta' then raise exception 'El dueño no ve la nota'; end if;
end $$;

-- Sin sesión (anon) no se lee ni se escribe nada.
reset role;
set local role anon;
do $$
begin
  if exists(select 1 from public.client_notes) then raise exception 'Anon lee notas de clientes'; end if;
  begin
    insert into public.client_notes(phone,note) values('3000000088','x');
    raise exception 'Anon escribió una nota' using errcode='XX000';
  exception when insufficient_privilege then null; end;
end $$;
select pass('Notas de cliente: dueño todo, barbero solo sus clientes, anon nada; cotización con restricciones');
select * from finish();
rollback;
