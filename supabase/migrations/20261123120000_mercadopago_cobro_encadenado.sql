-- =============================================================================
-- MERCADO PAGO · CADA COBRO APROBADO ES UNA MEMBRESÍA ENCADENADA  ·  23/11/2026
-- -----------------------------------------------------------------------------
-- SE APLICA A MANO (Supabase → SQL Editor). Comprobación en
-- supabase/verificacion/mercadopago_cobro_encadenado_verificacion.sql
--
-- Corrige `activar_membresia_desde_cobro`, que tenía dos fallos:
--
-- 1. COBROS QUE NO DABAN MEMBRESÍA. Si el socio no tenía una membresía
--    vigente HOY, insertaba una nueva 'activa'. Pero `membresias.estado` no
--    cambia al vencer: la última membresía de un socio vencido sigue diciendo
--    'activa', y `uq_membresia_activa` (una sola 'activa' por socio) rechazaba
--    el INSERT. El cobro quedaba en error y Mercado Pago lo reintentaba sin
--    fin: el socio pagaba y no recibía nada. Pasaba al recuperar un cobro en
--    la gracia, con un reintento tardío de Mercado Pago y al volver al club.
--
-- 2. LAS RENOVACIONES NO ERAN VENTAS. Una renovación alargaba `fecha_fin` de
--    la misma fila: Métricas no contaba ese ingreso y el historial no mostraba
--    el pago. Ahora cada cobro aprobado crea SU membresía, encadenada detrás
--    de la anterior, igual que «Renovar» en el panel (`encadenarMembresia`):
--    la anterior pasa a 'vencida' («ya tiene quien la siga»; sus días corren
--    hasta su fin, `estadoEnHistorial`) y la nueva empieza el día siguiente.
--
-- Fechas, como en el panel (`calcularFechaInicioRenovacion`):
--   - Si la última sigue cubriendo (vigente hoy, o en la gracia de ESTA
--     suscripción), la nueva empieza el día siguiente a su fin.
--   - Si no (vencida, revocada, o nunca tuvo), empieza hoy.
--   - Dura lo del plan (`+ N meses`, con el último día del mes si se desborda).
--
-- Además: `conciliada_at` en las suscripciones, para que la conciliación
-- horaria las recorra TODAS por turnos (antes repasaba siempre las mismas 200).
-- =============================================================================

create or replace function public.activar_membresia_desde_cobro(p_pago_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pago        public.pagos_mercadopago%rowtype;
  v_sus         public.suscripciones_mercadopago%rowtype;
  v_meses       integer;
  v_hoy         date := (now() at time zone 'America/Bogota')::date;
  v_ultima_id   bigint;
  v_ultima_fin  date;
  v_continua    boolean;
  v_anterior_id bigint;
  v_inicio      date;
  v_fin         date;
  v_nueva_id    bigint;
begin
  select * into v_pago from public.pagos_mercadopago where id = p_pago_id for update;
  if not found then
    raise exception 'pago_inexistente' using errcode = 'P0002';
  end if;

  -- Ya aplicado (un reintento que llega a la vez): no se crea otra.
  if v_pago.membresia_id is not null then
    return v_pago.membresia_id;
  end if;

  select * into v_sus from public.suscripciones_mercadopago where id = v_pago.suscripcion_id;
  if not found or v_sus.plan_id is null then
    raise exception 'suscripcion_sin_plan' using errcode = 'P0002';
  end if;

  select duracion_meses into v_meses from public.planes_membresia where id = v_sus.plan_id;

  -- Dos cobros del mismo socio no se cruzan: se serializan sobre su ficha.
  perform 1 from public.miembros where id = v_sus.miembro_id for update;

  -- La última 'activa' del socio. Puede estar vencida: nada cambia ese estado.
  select m.id, m.fecha_fin into v_ultima_id, v_ultima_fin
    from public.membresias m
   where m.miembro_id = v_sus.miembro_id
     and m.estado = 'activa'
   order by m.fecha_fin desc, m.id desc
   limit 1;

  v_continua := v_ultima_id is not null and (
    v_ultima_fin >= v_hoy
    or (v_sus.membresia_id = v_ultima_id
        and v_sus.gracia_hasta is not null
        and v_sus.gracia_hasta >= v_hoy)
  );

  v_inicio := coalesce(v_pago.periodo_desde,
                       case when v_continua then v_ultima_fin + 1 else v_hoy end);
  v_fin := coalesce(v_pago.periodo_hasta,
                    (v_inicio + make_interval(months => coalesce(v_meses, 1)))::date);

  -- La anterior en el historial: la última del socio, en el estado que sea.
  select m.id into v_anterior_id
    from public.membresias m
   where m.miembro_id = v_sus.miembro_id
   order by m.fecha_fin desc, m.id desc
   limit 1;

  -- UNA sola 'activa' por socio (`uq_membresia_activa`): la anterior pasa a
  -- 'vencida' ANTES de insertar. Todo es una transacción: si el INSERT falla,
  -- este UPDATE se deshace con él.
  update public.membresias
     set estado = 'vencida', updated_at = now()
   where miembro_id = v_sus.miembro_id
     and estado = 'activa';

  insert into public.membresias
    (miembro_id, plan_id, tipo, estado, fecha_inicio, fecha_fin, precio_pagado,
     es_cortesia, origen, pago_id, membresia_anterior_id)
  values
    (v_sus.miembro_id, v_sus.plan_id,
     case when v_anterior_id is null then 'nueva' else 'renovada' end::public.tipo_membresia,
     'activa', v_inicio, v_fin, v_pago.monto,
     false, 'mercado_pago', p_pago_id, v_anterior_id)
  returning id into v_nueva_id;

  return v_nueva_id;
end;
$$;

revoke all on function public.activar_membresia_desde_cobro(bigint) from public, anon, authenticated;
grant execute on function public.activar_membresia_desde_cobro(bigint) to service_role;

-- La conciliación horaria recorre las suscripciones por turnos: primero las
-- que nunca se conciliaron, luego las que hace más tiempo.
alter table public.suscripciones_mercadopago
  add column if not exists conciliada_at timestamptz null;

create index if not exists suscripciones_mp_conciliada_idx
  on public.suscripciones_mercadopago (conciliada_at nulls first)
  where estado_mp = 'authorized';
