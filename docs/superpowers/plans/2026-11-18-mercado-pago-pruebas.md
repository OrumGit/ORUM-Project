# Mercado Pago · Plan de pruebas de renovación y gracia

- **Fecha:** 2026-11-18
- **Rama:** `feat/mercadopago-backend` (último commit subido: `f5b1dac`)
- **Par:** [`2026-11-09-mercado-pago-backend.md`](2026-11-09-mercado-pago-backend.md) (§9, puntos 3 a 6)

## 1. Qué se prueba y qué no

| Punto | Qué cambió | Cómo se prueba | Estado |
|---|---|---|---|
| 3. Renovación desde `fecha_fin` | `activar_membresia_desde_cobro` extiende desde el fin vigente | SQL (bloque A) | Pendiente de ejecutar |
| 4. Conciliación cada hora | Cron `conciliar-suscripciones` | `curl` (ya hecho: `ya_estaban: 1`) y, para `aplicadas_ahora`, sandbox (escenario C) | Parcial |
| 5. Gracia da acceso | `membresia_con_acceso`, caja, reseñas, portal | SQL (bloques B y C) y sandbox (escenario D) | Pendiente de ejecutar |
| 6. Limpieza del sandbox | Cancelar suscripciones de prueba | Manual, con confirmación | Pendiente de decisión |

**Fuera de este plan:** el webhook no recibe avisos de Mercado Pago (punto 1 de §9). Mientras siga así, toda renovación depende del cron.

## 2. Entorno y seguridad

- **Preview y producción comparten la misma base de datos.** Por eso:
  - Los bloques SQL van dentro de `begin … rollback`. No hay `commit` en ningún bloque.
  - Nunca se ejecuta un `update` o `insert` fuera de esas transacciones.
  - Los escenarios de sandbox solo crean datos en la cuenta de prueba de Mercado Pago.
- El cron de limpieza (`limpiar-pendientes`) **no se prueba** en preview: borra cuentas sin pago de la base compartida.
- Todo lo que se pruebe en el sandbox se cancela al final (sección 6).

## 3. Precondiciones

1. Deploy de `f5b1dac` en **Ready** en Vercel.
2. Migraciones aplicadas: `20261118120000` (renovación) y `20261118130000` (gracia).
3. `CRON_SECRET` configurado en Preview (ya confirmado con el `curl`).
4. Estado de partida, a comprobar con el bloque D de `supabase/verificacion/renovacion_y_gracia_verificacion.sql`:
   - Suscripción `1a6f4ded…`: `estado_mp = authorized`, `renovacion_activa = true`, `membresia_id = 71`.
   - Membresía 71: `fecha_fin = 2026-12-17`, `estado = activa`, `gracia_hasta` vacía.

## 4. Escenarios

### A. Renovación adelantada (SQL)

**Qué demuestra:** un cobro que llega antes del vencimiento suma desde el fin vigente.

1. Ejecutar el bloque A de `renovacion_y_gracia_verificacion.sql`.
2. **Esperado:** `fecha_fin_despues = 2027-01-17`.
3. **Si sale `2026-12-18`:** el error antiguo sigue vivo. No seguir; revisar que la migración `20261118120000` esté aplicada.
4. Confirmar que la transacción terminó en `rollback`: volver a ejecutar el bloque D y comprobar que `fecha_fin` sigue en `2026-12-17`.

### B. Gracia tras un cobro rechazado (SQL)

**Qué demuestra:** el acceso dura hasta `gracia_hasta` y después se corta.

1. Ejecutar el bloque B.
2. **Esperado:** `gracia_hasta = 2026-12-20`; acceso `true` el 19 y el 20; `false` el 21.
3. Confirmar el `rollback` con el bloque D: `gracia_hasta` debe seguir vacía.

### C. Sin gracia (SQL)

1. Ejecutar el bloque C.
2. **Esperado:** `acceso_sin_gracia = false` el 2027-01-10.

**Límite de este escenario:** prueba la función, no la caja. Para la caja hace falta una venta real con un socio de prueba (ver §5).

### D. Cobro rechazado de punta a punta (sandbox)

**Qué demuestra:** que Mercado Pago rechazado llega a ORUM y abre la gracia.

**Requiere confirmar antes de empezar:** qué tarjeta de prueba devuelve `rejected` en una suscripción en el sandbox de Colombia. La documentación de Mercado Pago lo indica; no está confirmado aquí. Anotar la tarjeta usada y el `status_detail`.

1. Crear una suscripción de prueba nueva con esa tarjeta (o forzar el rechazo en la siguiente cuota, si la cuenta lo permite).
2. Cuando Mercado Pago marque el cobro como rechazado, esperar a la siguiente conciliación (cron de cada hora) o llamar al `curl`.
3. **Esperado:**
   - `cuotas.rechazadas: 1` en la respuesta.
   - `gracia_hasta` de la suscripción = `fecha_fin` de su membresía + 3 días.
   - El socio puede entrar al portal mientras dure la gracia.

**Limitación:** solo es posible si la suscripción de prueba ya tiene una membresía asociada (el primer cobro debe estar aprobado). Si no, `gracia_hasta` no se escribe: `marcar_cobro_rechazado` devuelve `null` cuando no hay membresía.

### E. Conciliación que aplica un cobro nuevo (`aplicadas_ahora`) (sandbox)

**Qué demuestra:** que el cron aplica un cobro que el webhook no entregó.

Con el webhook sin entregas (punto 1), este caso ocurre solo. Para provocarlo a propósito:

1. Crear un registro de prueba, pagarlo con el comprador de prueba y dejar que se complete.
2. Confirmar en la base que el pago existe y `membresia_id` está llena.
3. Para la prueba con cobro nuevo hace falta una cuota de un periodo nuevo que aún no esté en `pagos_mercadopago`. **Esto no se puede esperar un mes.** Opción: pausar el webhook en el panel de Mercado Pago (apuntarlo a una URL que no responde), crear un cobro, restaurar el webhook, y correr el cron.
4. **Esperado:** `cuotas.aplicadas_ahora: 1` y un pago nuevo en `pagos_mercadopago` con `membresia_id` asociada.

**Decisión pendiente:** si se hace la opción de pausar el webhook. Requiere tocar la configuración del panel de Mercado Pago, y lo debe hacer quien tiene acceso.

## 5. Caja (manual, opcional)

Para comprobar que la caja acepta un socio en gracia hace falta:
1. Un socio de prueba con membresía en gracia (escenario D).
2. Una venta en un comercio de prueba.

Si no se puede preparar, se deja como pendiente. La regla de acceso ya está probada con los bloques B y C.

## 6. Limpieza

Al terminar:
1. Cancelar en el sandbox las suscripciones de prueba creadas para esta verificación. **No cancelar** `1a6f4ded…` hasta haber terminado A, B y C.
2. Confirmar en la base que no quedan pagos de prueba (`payment_id` que empiezan por `verif-`). Los bloques A y B hacen `rollback`, así que no deberían existir.
3. Anotar en la memoria el resultado de cada escenario.

## 7. Criterio para dar el punto por cerrado

- A, B y C pasan con los valores esperados.
- D y E se prueban en el sandbox, o se deja anotado por qué no se probaron.
- La caja, si se deja pendiente, queda anotada como pendiente.

## 8. Lo que aún no sabemos

- Tarjeta de prueba que devuelve `rejected` en suscripciones de Colombia.
- Si el sandbox permite forzar un cobro en un periodo nuevo sin esperar un mes.
- Si Mercado Pago reintenta las cuotas rechazadas, y cuándo (eso cambia cuándo se abre la gracia).
