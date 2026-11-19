-- ============================================================================
-- MERCADO PAGO · la gracia da acceso  ·  18/11/2026
-- ----------------------------------------------------------------------------
-- Requiere 20261109130000_mercadopago_funciones.sql y 20261028120000 (ventas).
--
-- Hasta hoy `gracia_hasta` se escribía al rechazarse un cobro, pero nadie la
-- leía: el acceso dependía solo de `fecha_fin`. Criterio confirmado por el
-- propietario (18/11/2026, opción B): el socio conserva el acceso hasta
-- `gracia_hasta` aunque la membresía ya haya vencido.
--
-- Regla única, en `membresia_con_acceso`:
--   activa  y  (fecha_fin >= hoy  o  hay una suscripción de esa membresía con
--               gracia_hasta >= hoy)
--
-- Se aplica a: la caja (fn_validar_venta), y las dos comprobaciones de reseñas
-- (trg_resenas_validar y puedo_resenar). El resto de funciones se reescriben
-- idénticas salvo esa línea.
-- ============================================================================

-- 1. La regla de acceso, en un solo sitio.
create or replace function public.membresia_con_acceso(p_membresia_id bigint, p_hoy date)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.membresias m
    where m.id = p_membresia_id
      and m.estado = 'activa'
      and (
        m.fecha_fin >= p_hoy
        or exists (
          select 1
          from public.suscripciones_mercadopago s
          where s.membresia_id = m.id
            and s.gracia_hasta >= p_hoy
        )
      )
  );
$$;

revoke all on function public.membresia_con_acceso(bigint, date) from public, anon, authenticated;
grant execute on function public.membresia_con_acceso(bigint, date) to service_role;

-- 2. Caja: una venta exige acceso (vigente o en gracia).
create or replace function public.fn_validar_venta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comercio_id bigint;
  v_promo record;
  v_descuento_esperado numeric;
  v_membresia record;
  v_ahora timestamp;
begin
  select s.comercio_id into v_comercio_id
  from sucursales s
  where s.id = new.sucursal_id;

  if v_comercio_id is null then
    raise exception 'Sucursal invalida';
  end if;

  if not exists (
    select 1
    from comercios c
    where c.id = v_comercio_id
      and c.activo
      and c.deleted_at is null
  ) then
    raise exception 'El comercio no esta activo como aliado';
  end if;

  if new.promocion_id is not null then
    select p.comercio_id, p.activo, p.deleted_at, p.fecha_inicio, p.fecha_fin,
           p.dias_semana, p.franjas_horarias, p.valor, tb.codigo as tipo_codigo
      into v_promo
      from promociones p
      join tipos_beneficio tb on tb.id = p.tipo_beneficio_id
     where p.id = new.promocion_id;

    if not found or v_promo.comercio_id is distinct from v_comercio_id then
      raise exception 'La promocion no pertenece a este comercio';
    end if;

    if not (
      v_promo.activo
      and v_promo.deleted_at is null
      and (v_promo.fecha_inicio is null or v_promo.fecha_inicio <= current_date)
      and (v_promo.fecha_fin is null or v_promo.fecha_fin >= current_date)
    ) then
      raise exception 'La promocion ya no esta vigente';
    end if;

    -- Si la promocion solo vale ciertos dias, hoy (en Colombia, no en la zona
    -- de la sesion, que es UTC) tiene que ser uno de ellos.
    v_ahora := now() at time zone 'America/Bogota';
    if v_promo.dias_semana is not null
       and not (extract(isodow from v_ahora)::smallint = any (v_promo.dias_semana)) then
      raise exception 'La promocion no aplica el dia de hoy';
    end if;

    -- Si la promocion tiene franjas, AHORA tiene que caer en una franja de HOY.
    -- `desde` incluido, `hasta` no.
    if v_promo.franjas_horarias is not null
       and not exists (
         select 1
         from jsonb_array_elements(v_promo.franjas_horarias) as f(franja)
         where (f.franja -> 'dias') @> to_jsonb(extract(isodow from v_ahora)::int)
           and (f.franja ->> 'desde')::time <= v_ahora::time
           and v_ahora::time < (f.franja ->> 'hasta')::time
       ) then
      raise exception 'La promocion no aplica a esta hora';
    end if;

    if v_promo.tipo_codigo = 'porcentaje' then
      v_descuento_esperado := round(new.valor_compra * coalesce(v_promo.valor, 0) / 100);
    elsif v_promo.tipo_codigo = 'monto_fijo' then
      v_descuento_esperado := least(coalesce(v_promo.valor, 0), new.valor_compra);
    else
      v_descuento_esperado := new.valor_descuento;
    end if;

    if new.valor_descuento is distinct from v_descuento_esperado then
      raise exception 'El descuento no coincide con la promocion';
    end if;
  elsif new.valor_descuento <> 0 then
    raise exception 'No puede haber descuento sin promocion';
  end if;

  if new.valor_final is distinct from greatest(0, new.valor_compra - new.valor_descuento) then
    raise exception 'El valor final no coincide con compra y descuento';
  end if;

  if new.membresia_id is null then
    raise exception 'Falta la membresia del miembro';
  end if;

  select m.miembro_id into v_membresia
  from membresias m
  where m.id = new.membresia_id;

  if not found or v_membresia.miembro_id is distinct from new.miembro_id then
    raise exception 'La membresia no corresponde a este miembro';
  end if;

  if not public.membresia_con_acceso(new.membresia_id, current_date) then
    raise exception 'La membresia del miembro no esta vigente';
  end if;

  return new;
