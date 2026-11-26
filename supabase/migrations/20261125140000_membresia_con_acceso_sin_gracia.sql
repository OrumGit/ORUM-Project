-- =============================================================================
-- MERCADO PAGO · RETIRADA DE LA GRACIA (paso 1)  ·  25/11/2026
-- -----------------------------------------------------------------------------
-- Plan: docs/superpowers/plans/2026-11-09-mercado-pago-backend.md, §13 (fase 5).
--
-- Con pago único no hay cobro rechazado que abra una gracia: la membresía vence
-- en `fecha_fin` y el socio paga de nuevo. `membresia_con_acceso` deja de mirar
-- `suscripciones_mercadopago.gracia_hasta`. Su firma no cambia, así que la caja
-- (`registrar_venta`) y la reseña (`fn_validar_resena`) siguen llamándola igual.
--
-- No borra nada: la columna `gracia_hasta` y las funciones de gracia se quitan
-- en un paso posterior, cuando el código ya no las use.
--
-- Al aplicarla no cambia ningún acceso: la única suscripción de la base no tiene
-- gracia (`gracia_hasta` nulo).
-- =============================================================================

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
      and m.fecha_fin >= p_hoy
  );
$$;
