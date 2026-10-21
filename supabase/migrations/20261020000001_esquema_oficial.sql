-- Esquema oficial de Elite Barber & Tattoo.
-- Principios: el servidor es la autoridad (precio y duración salen de la base, nunca del cliente),
-- dinero en pesos enteros (COP no usa centavos), fechas con zona horaria y RLS en todas las tablas.

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------- tipos
create type public.app_role as enum ('dueno', 'barbero');
create type public.booking_status as enum (
  'pendiente_pago', 'confirmada', 'en_atencion', 'finalizada', 'cancelada', 'expirada', 'no_asistio'
);
create type public.ticket_status as enum ('esperando', 'llamado', 'en_atencion', 'finalizado', 'cancelado');
create type public.tattoo_status as enum ('pendiente', 'en_evaluacion', 'cotizada', 'fecha_acordada', 'cerrada');
create type public.payment_status as enum ('pendiente', 'aprobado', 'rechazado', 'anulado', 'reembolsado');
create type public.media_kind as enum ('foto', 'video');
create type public.media_section as enum ('barberia', 'tatuajes', 'barbero');

-- ---------------------------------------------------------------- catálogo
create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  display_name text not null check (length(display_name) between 2 and 60),
  bio text check (length(bio) <= 600),
  photo_path text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (length(name) between 2 and 80),
  description text check (length(description) <= 400),
  price_cop integer not null check (price_cop >= 0),
  duration_min integer not null check (duration_min between 10 and 480 and duration_min % 5 = 0),
  active boolean not null default true,
  sort_order int not null default 0
);

create table public.barber_services (
  barber_id uuid not null references public.barbers on delete cascade,
  service_id uuid not null references public.services on delete cascade,
  primary key (barber_id, service_id)
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role public.app_role not null,
  barber_id uuid unique references public.barbers on delete set null,
  full_name text,
  created_at timestamptz not null default now(),
  -- Un barbero siempre está ligado a su ficha; el dueño puede no estarlo.
  check (role = 'dueno' or barber_id is not null)
);

-- ---------------------------------------------------------------- jornadas
create table public.work_hours (
  barber_id uuid not null references public.barbers on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  opens time not null,
  closes time not null check (closes > opens),
  primary key (barber_id, weekday)
);

create table public.breaks (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts time not null,
  ends time not null check (ends > starts),
  label text not null default 'Descanso' check (length(label) <= 100)
);

create table public.absences (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  reason text check (length(reason) <= 100)
);

-- ---------------------------------------------------------------- citas
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers,
  service_id uuid not null references public.services,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status public.booking_status not null default 'pendiente_pago',
  customer_name text not null check (length(customer_name) between 2 and 80),
  customer_phone text not null check (customer_phone ~ '^\+?[0-9]{7,15}$'),
  customer_email text not null check (customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(customer_email) <= 254),
  -- Copia del precio al reservar: un cambio de tarifa no altera lo ya cobrado.
  price_cop integer not null check (price_cop >= 0),
  source text not null default 'online' check (source in ('online', 'presencial')),
  -- Solo se guarda el hash del enlace privado del cliente; el token viaja por correo.
  access_token_hash text not null unique,
  hold_expires_at timestamptz,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'pendiente_pago' or hold_expires_at is not null),
  -- Garantía final contra doble reserva, válida entre instancias y dispositivos.
  constraint bookings_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pendiente_pago', 'confirmada', 'en_atencion'))
);
create index bookings_barber_day on public.bookings (barber_id, starts_at);
create index bookings_hold on public.bookings (hold_expires_at) where status = 'pendiente_pago';

-- ---------------------------------------------------------------- pagos (Bold)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings,
  provider text not null default 'bold',
  order_ref text not null unique,
  provider_tx_id text unique,
  amount_cop integer not null check (amount_cop >= 0),
  status public.payment_status not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cada evento del webhook se guarda una sola vez: reintentos de Bold no se procesan dos veces.
