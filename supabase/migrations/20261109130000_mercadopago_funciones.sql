-- ============================================================================
-- MERCADO PAGO · funciones de cobro  ·  09/11/2026
-- ----------------------------------------------------------------------------
-- Requiere 20261109120000_mercadopago.sql (ya aplicada).
--
-- Reglas:
--   · La membresía nace SOLO con un cobro aprobado, nunca al crear la cuenta.
--   · Si el socio tiene una membresía vigente, el cobro la extiende; si no,
--     crea una nueva (`tipo = 'nueva'`).
--   · Cobro rechazado: `gracia_hasta = fecha_fin de la membresía + 3 días`.
--     Criterio confirmado por el propietario el 09/11/2026.
--   · Un `payment_id` procesado no vuelve a tener efecto (upsert + bloqueo).
--   · Solo service_role puede ejecutar estas funciones.
-- ============================================================================

-- 0. El plan viaja con la suscripción: sin él no se sabe qué membresía crear.
alter table public.suscripciones_mercadopago
  add column if not exists plan_id bigint null references public.planes_membresia(id);

-- Las dos cortesías existentes quedaron como 'presencial' por el default.
update public.membresias
   set origen = 'cortesia'
 where es_cortesia and origen = 'presencial';

-- 1. Crear la suscripción local (la llama iniciarSuscripcion tras crearla en MP).
create or replace function public.registrar_suscripcion_mp(
  p_miembro_id bigint,
  p_plan_id bigint,
  p_preapproval_id text,
  p_estado_mp text default 'pending'
) returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
begin
  insert into public.suscripciones_mercadopago
    (miembro_id, plan_id, preapproval_id, estado_mp, renovacion_activa)
  values
    (p_miembro_id, p_plan_id, p_preapproval_id, p_estado_mp, true)
  returning id into v_id;
  return v_id;
end;
$$;

