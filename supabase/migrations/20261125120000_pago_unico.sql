-- =============================================================================
-- MERCADO PAGO · PAGO ÚNICO (preferencias)  ·  25/11/2026
-- -----------------------------------------------------------------------------
-- SE APLICA A MANO (Supabase → SQL Editor), después de aprobar el SQL.
-- Plan: docs/superpowers/plans/2026-11-09-mercado-pago-backend.md, §13.
--
-- Solo AÑADE. No borra ni cambia nada existente:
--   - `registros_pendientes.mp_preference_id`: id de la preferencia de pago único
--     del intento en curso (análogo a `mp_preapproval_id`, que sigue vivo para
--     la suscripción de prueba).
--   - `membresias.recordatorio_enviado_at`: marca que ya se envió el correo de
--     recordatorio de vencimiento (una sola vez por membresía).
--   - `pagos_mercadopago.suscripcion_id` ya admite nulos desde 20261109120000:
--     un pago único no necesita suscripción.
-- =============================================================================

alter table public.registros_pendientes
  add column if not exists mp_preference_id text null;

create unique index if not exists registros_pendientes_mp_preference_uq
  on public.registros_pendientes (mp_preference_id)
  where mp_preference_id is not null;

alter table public.membresias
  add column if not exists recordatorio_enviado_at timestamptz null;
