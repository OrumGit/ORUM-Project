-- ORUM · Verificación de 20261029140000_top_comercios.sql
--
-- Correr DESPUÉS de aplicar la migración (SQL Editor de Supabase, o MCP
-- `execute_sql`). Todo va dentro de una transacción que termina en ROLLBACK:
-- no deja datos. Crea sus propios comercios, sucursales, socios, reseñas y
-- ventas. El trigger de reseñas se apaga SOLO dentro de la transacción: aquí
-- se prueba el ranking, no la regla de quién puede reseñar.
--
-- Cada caso emite `NOTICE: OK (x) …`; si no cumple, lanza `FALLO (x): …` y
-- la transacción entera aborta. Como las funciones miran TODOS los comercios,
-- los casos buscan los de prueba (prefijo «ZZ Top») dentro del resultado.
--
-- Si un INSERT de fixtures falla por una columna obligatoria que no esté
-- contemplada aquí, ajustar ese INSERT: no es un fallo de la migración.

begin;

alter table public.resenas disable trigger trg_resenas_validar;
alter table public.ventas disable trigger trg_validar_venta;

create temp table _ctx (clave text primary key, id bigint) on commit drop;

-- Cuatro comercios: R3 (3 reseñas), R2 (2 reseñas), VIEJO (venta de hace 31
-- días), INACTIVO (reseñas y ventas, pero inactivo).
do $$
declare
  k text;
  cid bigint;
  sid bigint;
begin
  foreach k in array array['R3', 'R2', 'VIEJO', 'INACTIVO'] loop
    insert into comercios (nombre, activo) values ('ZZ Top ' || k, k <> 'INACTIVO') returning id into cid;
    insert into _ctx values ('c_' || k, cid);
    insert into sucursales (comercio_id, ciudad_id, nombre, activo)
    values (cid, (select min(id) from ciudades), 'Sede ' || k, true) returning id into sid;
    insert into _ctx values ('s_' || k, sid);
  end loop;

  for i in 1..3 loop
    insert into miembros (numero_membresia, nombres, apellidos, cedula)
    values ('ZZTOP000' || i, 'Socio', 'Top ' || i, '99900100' || i) returning id into cid;
    insert into _ctx values ('m_' || i, cid);
  end loop;
end $$;

-- Reseñas: R3 tiene 3 (5,5,4 -> 4,7), R2 tiene 2 (5,5), INACTIVO tiene 3 de 5.
insert into resenas (comercio_id, miembro_id, estrellas)
select (select id from _ctx where clave = 'c_R3'), (select id from _ctx where clave = 'm_' || n), e
from (values (1, 5), (2, 5), (3, 4)) as t(n, e);
insert into resenas (comercio_id, miembro_id, estrellas)
select (select id from _ctx where clave = 'c_R2'), (select id from _ctx where clave = 'm_' || n), 5
from generate_series(1, 2) as n;
insert into resenas (comercio_id, miembro_id, estrellas)
select (select id from _ctx where clave = 'c_INACTIVO'), (select id from _ctx where clave = 'm_' || n), 5
from generate_series(1, 3) as n;

-- Ventas: R3 una de hace 29 días (cuenta); VIEJO una de hace 31 (no cuenta);
-- INACTIVO una de hoy (no sale por inactivo).
insert into ventas (miembro_id, sucursal_id, valor_compra, valor_descuento, valor_final, metodo_registro, fecha_hora)
values
  ((select id from _ctx where clave = 'm_1'), (select id from _ctx where clave = 's_R3'), 1000, 0, 1000, 'numero', now() - interval '29 days'),
  ((select id from _ctx where clave = 'm_1'), (select id from _ctx where clave = 's_VIEJO'), 1000, 0, 1000, 'numero', now() - interval '31 days'),
  ((select id from _ctx where clave = 'm_1'), (select id from _ctx where clave = 's_INACTIVO'), 1000, 0, 1000, 'numero', now());

do $$
declare
  r record;
  n integer;
begin
  -- Calificados: R3 entra con 4,7 y 3 reseñas.
  select * into r from top_comercios_calificados(20) t
   where t.comercio_id = (select id from _ctx where clave = 'c_R3');
  if r.comercio_id is null or r.promedio <> 4.7 or r.total <> 3 then
    raise exception 'FALLO (calificados R3): se esperaba 4,7 con 3 reseñas, llegó % con %', r.promedio, r.total;
  end if;
  raise notice 'OK (calificados R3) entra con 3 reseñas y promedio 4,7';

  -- R2 (2 reseñas) no entra.
  select count(*) into n from top_comercios_calificados(20) t
   where t.comercio_id = (select id from _ctx where clave = 'c_R2');
  if n <> 0 then raise exception 'FALLO (calificados R2): entró con 2 reseñas'; end if;
  raise notice 'OK (calificados R2) con 2 reseñas no entra';

  -- Inactivo no sale en ninguna.
  select count(*) into n from top_comercios_calificados(20) t
   where t.comercio_id = (select id from _ctx where clave = 'c_INACTIVO');
  if n <> 0 then raise exception 'FALLO (calificados INACTIVO): salió un comercio inactivo'; end if;
  select count(*) into n from top_comercios_ventas(20) t
   where t.comercio_id = (select id from _ctx where clave = 'c_INACTIVO');
  if n <> 0 then raise exception 'FALLO (ventas INACTIVO): salió un comercio inactivo'; end if;
  raise notice 'OK (inactivo) no sale en ninguna lista';

  -- Ventas: la de hace 29 días cuenta; la de hace 31 no.
  select * into r from top_comercios_ventas(20) t
   where t.comercio_id = (select id from _ctx where clave = 'c_R3');
  if r.comercio_id is null or r.ventas <> 1 then
    raise exception 'FALLO (ventas R3): se esperaba 1 venta (hace 29 días), llegó %', r.ventas;
  end if;
  select count(*) into n from top_comercios_ventas(20) t
   where t.comercio_id = (select id from _ctx where clave = 'c_VIEJO');
  if n <> 0 then raise exception 'FALLO (ventas VIEJO): contó una venta de hace 31 días'; end if;
  raise notice 'OK (ventas) hace 29 días cuenta y hace 31 no';

  -- El límite por defecto es 5.
  select count(*) into n from top_comercios_calificados();
  if n > 5 then raise exception 'FALLO (límite calificados): devolvió % filas', n; end if;
  select count(*) into n from top_comercios_ventas();
  if n > 5 then raise exception 'FALLO (límite ventas): devolvió % filas', n; end if;
  raise notice 'OK (límite) sin parámetro no pasa de 5';
end $$;

rollback;
