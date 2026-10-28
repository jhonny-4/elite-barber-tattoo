-- Recomendaciones del asesor de Supabase.
-- busy_ranges solo la usa el servidor (service_role): nadie más debe poder llamarla por /rpc.
revoke execute on function public.busy_ranges from public, anon, authenticated;
grant execute on function public.busy_ranges to service_role;
-- Función de plataforma (event trigger): no debe ser invocable por la API.
do $$ begin
  if exists (select 1 from pg_proc where proname = 'rls_auto_enable' and pronamespace = 'public'::regnamespace) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
-- save_work_hours se queda para authenticated: valida private.is_owner() dentro.
create index if not exists media_created_by_idx on public.media (created_by);
