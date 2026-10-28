-- 1) Citas sin llegada: 15 min después de la hora, si nadie registró la llegada (sin turno
--    en la fila), la cita pasa a «no_asistio» y el horario se libera (el exclude ya no la cuenta).
create function public.mark_no_shows()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.bookings b set status = 'no_asistio', updated_at = now()
  where b.status = 'confirmada'
    and b.starts_at + interval '15 minutes' < now()
    and not exists (select 1 from public.queue_tickets q where q.booking_id = b.id);
  get diagnostics n = row_count;
  return n;
end; $$;
revoke execute on function public.mark_no_shows from public, anon, authenticated;
grant execute on function public.mark_no_shows to service_role;

-- 2) Reseñas de clientes reales: una por cita finalizada; el dueño aprueba antes de publicar.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings on delete cascade,
  barber_id uuid not null references public.barbers,
  rating smallint not null check (rating between 1 and 5),
  comment text check (length(comment) <= 400),
  author_name text not null check (length(author_name) between 1 and 40),
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada')),
  created_at timestamptz not null default now()
);
create index reviews_publicadas on public.reviews (barber_id, created_at desc) where status = 'aprobada';
alter table public.reviews enable row level security;
-- Público: solo aprobadas. Altas solo por el servidor (enlace privado de la cita).
create policy resenas_publicas on public.reviews for select using (status = 'aprobada');
create policy resenas_dueno on public.reviews for all to authenticated using (private.is_owner()) with check (private.is_owner());
create policy resenas_barbero on public.reviews for select to authenticated using (barber_id = private.my_barber_id());
