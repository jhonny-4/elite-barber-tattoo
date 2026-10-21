-- Avisos push para el equipo (dueño y barberos) aunque el panel esté cerrado,
-- y control del resumen diario. Las suscripciones de clientes siguen en push_subscriptions.

create table public.staff_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  -- Un navegador tiene un único endpoint; si otro usuario inicia sesión en el mismo
  -- dispositivo, el servidor reasigna la fila (no se duplican avisos).
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  keys jsonb not null check (jsonb_typeof(keys -> 'p256dh') = 'string' and jsonb_typeof(keys -> 'auth') = 'string'),
  created_at timestamptz not null default now()
);
create index on public.staff_push_subscriptions (user_id);

alter table public.staff_push_subscriptions enable row level security;
-- Cada miembro del equipo gestiona solo las suyas. El envío lo hace el servidor (service_role).
create policy sps_propias_select on public.staff_push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy sps_propias_insert on public.staff_push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid())));
create policy sps_propias_delete on public.staff_push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.staff_push_subscriptions from anon;

-- Un resumen por día de Bogotá: notifications es única por (cita, turno, canal, plantilla)
-- y con cita nula solo admitiría una fila en toda la vida del sistema.
create table public.daily_digest (
  day date primary key,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text
);
alter table public.daily_digest enable row level security;
revoke all on public.daily_digest from anon, authenticated;