create table public.payment_events (
  id bigint generated always as identity primary key,
  provider_event_id text not null unique,
  payment_id uuid references public.payments,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------- turnos
create table public.queue_tickets (
  id uuid primary key default gen_random_uuid(),
  day date not null default (now() at time zone 'America/Bogota')::date,
  number int not null check (number > 0),
  barber_id uuid references public.barbers,
  service_id uuid not null references public.services,
  booking_id uuid unique references public.bookings,
  customer_name text not null check (length(customer_name) between 2 and 80),
  customer_phone text check (customer_phone ~ '^\+?[0-9]{7,15}$'),
  source text not null check (source in ('qr', 'presencial', 'reserva')),
  status public.ticket_status not null default 'esperando',
  access_token_hash text not null unique,
  created_at timestamptz not null default now(),
  called_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  unique (day, number)
);

-- ---------------------------------------------------------------- tatuajes
create table public.tattoo_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (length(customer_name) between 2 and 80),
  customer_phone text not null check (customer_phone ~ '^\+?[0-9]{7,15}$'),
  customer_email text not null check (customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  idea text not null check (length(idea) between 10 and 1500),
  placement text check (length(placement) <= 80),
  size text check (length(size) <= 80),
  reference_path text,
  status public.tattoo_status not null default 'pendiente',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- galería
create table public.media (
  id uuid primary key default gen_random_uuid(),
  section public.media_section not null,
  barber_id uuid references public.barbers on delete cascade,
  kind public.media_kind not null,
  storage_path text not null unique,
  poster_path text,
  title text check (length(title) <= 80),
  alt text not null check (length(alt) between 3 and 200),
  width int check (width > 0),
  height int check (height > 0),
  -- El dueño aprueba antes de que algo sea público.
  published boolean not null default false,
  sort_order int not null default 0,
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  check ((section = 'barbero') = (barber_id is not null))
);

-- ---------------------------------------------------------------- avisos
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings on delete cascade,
  ticket_id uuid references public.queue_tickets on delete cascade,
  channel text not null check (channel in ('email', 'push')),
  template text not null,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text,
  unique nulls not distinct (booking_id, ticket_id, channel, template)
);
create index notifications_due on public.notifications (scheduled_for) where sent_at is null;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings on delete cascade,
  ticket_id uuid references public.queue_tickets on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now(),
  check (booking_id is not null or ticket_id is not null)
);

-- ---------------------------------------------------------------- auditoría
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  data jsonb,
  at timestamptz not null default now()
);

-- ---------------------------------------------------------------- índices de llaves foráneas
create index on public.barber_services (service_id);
create index on public.breaks (barber_id);
create index on public.absences (barber_id, starts_at);
create index on public.bookings (service_id);
create index on public.payments (booking_id);
create index on public.payment_events (payment_id);
create index on public.queue_tickets (barber_id, day);
create index on public.queue_tickets (service_id);
create index on public.media (barber_id);
create index on public.notifications (booking_id);
create index on public.notifications (ticket_id);
create index on public.push_subscriptions (booking_id);
create index on public.push_subscriptions (ticket_id);

-- ---------------------------------------------------------------- funciones de acceso
-- Fuera del esquema expuesto por la API; solo se usan dentro de políticas.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create function private.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'dueno');
$$;

create function private.my_barber_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select barber_id from public.profiles where id = (select auth.uid()) and role = 'barbero';
$$;

-- ---------------------------------------------------------------- RLS
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.barber_services enable row level security;
alter table public.profiles enable row level security;
alter table public.work_hours enable row level security;
alter table public.breaks enable row level security;
alter table public.absences enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.queue_tickets enable row level security;
alter table public.tattoo_requests enable row level security;
alter table public.media enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.audit_log enable row level security;

-- Catálogo: lectura pública de lo activo; escritura solo del dueño.
create policy catalogo_lectura on public.barbers for select using (active or private.is_owner());
create policy catalogo_dueno on public.barbers for all to authenticated using (private.is_owner()) with check (private.is_owner());
create policy servicios_lectura on public.services for select using (active or private.is_owner());
create policy servicios_dueno on public.services for all to authenticated using (private.is_owner()) with check (private.is_owner());
create policy bs_lectura on public.barber_services for select using (true);
create policy bs_dueno on public.barber_services for all to authenticated using (private.is_owner()) with check (private.is_owner());

-- Jornadas: lectura pública (sin datos personales) para calcular disponibilidad; edita el dueño.
create policy wh_lectura on public.work_hours for select using (true);
create policy wh_dueno on public.work_hours for all to authenticated using (private.is_owner()) with check (private.is_owner());
create policy br_lectura on public.breaks for select using (true);
create policy br_dueno on public.breaks for all to authenticated using (private.is_owner()) with check (private.is_owner());
create policy ab_staff on public.absences for select to authenticated using (private.is_owner() or barber_id = private.my_barber_id());
create policy ab_dueno on public.absences for all to authenticated using (private.is_owner()) with check (private.is_owner());

create policy perfil_propio on public.profiles for select to authenticated using (id = (select auth.uid()) or private.is_owner());
create policy perfil_dueno on public.profiles for all to authenticated using (private.is_owner()) with check (private.is_owner());

-- Citas y turnos: el público no lee nada; el barbero solo lo suyo; el dueño todo.
-- Las altas de clientes entran por el servidor (create_booking) con la clave de servicio.
create policy citas_staff on public.bookings for select to authenticated
  using (private.is_owner() or barber_id = private.my_barber_id());
create policy citas_dueno on public.bookings for update to authenticated
  using (private.is_owner()) with check (private.is_owner());
create policy turnos_staff on public.queue_tickets for select to authenticated
  using (private.is_owner() or barber_id = private.my_barber_id()
         or (barber_id is null and private.my_barber_id() is not null));
create policy turnos_staff_update on public.queue_tickets for update to authenticated
  using (private.is_owner() or barber_id = private.my_barber_id())
  with check (private.is_owner() or barber_id = private.my_barber_id());

