-- ============================================================================
-- VERIFICACIÓN · cada cobro aprobado es una membresía encadenada  ·  23/11/2026
-- ----------------------------------------------------------------------------
-- Comprueba la migración 20261123120000_mercadopago_cobro_encadenado.sql.
--
-- NO DEJA NINGÚN CAMBIO: todo va dentro de un bloque que termina lanzando un
-- error a propósito, y un error deshace todo lo que el bloque hizo. Preview y
-- producción comparten base: por eso se prueba así.
--
-- Cómo leerlo: el SQL Editor muestra un ERROR cuyo texto empieza por
-- «RESULTADO DE LA VERIFICACIÓN». Ese error ES el informe: cada línea dice OK
-- o FALLA. Si sale otro error distinto, la migración no está aplicada o algo
-- falló de verdad.
--
-- Usa la suscripción del registro 12 (la prueba de punta a punta del 17/11,
-- membresía 71, plan mensual). Si ese dato cambia, ajusta v_preapproval.
-- ============================================================================

do $$
declare
  v_preapproval constant text := '1a6f4ded6b2c44029f9e933a3322bc4b';
  v_hoy   date := (now() at time zone 'America/Bogota')::date;
  v_sus   public.suscripciones_mercadopago%rowtype;
  v_base  public.membresias%rowtype;
  v_pago  bigint;
  v_id    bigint;
  v_m     public.membresias%rowtype;
  v_n     int;
  v_inf   text := E'RESULTADO DE LA VERIFICACIÓN\n';

begin
  select * into v_sus from public.suscripciones_mercadopago where preapproval_id = v_preapproval;
  if not found then
    raise exception 'No existe la suscripción de prueba %: ajusta v_preapproval.', v_preapproval;
  end if;
  select * into v_base from public.membresias where id = v_sus.membresia_id;

  -- ------------------------------------------------------------------------
  -- A. Renovación a tiempo: la nueva va DETRÁS de la vigente.
  -- ------------------------------------------------------------------------
  begin
    update public.membresias set fecha_inicio = v_hoy - 20, fecha_fin = v_hoy + 10, estado = 'activa'
     where id = v_base.id;
    insert into public.pagos_mercadopago (suscripcion_id, miembro_id, payment_id, monto, moneda, estado_mp)
    values (v_sus.id, v_sus.miembro_id, 'verif-A', 30000, 'COP', 'approved') returning id into v_pago;
    v_id := public.activar_membresia_desde_cobro(v_pago);
    select * into v_m from public.membresias where id = v_id;
    select count(*) into v_n from public.membresias where miembro_id = v_sus.miembro_id and estado = 'activa';

    v_inf := v_inf || format(E'A. Renovación a tiempo: empieza %s (esperado %s) · tipo %s · anterior %s · activas %s → %s\n',
      v_m.fecha_inicio, v_hoy + 11, v_m.tipo, v_m.membresia_anterior_id, v_n,
      case when v_m.fecha_inicio = v_hoy + 11 and v_m.tipo = 'renovada'
                and v_m.membresia_anterior_id = v_base.id and v_n = 1
                and (select estado from public.membresias where id = v_base.id) = 'vencida'
                and (select fecha_fin from public.membresias where id = v_base.id) = v_hoy + 10
           then 'OK' else 'FALLA' end);
    raise exception using errcode = 'P0099';
  exception when sqlstate 'P0099' then null;
  end;

  -- ------------------------------------------------------------------------
  -- B. Socio VENCIDO que vuelve a pagar (el fallo de antes: la base rechazaba
  --    la segunda 'activa' y el cobro no daba membresía).
  -- ------------------------------------------------------------------------
  begin
    update public.membresias set fecha_inicio = v_hoy - 40, fecha_fin = v_hoy - 10, estado = 'activa'
     where id = v_base.id;
    update public.suscripciones_mercadopago set gracia_hasta = null where id = v_sus.id;
    insert into public.pagos_mercadopago (suscripcion_id, miembro_id, payment_id, monto, moneda, estado_mp)
    values (v_sus.id, v_sus.miembro_id, 'verif-B', 30000, 'COP', 'approved') returning id into v_pago;
    v_id := public.activar_membresia_desde_cobro(v_pago);
    select * into v_m from public.membresias where id = v_id;
    select count(*) into v_n from public.membresias where miembro_id = v_sus.miembro_id and estado = 'activa';

    v_inf := v_inf || format(E'B. Socio vencido que vuelve a pagar: empieza %s (esperado hoy, %s) · activas %s → %s\n',
      v_m.fecha_inicio, v_hoy, v_n,
      case when v_m.fecha_inicio = v_hoy and v_n = 1 then 'OK' else 'FALLA' end);
    raise exception using errcode = 'P0099';
  exception when sqlstate 'P0099' then null;
  end;

  -- ------------------------------------------------------------------------
  -- C. Cobro recuperado DENTRO de la gracia: sigue sin hueco desde el fin.
  -- ------------------------------------------------------------------------
  begin
    update public.membresias set fecha_inicio = v_hoy - 32, fecha_fin = v_hoy - 2, estado = 'activa'
     where id = v_base.id;
    update public.suscripciones_mercadopago set gracia_hasta = v_hoy + 1, membresia_id = v_base.id
     where id = v_sus.id;
    select * into v_sus from public.suscripciones_mercadopago where id = v_sus.id;
    insert into public.pagos_mercadopago (suscripcion_id, miembro_id, payment_id, monto, moneda, estado_mp)
    values (v_sus.id, v_sus.miembro_id, 'verif-C', 30000, 'COP', 'approved') returning id into v_pago;
    v_id := public.activar_membresia_desde_cobro(v_pago);
    select * into v_m from public.membresias where id = v_id;

    v_inf := v_inf || format(E'C. Cobro recuperado en la gracia: empieza %s (esperado %s) → %s\n',
      v_m.fecha_inicio, v_hoy - 1,
      case when v_m.fecha_inicio = v_hoy - 1 then 'OK' else 'FALLA' end);
    raise exception using errcode = 'P0099';
  exception when sqlstate 'P0099' then null;
  end;

  -- ------------------------------------------------------------------------
  -- D. El mismo cobro dos veces (Mercado Pago lo reenvía): UNA membresía.
  -- ------------------------------------------------------------------------
  begin
    select count(*) into v_n from public.membresias where miembro_id = v_sus.miembro_id;
    perform public.registrar_cobro_mp('verif-D', v_preapproval, 30000, 'COP', 'approved', null, null, null);
    perform public.registrar_cobro_mp('verif-D', v_preapproval, 30000, 'COP', 'approved', null, null, null);
    select count(*) - v_n into v_n from public.membresias where miembro_id = v_sus.miembro_id;

    v_inf := v_inf || format(E'D. Mismo cobro dos veces: membresías nuevas %s (esperado 1) → %s\n',
      v_n, case when v_n = 1 then 'OK' else 'FALLA' end);
    raise exception using errcode = 'P0099';
  exception when sqlstate 'P0099' then null;
  end;

  -- ------------------------------------------------------------------------
  -- E. La columna de turnos de la conciliación existe.
  -- ------------------------------------------------------------------------
  select count(*) into v_n from information_schema.columns
   where table_schema = 'public' and table_name = 'suscripciones_mercadopago' and column_name = 'conciliada_at';
  v_inf := v_inf || format(E'E. Columna conciliada_at → %s\n', case when v_n = 1 then 'OK' else 'FALLA' end);

  -- Deshace TODO y enseña el informe.
  raise exception '%', v_inf;
end;
$$;
