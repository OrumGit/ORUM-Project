-- ORUM · Las HORAS en que vale una promoción (28/10/2026)
--
-- Encargo: «si los descuentos aplican únicamente en horarios fijos, que
-- también se pueda poner». Una promoción puede valer todo el día (NULL, como
-- todas las de hoy) o solo en ciertas franjas, y cada franja lleva SUS días:
--
--   [{"dias":[2,3],"desde":"08:00","hasta":"09:30"},
--    {"dias":[2,3],"desde":"18:00","hasta":"19:00"},
--    {"dias":[6,7],"desde":"08:00","hasta":"09:00"}]
--
-- Días ISO (lunes = 1 … domingo = 7), horas 'HH:MM' de Colombia, `desde` <
-- `hasta` (no cruza la medianoche). La aplicación valida el detalle y guarda
-- en `dias_semana` la unión de los días de las franjas, así lo que ya sabía de
-- días sigue diciendo la verdad (src/lib/comercios/franjas-promocion.ts). La
-- base exige la forma básica y, al registrar una venta, que AHORA caiga en una
-- franja de HOY: si alguien llama a la API sin pasar por la caja, la barrera
-- sigue en pie.
--
-- Aditiva: las promociones de hoy quedan en NULL = todo el día. Los permisos y
-- las políticas de `promociones` son de tabla, así que la columna los hereda.
-- Se aplica a mano en el SQL Editor de Supabase; el código aguanta sin ella.

alter table public.promociones
  add column if not exists franjas_horarias jsonb;

alter table public.promociones
  drop constraint if exists promociones_franjas_horarias_forma;

alter table public.promociones
  add constraint promociones_franjas_horarias_forma
  check (
    franjas_horarias is null
    or (
      jsonb_typeof(franjas_horarias) = 'array'
      and jsonb_array_length(franjas_horarias) between 1 and 6
    )
  );

comment on column public.promociones.franjas_horarias is
  'Franjas en que vale la promoción: [{"dias":[1..7],"desde":"HH:MM","hasta":"HH:MM"}], hora de Colombia. NULL = todo el día. Se comprueba al registrar la venta.';

-- `fn_validar_venta` es la de 20261022130000 sin tocar nada más que el bloque
-- nuevo (marcado abajo). CREATE OR REPLACE conserva el trigger y los permisos.
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

  select m.estado, m.fecha_fin, m.miembro_id into v_membresia
  from membresias m
  where m.id = new.membresia_id;

  if not found or v_membresia.miembro_id is distinct from new.miembro_id then
    raise exception 'La membresia no corresponde a este miembro';
  end if;

  if not (v_membresia.estado = 'activa' and v_membresia.fecha_fin >= current_date) then
    raise exception 'La membresia del miembro no esta vigente';
  end if;

  return new;
end;
$$;
