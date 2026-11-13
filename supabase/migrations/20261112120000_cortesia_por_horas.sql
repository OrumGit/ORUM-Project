-- ORUM · Cortesías por HORAS (12/11/2026)
--
-- Encargo: «que el administrador pueda otorgar membresías de cortesía por el
-- tiempo que decida: horas, semanas, meses o en un calendario; y conserva las
-- cortesías de los planes normales». Días, semanas, meses y la fecha del
-- calendario caben en `fecha_fin` (fecha civil, vale hasta el final del día)
-- y NO necesitan esto. Las HORAS sí: una cortesía de 5 horas tiene que dejar
-- de valer a esa hora, no a medianoche.
--
-- `vence_at` es ese instante exacto. NULL en todas las membresías de hoy y en
-- las que no son por horas (nada cambia para ellas). Solo una cortesía puede
-- llevarlo. `fecha_fin` sigue guardando el día en que vence, así todo lo que
-- ya cuenta por días (listas, portada, recordatorios) sigue diciendo la verdad.
--
-- Dónde se cumple:
--   · la aplicación (`derivarEstadoMembresia` / `esMembresiaVigente`, y la
--     caja vuelve a mirarlo tras `buscar_miembro_comercio`);
--   · y aquí, en `fn_validar_venta`: si alguien llama a la API sin pasar por
--     la caja, la venta se rechaza igual.
--
-- Aditiva. Se aplica a mano en el SQL Editor de Supabase; sin ella el panel
-- da cortesías por días, semanas, meses y fecha, y solo la de horas avisa de
-- que falta esto.

alter table public.membresias
  add column if not exists vence_at timestamptz;

alter table public.membresias
  drop constraint if exists membresias_vence_at_solo_cortesia;

alter table public.membresias
  add constraint membresias_vence_at_solo_cortesia
  check (vence_at is null or es_cortesia);

comment on column public.membresias.vence_at is
  'Instante exacto en que vence una cortesía por horas. NULL = vale hasta el final de fecha_fin (todas las demás).';

-- `fn_validar_venta` es la de 20261028120000 sin tocar nada más que leer
-- `vence_at` y el bloque nuevo (marcado abajo). CREATE OR REPLACE conserva el
-- trigger y los permisos.
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

    -- NUEVO (20261028120000): si la promocion tiene franjas, AHORA tiene que
    -- caer en una franja de HOY. `desde` incluido, `hasta` no.
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

  select m.estado, m.fecha_fin, m.vence_at, m.miembro_id into v_membresia
  from membresias m
  where m.id = new.membresia_id;

  if not found or v_membresia.miembro_id is distinct from new.miembro_id then
    raise exception 'La membresia no corresponde a este miembro';
  end if;

  if not (v_membresia.estado = 'activa' and v_membresia.fecha_fin >= current_date) then
    raise exception 'La membresia del miembro no esta vigente';
  end if;

  -- NUEVO (20261112120000): una cortesía por horas vence en su instante.
  if v_membresia.vence_at is not null and v_membresia.vence_at <= now() then
    raise exception 'La membresia del miembro no esta vigente';
  end if;

  return new;
end;
$$;