end;
$$;

-- 3. Reseñas: la barrera de escritura.
create or replace function public.fn_validar_resena()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.estrellas is distinct from old.estrellas
     or new.mensaje is distinct from old.mensaje
     or new.comercio_id is distinct from old.comercio_id
     or new.miembro_id is distinct from old.miembro_id
  then
    if not exists (
      select 1
      from comercios c
      where c.id = new.comercio_id
        and c.activo
        and c.deleted_at is null
    ) then
      raise exception 'El comercio no esta activo como aliado';
    end if;

    if not exists (
      select 1
      from miembros mi
      where mi.id = new.miembro_id
        and mi.deleted_at is null
    ) then
      raise exception 'El socio no existe o fue dado de baja';
    end if;

    -- `ventas` guarda la sucursal, no el comercio: el salto es obligado.
    if not exists (
      select 1
      from ventas v
      join sucursales s on s.id = v.sucursal_id
      where v.miembro_id = new.miembro_id
        and s.comercio_id = new.comercio_id
    ) then
      raise exception 'Solo puede resenar quien ha comprado en este comercio';
    end if;

    -- Misma regla que la caja y `derivarEstadoMembresia`: vigente o en gracia.
    if not exists (
      select 1
      from membresias m
      where m.miembro_id = new.miembro_id
        and public.membresia_con_acceso(m.id, current_date)
    ) then
      raise exception 'La membresia del socio no esta vigente';
    end if;

    if tg_op = 'UPDATE' then
      new.updated_at := now();
    end if;
  end if;

  -- Fecha de cada respuesta: se pone sola al escribirla o cambiarla y se
  -- vacía al borrarla.
  if tg_op = 'INSERT' or new.respuesta_comercio is distinct from old.respuesta_comercio then
    new.respuesta_comercio_at :=
      case when new.respuesta_comercio is null then null else now() end;
  end if;
  if tg_op = 'INSERT' or new.respuesta_admin is distinct from old.respuesta_admin then
    new.respuesta_admin_at :=
      case when new.respuesta_admin is null then null else now() end;
  end if;

  return new;
end;
$$;

-- 4. Pista de la interfaz: si el socio puede reseñar (compra previa + acceso).
create or replace function public.puedo_resenar(p_comercio_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from miembros mi
    join comercios c on c.id = p_comercio_id
    where mi.perfil_id = (select auth.uid())
      and mi.deleted_at is null
      and c.activo
      and c.deleted_at is null
      and exists (
        select 1
        from ventas v
        join sucursales s on s.id = v.sucursal_id
        where v.miembro_id = mi.id
          and s.comercio_id = c.id
      )
      and exists (
        select 1
        from membresias m
        where m.miembro_id = mi.id
          and public.membresia_con_acceso(m.id, current_date)
      )
  );
$$;

comment on function public.puedo_resenar(bigint) is
  'Si el socio de la sesión puede crear o editar su reseña de este comercio (compra previa, comercio activo, acceso vigente o en gracia). Pista para la interfaz; la barrera es trg_resenas_validar.';

revoke execute on function public.puedo_resenar(bigint) from public, anon;
grant execute on function public.puedo_resenar(bigint) to authenticated;
