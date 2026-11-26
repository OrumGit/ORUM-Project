-- =============================================================================
-- MERCADO PAGO · ACTIVAR UN PAGO ÚNICO  ·  25/11/2026
-- -----------------------------------------------------------------------------
-- SE APLICA A MANO (Supabase → SQL Editor), después de aprobar el SQL.
-- Plan: docs/superpowers/plans/2026-11-09-mercado-pago-backend.md, §13 (fase 3).
--
-- Una sola función, todo en una transacción:
--   1. Si el registro público aún no es socio, lo da de alta (perfil, número de
--      membresía y ficha), igual que `alta_socio_mercadopago` pero sin suscripción.
--   2. Registra el pago aprobado en `pagos_mercadopago` (sin suscripción).
--   3. Crea la membresía encadenada detrás de la última del socio, con la misma
--      regla de fechas que `activar_membresia_desde_cobro`.
--
-- Idempotente por `payment_id`: un aviso repetido devuelve la misma membresía.
-- Si el monto no coincide con el precio del plan, no activa nada.
--
-- NO hace la comprobación de vencimiento (un pago en efectivo que llega después
-- de su fecha límite): eso lo decide el webhook antes de llamar aquí.
--
-- Solo `service_role` (el webhook).
-- =============================================================================

create or replace function public.activar_pago_unico(
  p_registro_id bigint,
  p_payment_id  text,
  p_monto       numeric
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reg         public.registros_pendientes%rowtype;
  v_pago        public.pagos_mercadopago%rowtype;
  v_existia     boolean := false;
  v_plan_precio numeric;
  v_meses       integer;
  v_hoy         date := (now() at time zone 'America/Bogota')::date;
  v_miembro     bigint;
  v_numero      text;
  v_intento     int := 0;
  v_ultima_id   bigint;
  v_ultima_fin  date;
  v_continua    boolean;
  v_anterior_id bigint;
  v_inicio      date;
  v_fin         date;
  v_nueva_id    bigint;
begin
  select * into v_reg from public.registros_pendientes where id = p_registro_id for update;
  if not found then
    raise exception 'registro_inexistente' using errcode = 'P0002';
  end if;

  -- Un aviso repetido del mismo pago: ya está aplicado.
  select * into v_pago from public.pagos_mercadopago where payment_id = p_payment_id;
  if found then
    v_existia := true;
    if v_pago.membresia_id is not null then
      return v_pago.membresia_id;
    end if;
  end if;

  select precio, duracion_meses into v_plan_precio, v_meses
    from public.planes_membresia where id = v_reg.plan_id;
  if v_plan_precio is null then
    raise exception 'plan_inexistente' using errcode = 'P0002';
  end if;
  if p_monto <> v_plan_precio then
    raise exception 'monto_no_coincide' using errcode = 'P0001';
  end if;

  -- Alta del socio: solo si el registro público aún no tiene ficha.
  if v_reg.miembro_id is null then
    if v_reg.estado <> 'pendiente' then
      raise exception 'registro_no_pendiente' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.miembros where cedula = v_reg.cedula) then
      raise exception 'cedula_ya_es_socio' using errcode = 'P0001';
    end if;

    insert into public.perfiles (id, rol_id, activo)
    values (
      v_reg.auth_user_id,
      (select id from public.roles where codigo = 'miembro'),
      true
    )
    on conflict (id) do nothing;

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

    update public.registros_pendientes
       set miembro_id = v_miembro,
           estado = 'completado',
           updated_at = now()
     where id = v_reg.id;
  else
    v_miembro := v_reg.miembro_id;
  end if;

  -- El pago: se registra la primera vez que llega.
  if not v_existia then
    insert into public.pagos_mercadopago
      (suscripcion_id, miembro_id, payment_id, monto, moneda, estado_mp, recibido_at)
    values
      (null, v_miembro, p_payment_id, p_monto, 'COP', 'approved', now())
    returning * into v_pago;
  end if;

  -- Membresía encadenada: misma regla que `activar_membresia_desde_cobro`.
  perform 1 from public.miembros where id = v_miembro for update;

  select m.id, m.fecha_fin into v_ultima_id, v_ultima_fin
    from public.membresias m
   where m.miembro_id = v_miembro
     and m.estado = 'activa'
   order by m.fecha_fin desc, m.id desc
   limit 1;

  v_continua := v_ultima_id is not null and v_ultima_fin >= v_hoy;
  v_inicio := case when v_continua then v_ultima_fin + 1 else v_hoy end;
  v_fin := (v_inicio + make_interval(months => coalesce(v_meses, 1)))::date;

  select m.id into v_anterior_id
    from public.membresias m
   where m.miembro_id = v_miembro
   order by m.fecha_fin desc, m.id desc
   limit 1;

  update public.membresias
     set estado = 'vencida', updated_at = now()
   where miembro_id = v_miembro
     and estado = 'activa';

  insert into public.membresias
    (miembro_id, plan_id, tipo, estado, fecha_inicio, fecha_fin, precio_pagado,
     es_cortesia, origen, pago_id, membresia_anterior_id)
  values
    (v_miembro, v_reg.plan_id,
     case when v_anterior_id is null then 'nueva' else 'renovada' end::public.tipo_membresia,
     'activa', v_inicio, v_fin, p_monto,
     false, 'mercado_pago', v_pago.id, v_anterior_id)
  returning id into v_nueva_id;

  update public.pagos_mercadopago
     set membresia_id = v_nueva_id, procesado_at = now()
   where id = v_pago.id;

  return v_nueva_id;
end;
$$;

revoke all on function public.activar_pago_unico(bigint, text, numeric) from public, anon, authenticated;
grant execute on function public.activar_pago_unico(bigint, text, numeric) to service_role;
