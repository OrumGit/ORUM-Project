-- ============================================================================
-- MERCADO PAGO · tablas y columnas base  ·  09/11/2026
-- ----------------------------------------------------------------------------
-- Modelo B (decidido): suscripción de la API de Suscripciones SIN plan
-- asociado, creada en `pending` y pagada desde el `init_point`.
-- La membresía nace solo cuando Mercado Pago confirma un cobro aprobado.
--
-- Esta migración solo CREA tablas, columnas, restricciones y RLS.
-- Las funciones de cobro (registrar_cobro_mp, etc.) van en otra migración.
--
-- Ids: `miembros`, `membresias` y `planes_membresia` son bigint (comprobado
-- en la base el 09/11/2026), así que las claves foráneas son bigint.
--
-- Se aplica a mano. Comprobación: supabase/verificacion/mercadopago_verificacion.sql
-- ============================================================================

-- 1. Cambios en tablas existentes ------------------------------------------

alter table public.planes_membresia
  add column if not exists mp_plan_id text null;

comment on column public.planes_membresia.mp_plan_id is
  'Id del preapproval_plan en Mercado Pago. Null = plan sin sincronizar.';

-- Origen de la membresía. Las existentes quedan como 'presencial' o
-- 'cortesia' según es_cortesia; no se reescribe ninguna fila.
alter table public.membresias
  add column if not exists origen text not null default 'presencial',
  add column if not exists pago_id bigint null;

alter table public.membresias
  drop constraint if exists membresias_origen_check;
alter table public.membresias
  add constraint membresias_origen_check
  check (origen in ('presencial', 'mercado_pago', 'cortesia'));

-- Una membresía de Mercado Pago debe apuntar al cobro que la pagó.
alter table public.membresias
  drop constraint if exists membresias_origen_mp_pago_check;
alter table public.membresias
  add constraint membresias_origen_mp_pago_check
  check (origen <> 'mercado_pago' or pago_id is not null);

-- 2. Tablas nuevas ----------------------------------------------------------

-- Una fila por suscripción de Mercado Pago (una por membresía con renovación).
create table if not exists public.suscripciones_mercadopago (
  id              bigint generated always as identity primary key,
  miembro_id      bigint not null references public.miembros(id),
  membresia_id    bigint null references public.membresias(id),
  preapproval_id  text not null unique,
  estado_mp       text not null,
  renovacion_activa boolean not null default true,
  gracia_hasta    date null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Un miembro tiene como mucho UNA suscripción con renovación activa.
create unique index if not exists suscripciones_mp_una_activa_por_miembro
  on public.suscripciones_mercadopago (miembro_id)
  where renovacion_activa;

create index if not exists suscripciones_mp_membresia_idx
  on public.suscripciones_mercadopago (membresia_id);

-- Una fila por cobro (authorized_payment o pago). payment_id es la clave de
-- idempotencia: un cobro no puede procesarse dos veces con efecto.
create table if not exists public.pagos_mercadopago (
  id              bigint generated always as identity primary key,
  suscripcion_id  bigint null references public.suscripciones_mercadopago(id),
  miembro_id      bigint not null references public.miembros(id),
  membresia_id    bigint null references public.membresias(id),
  payment_id      text not null unique,
  monto           numeric(12,2) not null check (monto >= 0),
  moneda          text not null default 'COP',
  estado_mp       text not null,
  status_detail   text null,
  periodo_desde   date null,
  periodo_hasta   date null,
  recibido_at     timestamptz not null default now(),
  procesado_at    timestamptz null,
  check (periodo_hasta is null or periodo_desde is null or periodo_hasta >= periodo_desde)
);

create index if not exists pagos_mp_suscripcion_idx
  on public.pagos_mercadopago (suscripcion_id);

-- Bitácora cruda de notificaciones. Se guarda ANTES de procesar.
create table if not exists public.eventos_mercadopago (
  id               bigint generated always as identity primary key,
  id_notificacion  text not null unique,
  tipo             text not null,
  accion           text null,
  live_mode        boolean not null default false,
  firma_valida     boolean not null,
  recibido_at      timestamptz not null default now(),
  procesado_at     timestamptz null,
  error            text null
);

-- 3. Seguridad --------------------------------------------------------------
-- Ninguna de las tres tablas se escribe con la sesión del navegador. Solo
-- service_role (server actions y webhook). RLS activa sin políticas: anon y
-- authenticated no leen ni escriben.

alter table public.suscripciones_mercadopago enable row level security;
alter table public.pagos_mercadopago         enable row level security;
alter table public.eventos_mercadopago       enable row level security;

revoke all on public.suscripciones_mercadopago from anon, authenticated;
revoke all on public.pagos_mercadopago         from anon, authenticated;
revoke all on public.eventos_mercadopago       from anon, authenticated;
