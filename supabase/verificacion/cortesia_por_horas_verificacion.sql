-- Comprobación de 20261112120000_cortesia_por_horas.sql (solo lectura).

-- 1. La columna existe, es timestamptz y admite NULL.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'membresias'
  and column_name = 'vence_at';

-- 2. La regla «solo una cortesía lleva vence_at» está puesta.
select conname, pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.membresias'::regclass
  and conname = 'membresias_vence_at_solo_cortesia';

-- 3. `fn_validar_venta` ya mira vence_at (debe dar true).
select position('vence_at' in pg_get_functiondef('public.fn_validar_venta()'::regprocedure)) > 0
  as validar_venta_mira_vence_at;

-- 4. Las cortesías por horas que hay, y si siguen vigentes.
select id, miembro_id, fecha_inicio, fecha_fin, vence_at, vence_at > now() as vigente_ahora
from public.membresias
where vence_at is not null
order by vence_at desc
limit 20;
