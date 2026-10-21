-- Cotización de tatuajes: monto, abono, notas y enlace privado para el cliente.
alter table public.tattoo_requests
  add column quote_cop integer check (quote_cop is null or quote_cop between 1 and 100000000),
  add column deposit_cop integer check (deposit_cop is null or deposit_cop >= 0),
  add column quote_notes text check (length(quote_notes) <= 1000),
  -- Solo se guarda el hash del enlace /cotizacion/[token]; el token viaja por correo.
  add column quote_token_hash text unique,
  add column quoted_at timestamptz,
  add constraint tattoo_deposit_within_quote check (deposit_cop is null or quote_cop is null or deposit_cop <= quote_cop);
