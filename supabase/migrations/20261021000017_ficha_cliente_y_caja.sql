-- Ficha de cliente (notas internas) y caja del día (cobro en el local).

-- Notas por cliente. La clave es el teléfono normalizado (solo dígitos, sin el 57 de Colombia),
-- así "+57 301 232 9541" y "3012329541" apuntan a la misma ficha.
create table public.client_notes (
  phone text primary key check (phone ~ '^[0-9]{7,15}$'),
  note text not null default '' check (length(note) <= 1000),
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.client_notes enable row level security;
-- Solo el equipo (dueño o barbero con perfil) lee y escribe; el público no ve nada.
create policy notas_staff_lectura on public.client_notes for select to authenticated
  using (private.is_owner() or private.my_barber_id() is not null);
create policy notas_staff_alta on public.client_notes for insert to authenticated
  with check (private.is_owner() or private.my_barber_id() is not null);
create policy notas_staff_edicion on public.client_notes for update to authenticated
  using (private.is_owner() or private.my_barber_id() is not null)
  with check (private.is_owner() or private.my_barber_id() is not null);
create index on public.client_notes (updated_by);

-- Cobro en el local: la cita/turno finalizado se marca como cobrado cuando el cliente paga en caja.
alter table public.bookings add column paid_in_store_at timestamptz;
alter table public.queue_tickets add column paid_in_store_at timestamptz;
-- La caja consulta por día y estado; el índice parcial solo cubre lo finalizado.
create index bookings_caja on public.bookings (starts_at) where status = 'finalizada';