create policy tatuajes_dueno on public.tattoo_requests for all to authenticated using (private.is_owner()) with check (private.is_owner());
create policy pagos_dueno on public.payments for select to authenticated using (private.is_owner());
create policy eventos_dueno on public.payment_events for select to authenticated using (private.is_owner());
create policy avisos_dueno on public.notifications for select to authenticated using (private.is_owner());
create policy auditoria_dueno on public.audit_log for select to authenticated using (private.is_owner());
-- push_subscriptions: sin políticas, solo el servidor.

-- Galería: público ve lo publicado; el barbero sube lo suyo sin publicar; el dueño aprueba.
create policy media_publica on public.media for select using (published);
create policy media_staff on public.media for select to authenticated
  using (private.is_owner() or barber_id = private.my_barber_id());
create policy media_barbero_alta on public.media for insert to authenticated
  with check (section = 'barbero' and barber_id = private.my_barber_id() and not published);
create policy media_barbero_borra on public.media for delete to authenticated
  using (barber_id = private.my_barber_id() and not published);
create policy media_dueno on public.media for all to authenticated using (private.is_owner()) with check (private.is_owner());

-- ---------------------------------------------------------------- disponibilidad pública
-- Devuelve solo rangos ocupados, nunca nombres ni contactos.
create function public.busy_ranges(p_barber uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.starts_at, b.ends_at from public.bookings b
  where b.barber_id = p_barber
    and b.starts_at < p_to and b.ends_at > p_from
    and (b.status in ('confirmada', 'en_atencion')
         or (b.status = 'pendiente_pago' and b.hold_expires_at > now()))
  union all
  select a.starts_at, a.ends_at from public.absences a
  where a.barber_id = p_barber and a.starts_at < p_to and a.ends_at > p_from;
$$;

-- ---------------------------------------------------------------- reserva atómica
-- Precio y duración se leen de la base. La restricción de exclusión rechaza cruces;
-- antes se liberan las retenciones vencidas para que no bloqueen el horario.
create function public.create_booking(
  p_barber uuid, p_service uuid, p_starts timestamptz,
  p_name text, p_phone text, p_email text,
  p_token_hash text, p_idempotency text, p_hold_minutes int default 15
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_service public.services;
  v_row public.bookings;
begin
  select * into v_row from public.bookings where idempotency_key = p_idempotency;
  if found then return v_row; end if;

  select * into v_service from public.services where id = p_service and active;
  if not found then raise exception 'servicio_no_disponible' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.barbers where id = p_barber and active)
     or not exists (select 1 from public.barber_services where barber_id = p_barber and service_id = p_service) then
    raise exception 'profesional_no_disponible' using errcode = 'P0001';
  end if;
  if p_starts < now() then raise exception 'horario_pasado' using errcode = 'P0001'; end if;

  perform public.expire_holds();

  insert into public.bookings (barber_id, service_id, starts_at, ends_at, customer_name, customer_phone,
    customer_email, price_cop, access_token_hash, hold_expires_at, idempotency_key)
  values (p_barber, p_service, p_starts, p_starts + make_interval(mins => v_service.duration_min),
    trim(p_name), p_phone, lower(trim(p_email)), v_service.price_cop, p_token_hash,
    now() + make_interval(mins => p_hold_minutes), p_idempotency)
  returning * into v_row;
  return v_row;
exception when exclusion_violation then
  raise exception 'horario_ocupado' using errcode = 'P0001';
end;
$$;

create function public.expire_holds() returns int
language sql security definer set search_path = '' as $$
  with done as (
    update public.bookings set status = 'expirada', updated_at = now()
    where status = 'pendiente_pago' and hold_expires_at <= now()
    returning 1
  ) select count(*)::int from done;
$$;

-- Solo el servidor (service_role) ejecuta escrituras de clientes y mantenimiento.
revoke execute on function public.create_booking from public, anon, authenticated;
revoke execute on function public.expire_holds from public, anon, authenticated;
grant execute on function public.busy_ranges to anon, authenticated;

-- ---------------------------------------------------------------- tiempo real
alter publication supabase_realtime add table public.queue_tickets, public.bookings;

-- ---------------------------------------------------------------- almacenamiento
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('galeria', 'galeria', true, 52428800, array['image/webp','image/jpeg','image/png','video/mp4','video/webm']),
  ('referencias', 'referencias', false, 5242880, array['image/webp','image/jpeg','image/png']);

-- galeria/barberos/{barber_id}/...: cada barbero escribe en su carpeta; el dueño en todo.
create policy galeria_dueno on storage.objects for all to authenticated
  using (bucket_id = 'galeria' and private.is_owner())
  with check (bucket_id = 'galeria' and private.is_owner());
create policy galeria_barbero on storage.objects for insert to authenticated
  with check (bucket_id = 'galeria' and (storage.foldername(name))[1] = 'barberos'
    and (storage.foldername(name))[2] = private.my_barber_id()::text);
create policy referencias_dueno on storage.objects for select to authenticated
  using (bucket_id = 'referencias' and private.is_owner());

revoke execute on function private.is_owner, private.my_barber_id from public;
-- anon las necesita porque las políticas públicas las evalúan; solo informan sobre quien llama.
grant execute on function private.is_owner, private.my_barber_id to anon, authenticated;