-- 2. Espejo del estado de la suscripción en MP (webhook subscription_preapproval).
--    No corta acceso: el acceso lo deciden las fechas y la gracia.
create or replace function public.espejar_estado_suscripcion(
  p_preapproval_id text,
  p_estado_mp text,
  p_renovacion_activa boolean
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.suscripciones_mercadopago
     set estado_mp = p_estado_mp,
         renovacion_activa = p_renovacion_activa,
         updated_at = now()
   where preapproval_id = p_preapproval_id;
  return found;
end;
$$;

-- 3. Activa o extiende la membresía a partir de un cobro aprobado.
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
  v_inicio := coalesce(v_pago.periodo_desde, v_hoy);
  v_fin := coalesce(v_pago.periodo_hasta, (v_inicio + make_interval(months => coalesce(v_meses, 1)))::date);

  -- Vigente = activa y con fecha_fin de hoy en adelante (no se lee `estado` en crudo).
  select m.id, m.fecha_fin into v_vigente_id, v_vigente_fin
    from public.membresias m
   where m.miembro_id = v_sus.miembro_id
     and m.estado = 'activa'
     and m.fecha_fin >= v_hoy
   order by m.fecha_fin desc
   limit 1
   for update;

  -- Extender: solo mueve la fecha de fin. El origen original (presencial,
  -- cortesia o mercado_pago) y su pago_id NO cambian; el vínculo a este
  -- cobro queda en pagos_mercadopago.membresia_id.
  if v_vigente_id is not null then
    update public.membresias
       set fecha_fin = greatest(v_vigente_fin, v_fin),
           updated_at = now()
     where id = v_vigente_id;
    return v_vigente_id;
  end if;

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

-- 4. Cobro rechazado: abre la gracia desde el fin de la membresía pagada.
create or replace function public.marcar_cobro_rechazado(p_suscripcion_id bigint)
returns date
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sus public.suscripciones_mercadopago%rowtype;
  v_fin date;
  v_gracia date;
begin
  select * into v_sus from public.suscripciones_mercadopago where id = p_suscripcion_id for update;
  if not found then
    raise exception 'suscripcion_inexistente' using errcode = 'P0002';
  end if;

  if v_sus.membresia_id is null then
    -- Nunca hubo membresía pagada: no hay nada que dar de gracia.
    return null;
  end if;

  select fecha_fin into v_fin from public.membresias where id = v_sus.membresia_id;
  v_gracia := v_fin + 3;

  update public.suscripciones_mercadopago
     set gracia_hasta = v_gracia, updated_at = now()
   where id = p_suscripcion_id;

  return v_gracia;
end;
$$;

-- 5. Punto de entrada del webhook para un cobro (idempotente por payment_id).
create or replace function public.registrar_cobro_mp(
  p_payment_id text,
  p_preapproval_id text,
  p_monto numeric,
  p_moneda text,
  p_estado_mp text,
  p_status_detail text,
  p_periodo_desde date,
  p_periodo_hasta date
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sus public.suscripciones_mercadopago%rowtype;
  v_pago public.pagos_mercadopago%rowtype;
  v_membresia_id bigint;
  v_gracia date;
  v_accion text;
begin
  select * into v_sus from public.suscripciones_mercadopago
   where preapproval_id = p_preapproval_id
   for update;
  if not found then
    raise exception 'suscripcion_desconocida' using errcode = 'P0002';
  end if;

  -- membresia_id del pago NO se copia de la suscripción: solo se rellena
  -- cuando este cobro activa o extiende una membresía. Si se copiara, la
  -- extensión nunca se ejecutaría (el pago parecería ya procesado).
  insert into public.pagos_mercadopago
    (suscripcion_id, miembro_id, payment_id, monto, moneda,
     estado_mp, status_detail, periodo_desde, periodo_hasta)
  values
    (v_sus.id, v_sus.miembro_id, p_payment_id, p_monto,
     coalesce(p_moneda, 'COP'), p_estado_mp, p_status_detail, p_periodo_desde, p_periodo_hasta)
  on conflict (payment_id) do update
     set estado_mp = excluded.estado_mp,
         status_detail = excluded.status_detail,
         periodo_desde = coalesce(excluded.periodo_desde, public.pagos_mercadopago.periodo_desde),
         periodo_hasta = coalesce(excluded.periodo_hasta, public.pagos_mercadopago.periodo_hasta)
  returning * into v_pago;

  -- 'processed' (cuota de suscripción) NO decide nada: el webhook debe pasar
  -- el estado del PAGO (approved / rejected). Si llega, se rechaza la llamada.
  if p_estado_mp = 'processed' then
    raise exception 'estado_no_decisivo: consultar el pago antes de registrarlo'
      using errcode = 'P0001';
  end if;

  if p_estado_mp = 'approved' then
    v_accion := 'aprobado';
    -- Solo la primera vez que llega aprobado tiene efecto.
    if v_pago.membresia_id is null then
      v_membresia_id := public.activar_membresia_desde_cobro(v_pago.id);
      update public.pagos_mercadopago
         set membresia_id = v_membresia_id, procesado_at = now()
       where id = v_pago.id;
    else
      v_membresia_id := v_pago.membresia_id;
    end if;

    update public.suscripciones_mercadopago
       set membresia_id = v_membresia_id,
           gracia_hasta = null,
           estado_mp = 'authorized',
           updated_at = now()
     where id = v_sus.id;

  elsif p_estado_mp = 'rejected' then
    v_accion := 'rechazado';
    v_gracia := public.marcar_cobro_rechazado(v_sus.id);
    update public.pagos_mercadopago set procesado_at = now() where id = v_pago.id;

  else
    -- En espera, en revisión o desconocido: se guarda el cobro y no cambia acceso.
    v_accion := 'en_espera';
  end if;

  return jsonb_build_object(
    'accion', v_accion,
    'pago_id', v_pago.id,
    'membresia_id', v_membresia_id,
    'gracia_hasta', v_gracia
  );
end;
$$;

-- 6. Cambio de renovación pedido por el socio (espejo local de la acción en MP).
create or replace function public.cambiar_renovacion(p_suscripcion_id bigint, p_activa boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.suscripciones_mercadopago
     set renovacion_activa = p_activa, updated_at = now()
   where id = p_suscripcion_id;
  return found;
end;
$$;

-- 7. Cierre por gracia vencida. No toca la membresía: su fecha_fin ya la vence.
create or replace function public.cerrar_acceso_por_gracia(p_suscripcion_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.suscripciones_mercadopago
     set renovacion_activa = false, updated_at = now()
   where id = p_suscripcion_id;
  return found;
end;
$$;

-- 8. Permisos: solo service_role.
revoke all on function public.registrar_suscripcion_mp(bigint, bigint, text, text) from public, anon, authenticated;
revoke all on function public.espejar_estado_suscripcion(text, text, boolean) from public, anon, authenticated;
revoke all on function public.activar_membresia_desde_cobro(bigint) from public, anon, authenticated;
revoke all on function public.marcar_cobro_rechazado(bigint) from public, anon, authenticated;
revoke all on function public.registrar_cobro_mp(text, text, numeric, text, text, text, date, date) from public, anon, authenticated;
revoke all on function public.cambiar_renovacion(bigint, boolean) from public, anon, authenticated;
revoke all on function public.cerrar_acceso_por_gracia(bigint) from public, anon, authenticated;

grant execute on function public.registrar_suscripcion_mp(bigint, bigint, text, text) to service_role;
grant execute on function public.espejar_estado_suscripcion(text, text, boolean) to service_role;
grant execute on function public.activar_membresia_desde_cobro(bigint) to service_role;
grant execute on function public.marcar_cobro_rechazado(bigint) to service_role;
grant execute on function public.registrar_cobro_mp(text, text, numeric, text, text, text, date, date) to service_role;
grant execute on function public.cambiar_renovacion(bigint, boolean) to service_role;
grant execute on function public.cerrar_acceso_por_gracia(bigint) to service_role;
