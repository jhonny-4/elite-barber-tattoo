-- Pausas (almuerzo, descansos) editables desde el panel. Reemplaza todas las pausas del
-- barbero en una sola transacción. SECURITY INVOKER: la RLS de breaks (solo dueño) decide.
create function public.save_breaks(p_barber uuid, p_breaks jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(p_breaks) <> 'array' or jsonb_array_length(p_breaks) > 6 then
    raise exception 'pausas_invalidas' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_breaks) as b(starts time, ends time, label text)
    where starts is null or ends is null or ends <= starts or length(coalesce(label, '')) > 100
  ) then
    raise exception 'pausas_invalidas' using errcode = 'P0001';
  end if;
  -- Cada pausa debe caber dentro de la jornada de cada día que trabaja el barbero.
  if exists (
    select 1 from jsonb_to_recordset(p_breaks) as b(starts time, ends time, label text)
    join public.work_hours h on h.barber_id = p_barber
    where b.starts < h.opens or b.ends > h.closes
  ) then
    raise exception 'pausa_fuera_de_jornada' using errcode = 'P0001';
  end if;

  delete from public.breaks where barber_id = p_barber;
  insert into public.breaks (barber_id, weekday, starts, ends, label)
  select p_barber, h.weekday, b.starts, b.ends, coalesce(nullif(trim(b.label), ''), 'Descanso')
  from jsonb_to_recordset(p_breaks) as b(starts time, ends time, label text)
  join public.work_hours h on h.barber_id = p_barber;
end;
$$;

revoke execute on function public.save_breaks from public, anon;
grant execute on function public.save_breaks to authenticated;
