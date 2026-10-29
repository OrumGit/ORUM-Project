-- ============================================================================
-- TOP DE COMERCIOS  ·  29/10/2026
-- ----------------------------------------------------------------------------
-- Encargo del propietario: que el socio vea, en la primera pantalla de su
-- portal, los 5 comercios mejor calificados y los 5 con más ventas del último
-- mes.
--
-- Por qué son funciones y no consultas desde el navegador: un socio no puede
-- leer `resenas` ni `ventas` de otros (ni debe). Las funciones son
-- `security definer` y SOLO devuelven agregados por comercio —id y un número—,
-- nunca una fila de un socio ni un importe en dinero.
--
--   · top_comercios_calificados: promedio de estrellas (1 decimal), con un
--     MÍNIMO DE 3 RESEÑAS para que una sola de cinco estrellas no mande.
--   · top_comercios_ventas: número de ventas de los últimos 30 días corridos.
--     `ventas` no guarda `comercio_id`, guarda `sucursal_id`: se salta
--     sucursal -> comercio, como `comercios_mas_usados`.
--
-- Solo comercios activos y no borrados. Se aplica a mano, una vez; el código
-- aguanta sin ella (el bloque simplemente no se pinta).
-- ============================================================================

create or replace function public.top_comercios_calificados(p_limite integer default 5)
returns table (comercio_id bigint, promedio numeric, total integer)
language sql
stable
security definer
set search_path = public
as $$
  select r.comercio_id,
         round(avg(r.estrellas), 1) as promedio,
         count(r.id)::integer       as total
  from public.resenas r
  join public.comercios c on c.id = r.comercio_id
  where c.activo
    and c.deleted_at is null
  group by r.comercio_id, c.nombre
  having count(r.id) >= 3
  -- Empate de promedio: más reseñas primero; luego, orden alfabético.
  order by avg(r.estrellas) desc, count(r.id) desc, c.nombre
  limit greatest(1, least(coalesce(p_limite, 5), 20));
$$;

comment on function public.top_comercios_calificados(integer) is
  'Top de comercios activos por promedio de estrellas, con al menos 3 reseñas. Solo agregados: id, promedio (1 decimal) y total.';

revoke all on function public.top_comercios_calificados(integer) from public, anon;
grant execute on function public.top_comercios_calificados(integer) to authenticated;

create or replace function public.top_comercios_ventas(p_limite integer default 5)
returns table (comercio_id bigint, ventas bigint)
language sql
stable
security definer
set search_path = public
as $$
  select s.comercio_id,
         count(*) as ventas
  from public.ventas v
  join public.sucursales s on s.id = v.sucursal_id
  join public.comercios  c on c.id = s.comercio_id
  where v.fecha_hora >= now() - interval '30 days'
    and c.activo
    and c.deleted_at is null
  group by s.comercio_id, c.nombre
  order by count(*) desc, c.nombre
  limit greatest(1, least(coalesce(p_limite, 5), 20));
$$;

comment on function public.top_comercios_ventas(integer) is
  'Top de comercios activos por número de ventas en los últimos 30 días. Solo agregados: id y conteo, nunca importes.';

revoke all on function public.top_comercios_ventas(integer) from public, anon;
grant execute on function public.top_comercios_ventas(integer) to authenticated;
