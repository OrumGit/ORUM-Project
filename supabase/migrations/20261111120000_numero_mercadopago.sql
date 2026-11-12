-- Número de membresía para socios de Mercado Pago (serie automática).
--
-- Formato: 8 dígitos = prefijo secuencial de 4 + sufijo aleatorio de 4.
-- - Cada prefijo da 10.000 números. Se usa el primer prefijo con algún sufijo libre.
-- - El prefijo 0009 está RESERVADO: es el bloque del pozo manual del administrador
--   (000900*). Esta función nunca lo devuelve.
-- - Un número está ocupado si existe en `miembros.numero_membresia` o en
--   `numeros_registro.numero`, sea cual sea su origen.
--
-- La función NO inserta al miembro: devuelve un número libre en el momento de la
-- llamada. Dos altas simultáneas pueden recibir el mismo número; la protección es
-- el índice único de `miembros.numero_membresia`. Quien llama debe insertar el
-- miembro y, si salta `unique_violation` (23505), volver a pedir número.
--
-- Mismo criterio que `src/lib/miembros/numero-mercadopago.ts` (prueba en Vitest).
--
-- NO APLICADA. Pendiente de confirmación antes de tocar la base.

create or replace function public.asignar_numero_mercadopago()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefijo   int;
  v_p         text;
  v_sufijo    text;
  v_ocupados  int;
begin
  for v_prefijo in 1..9999 loop
    -- 0009 reservado para el pozo del administrador.
    if v_prefijo = 9 then
      continue;
    end if;

    v_p := lpad(v_prefijo::text, 4, '0');

    select count(distinct n) into v_ocupados
    from (
      select m.numero_membresia as n
      from public.miembros m
      where substr(m.numero_membresia, 1, 4) = v_p
      union all
      select r.numero as n
      from public.numeros_registro r
      where substr(r.numero, 1, 4) = v_p
    ) ocupados;

    if v_ocupados >= 10000 then
      continue;
    end if;

    -- Sufijo libre elegido al azar entre los que quedan en este prefijo.
    select lpad(s::text, 4, '0') into v_sufijo
    from generate_series(0, 9999) as s
    where not exists (
      select 1 from public.miembros m
      where m.numero_membresia = v_p || lpad(s::text, 4, '0')
    )
    and not exists (
      select 1 from public.numeros_registro r
      where r.numero = v_p || lpad(s::text, 4, '0')
    )
    order by random()
    limit 1;

    if v_sufijo is not null then
      return v_p || v_sufijo;
    end if;
  end loop;

  raise exception 'sin_numeros_mercadopago' using errcode = 'P0001';
end;
$$;

-- Solo el backend (service_role) la llama. Ningún rol de cliente la ve.
revoke execute on function public.asignar_numero_mercadopago() from public, anon, authenticated;
grant execute on function public.asignar_numero_mercadopago() to service_role;
