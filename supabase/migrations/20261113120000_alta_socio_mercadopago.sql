-- Alta del socio al aprobarse el primer cobro de un registro público (plan §10, opción B).
--
-- Se llama desde el webhook justo antes de registrar un cobro aprobado. Convierte
-- el registro pendiente en socio real: número de membresía, perfil, ficha, suscripción
-- con plan asignado (para que `registrar_cobro_mp` ya no falle con `suscripcion_sin_plan`)
-- y marca el registro como completado.
--
-- - Si el preapproval no pertenece a un registro público, devuelve NULL: los cobros de
--   socios existentes (renovaciones) siguen su camino normal.
-- - Idempotente: si el registro ya tiene socio, devuelve ese mismo id sin crear otro.
-- - Lo llama solo `service_role` (el webhook).
--
-- NO APLICADA. Pendiente de confirmación antes de tocar la base de producción.

create or replace function public.alta_socio_mercadopago(p_preapproval_id text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reg       public.registros_pendientes%rowtype;
  v_miembro   bigint;
  v_numero    text;
  v_intento   int := 0;
begin
  select * into v_reg
    from public.registros_pendientes
   where mp_preapproval_id = p_preapproval_id
   for update;
  if not found then
    return null;
  end if;

  -- Reintento de Mercado Pago o cobro repetido: el socio ya existe, no se crea otro.
  if v_reg.miembro_id is not null then
    return v_reg.miembro_id;
  end if;

  if v_reg.estado <> 'pendiente' then
    raise exception 'registro_no_pendiente' using errcode = 'P0001';
  end if;

  -- Una cédula ya dada de alta no puede volver a ser socio por otra vía.
  if exists (select 1 from public.miembros where cedula = v_reg.cedula) then
    raise exception 'cedula_ya_es_socio' using errcode = 'P0001';
  end if;

  -- Perfil de miembro del usuario de autenticación (el registro no lo crea).
  insert into public.perfiles (id, rol_id, activo)
  values (
    v_reg.auth_user_id,
    (select id from public.roles where codigo = 'miembro'),
    true
  )
  on conflict (id) do nothing;

  -- Número de membresía: la función devuelve uno libre; si otra alta lo toma antes,
  -- el índice único de `miembros.numero_membresia` salta y se vuelve a pedir.
  loop
    v_intento := v_intento + 1;
    v_numero := public.asignar_numero_mercadopago();
    begin
      insert into public.miembros
        (perfil_id, numero_membresia, nombres, apellidos, cedula, telefono, direccion, ciudad_id)
      values
        (v_reg.auth_user_id, v_numero, v_reg.nombres, v_reg.apellidos, v_reg.cedula,
         v_reg.telefono, v_reg.direccion, v_reg.ciudad_id)
      returning id into v_miembro;
      exit;
    exception when unique_violation then
      if v_intento >= 3 then raise; end if;
    end;
  end loop;

  perform public.registrar_suscripcion_mp(v_miembro, v_reg.plan_id, p_preapproval_id, 'authorized');

  update public.registros_pendientes
     set miembro_id = v_miembro,
         estado = 'completado',
         updated_at = now()
   where id = v_reg.id;

  return v_miembro;
end;
$$;

revoke execute on function public.alta_socio_mercadopago(text) from public, anon, authenticated;
grant execute on function public.alta_socio_mercadopago(text) to service_role;
