-- ============================================================================
-- MERCADO PAGO · la renovación cuenta desde fecha_fin  ·  18/11/2026
-- ----------------------------------------------------------------------------
-- Requiere 20261109130000_mercadopago_funciones.sql (ya aplicada).
--
-- Corrige la rama «extender» de activar_membresia_desde_cobro. Antes, un cobro
-- que llegaba con la membresía aún vigente calculaba el nuevo fin desde HOY
-- (hoy + duración), así que pagar 10 días antes de vencer hacía perder esos 10
-- días. Ahora el periodo nuevo empieza donde termina el vigente.
--
-- Sin cambios en la rama «nueva» (sin membresía vigente: empieza hoy).
-- Solo cambia la rama de extender; el resto de la función queda idéntico.
-- ============================================================================

create or replace function public.activar_membresia_desde_cobro(p_pago_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pago public.pagos_mercadopago%rowtype;
  v_sus public.suscripciones_mercadopago%rowtype;
  v_meses integer;
  v_hoy date := (now() at time zone 'America/Bogota')::date;
  v_inicio date;
  v_fin date;
  v_vigente_id bigint;
  v_vigente_fin date;
  v_anterior_id bigint;
  v_nueva_id bigint;
begin
  select * into v_pago from public.pagos_mercadopago where id = p_pago_id for update;
  if not found then
    raise exception 'pago_inexistente' using errcode = 'P0002';
  end if;

  select * into v_sus from public.suscripciones_mercadopago where id = v_pago.suscripcion_id;
  if not found or v_sus.plan_id is null then
    raise exception 'suscripcion_sin_plan' using errcode = 'P0002';
  end if;

  select duracion_meses into v_meses from public.planes_membresia where id = v_sus.plan_id;

  -- Vigente = activa y con fecha_fin de hoy en adelante (no se lee `estado` en crudo).
  select m.id, m.fecha_fin into v_vigente_id, v_vigente_fin
    from public.membresias m
   where m.miembro_id = v_sus.miembro_id
     and m.estado = 'activa'
     and m.fecha_fin >= v_hoy
   order by m.fecha_fin desc
   limit 1
   for update;

  -- Extender: el periodo nuevo empieza al terminar el vigente, no hoy.
  -- Así un cobro adelantado no pierde los días que quedaban.
  if v_vigente_id is not null then
    v_fin := coalesce(
      v_pago.periodo_hasta,
      (v_vigente_fin + make_interval(months => coalesce(v_meses, 1)))::date
    );
    update public.membresias
       set fecha_fin = greatest(v_vigente_fin, v_fin),
           updated_at = now()
     where id = v_vigente_id;
    return v_vigente_id;
  end if;

  -- Sin membresía vigente: la nueva empieza hoy.
  v_inicio := coalesce(v_pago.periodo_desde, v_hoy);
  v_fin := coalesce(v_pago.periodo_hasta, (v_inicio + make_interval(months => coalesce(v_meses, 1)))::date);

  -- Última membresía del socio, para encadenar el historial.
  select m.id into v_anterior_id
    from public.membresias m
   where m.miembro_id = v_sus.miembro_id
   order by m.fecha_fin desc
   limit 1;

  insert into public.membresias
    (miembro_id, plan_id, tipo, estado, fecha_inicio, fecha_fin, precio_pagado,
     es_cortesia, origen, pago_id, membresia_anterior_id)
  values
    (v_sus.miembro_id, v_sus.plan_id, 'nueva', 'activa', v_inicio, v_fin, v_pago.monto,
     false, 'mercado_pago', p_pago_id, v_anterior_id)
  returning id into v_nueva_id;

  return v_nueva_id;
end;
$$;

-- Los permisos de la función original se conservan con create or replace.
-- Se reafirman aquí por si alguien reescribe la migración anterior.
revoke all on function public.activar_membresia_desde_cobro(bigint) from public, anon, authenticated;
grant execute on function public.activar_membresia_desde_cobro(bigint) to service_role;
