-- Comprobación de 20261107120000_comercios_visibilidad.sql (solo lectura).

-- 1. Las dos columnas existen, son boolean, no nulas y valen true por defecto.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'comercios'
  and column_name in ('visible_publico', 'visible_miembros')
order by column_name;

-- 2. Cuántos comercios activos se ven en cada portal.
select
  count(*) filter (where visible_publico and visible_miembros) as en_ambos,
  count(*) filter (where visible_publico and not visible_miembros) as solo_inicial,
  count(*) filter (where not visible_publico and visible_miembros) as solo_miembros,
  count(*) filter (where not visible_publico and not visible_miembros) as ocultos
from public.comercios
where activo and deleted_at is null;
