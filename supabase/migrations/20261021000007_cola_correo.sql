-- La confirmación se encola en la misma transacción que crea/confirma la cita.
create function private.enqueue_booking_confirmation() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.notifications(booking_id,channel,template) values(new.id,'email','confirmacion') on conflict do nothing;
  return new;
end; $$;
create trigger booking_email_insert after insert on public.bookings for each row when(new.status='confirmada') execute function private.enqueue_booking_confirmation();
create trigger booking_email_confirm after update of status on public.bookings for each row when(new.status='confirmada' and old.status is distinct from new.status) execute function private.enqueue_booking_confirmation();
