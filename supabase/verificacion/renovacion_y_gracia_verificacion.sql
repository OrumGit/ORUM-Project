-- ============================================================================
-- VERIFICACIÓN · renovación desde fecha_fin y gracia de acceso  ·  18/11/2026
-- ----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor. Cada bloque va en su propia transacción y termina
-- en ROLLBACK: NO deja ningún cambio. Preview y producción comparten base, así
-- que no hay que ejecutar ningún bloque con COMMIT.
--
-- Usa la suscripción del registro 12 (la prueba de punta a punta del 17/11,
-- membresía 71). Si ese dato cambia, ajusta el preapproval_id.
--
-- Valores esperados con los datos del 18/11/2026:
--   · membresia 71 fecha_fin = 2026-12-17, plan mensual (1 mes)
--   · la renovación adelantada extiende a 2027-01-17 (fin vigente + 1 mes)
--     y NO a 2026-12-18 (hoy + 1 mes, que era el error).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- A. Renovación adelantada: el periodo nuevo empieza al terminar el vigente.
-- Resultado esperado: fecha_fin_despues = 2027-01-17
-- ----------------------------------------------------------------------------
begin;

with sus as (
  select id, miembro_id
  from suscripciones_mercadopago
  where preapproval_id = '1a6f4ded6b2c44029f9e933a3322bc4b'
),
ins as (
  insert into pagos_mercadopago
    (suscripcion_id, miembro_id, payment_id, monto, moneda, estado_mp)
  select id, miembro_id, 'verif-renovacion-' || to_char(now(), 'YYYYMMDDHH24MISS'), 30000, 'COP', 'approved'
  from sus
  returning id
),
activado as (
  select public.activar_membresia_desde_cobro((select id from ins)) as membresia_id
)
select
  activado.membresia_id,
  (select fecha_fin from membresias where id = 71) as fecha_fin_despues
from activado;

rollback;


-- ----------------------------------------------------------------------------
-- B. Gracia tras un cobro rechazado: el acceso dura hasta gracia_hasta.
-- Resultado esperado:
--   gracia_hasta              = 2026-12-20   (fecha_fin + 3)
--   acceso el 2026-12-19      = true         (dentro de la gracia)
--   acceso el 2026-12-20      = true         (último día de gracia)
--   acceso el 2026-12-21      = false        (la gracia venció)
-- ----------------------------------------------------------------------------
begin;

with sus as (
  select id
  from suscripciones_mercadopago
  where preapproval_id = '1a6f4ded6b2c44029f9e933a3322bc4b'
),
gracia as (
  select public.marcar_cobro_rechazado((select id from sus)) as gracia_hasta
)
select
  gracia.gracia_hasta,
  public.membresia_con_acceso(71, date '2026-12-19') as acceso_19,
  public.membresia_con_acceso(71, date '2026-12-20') as acceso_20,
  public.membresia_con_acceso(71, date '2026-12-21') as acceso_21
from gracia;

rollback;


-- ----------------------------------------------------------------------------
-- C. Sin gracia, la membresía vencida no da acceso.
-- Resultado esperado: acceso = false (no hay gracia abierta en esta transacción)
-- ----------------------------------------------------------------------------
begin;

select public.membresia_con_acceso(71, date '2027-01-10') as acceso_sin_gracia;

rollback;


-- ----------------------------------------------------------------------------
-- D. Estado actual real (solo lectura, no necesita transacción).
-- ----------------------------------------------------------------------------
select s.preapproval_id, s.estado_mp, s.renovacion_activa, s.gracia_hasta, s.membresia_id,
       m.fecha_fin, m.estado
from suscripciones_mercadopago s
left join membresias m on m.id = s.membresia_id
where s.preapproval_id = '1a6f4ded6b2c44029f9e933a3322bc4b';
