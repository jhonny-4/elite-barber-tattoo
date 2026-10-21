-- Al iniciar desde Agenda, el trigger de cita ya cambió el estado a en_atencion
-- cuando se sincroniza la fila. Se permiten ambos estados de origen válidos.
do $$
declare definition text;
begin
  definition:=pg_get_functiondef('private.validate_attention()'::regprocedure);
  if position('status=''confirmada'' and starts_at<=now()' in definition)=0 then raise exception 'Definición de atención inesperada'; end if;
  definition:=replace(definition,'status=''confirmada'' and starts_at<=now()','status in (''confirmada'',''en_atencion'') and starts_at<=now()');
  execute definition;
end; $$;
