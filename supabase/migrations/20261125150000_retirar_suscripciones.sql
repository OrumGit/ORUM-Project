-- =============================================================================
-- MERCADO PAGO · RETIRAR EL FLUJO DE SUSCRIPCIONES  ·  25/11/2026
-- -----------------------------------------------------------------------------
-- Plan: docs/superpowers/plans/2026-11-09-mercado-pago-backend.md, §13 (fase 5).
--
-- Se quitan las funciones que solo servían a las suscripciones (renovación
-- automática, gracia de cobro rechazado, conciliación horaria) y las columnas
-- que solo ellas usaban. NO se borra la tabla `suscripciones_mercadopago`: se
-- conserva como historial (tiene 1 fila de prueba y `pagos_mercadopago` la
-- referencia por `suscripcion_id`).
--
-- Comprobado antes de aplicar: ninguna otra función, vista ni trigger usa estos
-- objetos; `membresia_con_acceso` ya no mira la gracia (20261125140000).
-- =============================================================================

drop function if exists public.activar_membresia_desde_cobro(bigint);
drop function if exists public.alta_socio_mercadopago(text);
drop function if exists public.cambiar_renovacion(bigint, boolean);
drop function if exists public.cerrar_acceso_por_gracia(bigint);
drop function if exists public.espejar_estado_suscripcion(text, text, boolean);
drop function if exists public.marcar_cobro_rechazado(bigint);
drop function if exists public.registrar_cobro_mp(text, text, numeric, text, text, text, date, date);
drop function if exists public.registrar_suscripcion_mp(bigint, bigint, text, text);

drop index if exists public.suscripciones_mp_conciliada_idx;

alter table public.suscripciones_mercadopago drop column if exists gracia_hasta;
alter table public.suscripciones_mercadopago drop column if exists conciliada_at;
