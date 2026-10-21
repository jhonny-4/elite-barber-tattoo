-- Lista de espera por día/servicio/profesional. Solo el servidor da de alta (sin política de inserción);
-- el dueño puede leerla para saber la demanda no atendida.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services,
  barber_id uuid references public.barbers,
  day date not null,
  name text not null check (length(name) between 2 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  phone text not null check (phone ~ '^\+?[0-9]{7,15}$'),
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  token_hash text not null unique
);
-- Un correo se anota una sola vez por día, servicio y profesional (null = cualquiera).
create unique index waitlist_unique_entry on public.waitlist
  (service_id, day, lower(email), coalesce(barber_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index waitlist_pending on public.waitlist (day, service_id, created_at) where notified_at is null;
create index waitlist_barber on public.waitlist (barber_id);

alter table public.waitlist enable row level security;
create policy espera_dueno on public.waitlist for select to authenticated using (private.is_owner());
