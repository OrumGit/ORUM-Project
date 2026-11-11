# Mercado Pago · Plan de backend

- **Fecha:** 2026-11-09
- **Estado:** Planeación. Nada implementado. Depende de las decisiones de §1 y de las preguntas de §9.
- **Par:** [`2026-11-09-mercado-pago-frontend.md`](2026-11-09-mercado-pago-frontend.md)
- **Antecedente:** [`docs/mercado-pago-suscripciones.md`](../../mercado-pago-suscripciones.md) (investigación).

## 1. Decisiones que este plan ya asume

Tomadas con el propietario durante la conversación del 09/11/2026:

1. El socio crea su cuenta desde la sección de precios; el plan elegido viaja anotado.
2. El pago es una **suscripción de Mercado Pago con renovación automática**, activada por defecto. El socio puede desactivarla.
3. La membresía **nace solo cuando Mercado Pago confirma el cobro**, nunca al crear la cuenta.
4. Correos: pago confirmado, renovación cobrada y cobro rechazado.
5. Cobro rechazado: **3 días de gracia** contados desde el día del fallo. Vencida la gracia, el acceso se desactiva.
6. Cancelar la renovación: el acceso dura **hasta `fecha_fin`** de la membresía pagada.
7. Reingreso: **sin deuda**. Quien vuelve elige plan y paga desde el día del pago, con una membresía nueva en su historial y el mismo número de miembro.

Mi criterio, no confirmado por el propietario: los 3 días de gracia se cuentan **después de `fecha_fin`** (el socio ya pagó el periodo; la gracia cubre el cobro de la renovación siguiente). Si se cuentan desde otra fecha, cambia solo una función pura (§4).

## 2. Base de datos

Migraciones **aplicadas a mano**, cada una con su script de comprobación en `supabase/verificacion/`. Ninguna tabla se escribe con la sesión del navegador: solo `service_role`, como el resto de escrituras sensibles.

### 2.1 Cambios en tablas existentes

| Tabla | Cambio | Por qué |
|---|---|---|
| `planes_membresia` | `mp_plan_id text null` (id del `preapproval_plan` en MP) | Un plan de ORUM se corresponde con un plan de MP |
| `membresias` | `origen text not null default 'presencial'` con valores `presencial`, `mercado_pago`, `cortesia` | Métricas (`agruparMembresiasPorEmpleado`) y la bitácora deben distinguir el origen. Hoy existe `es_cortesia`; se conserva |
| `membresias` | `pago_id bigint null` → `pagos_mercadopago.id` | Trazabilidad de la membresía al cobro que la pagó. **Ids bigint** (comprobado en la base 09/11/2026), no uuid |

Nota: `membresias.estado` sigue sin leerse en crudo. La vigencia sigue saliendo de `esMembresiaVigente`.

### 2.2 Tablas nuevas

**`suscripciones_mercadopago`** — una por membresía con renovación automática.

- `id bigint identity pk`, `miembro_id`, `membresia_id` (la que está en curso o la última). Ids bigint como el resto del esquema.
- `preapproval_id text unique` — id de la suscripción en MP.
- `estado_mp text` — último estado reportado por MP (`pending`, `authorized`, `paused`, `cancelled`… según la documentación que falta confirmar, §9).
- `renovacion_activa boolean` — lo que el socio eligió; espejo de MP.
- `gracia_hasta date null` — fecha límite de acceso tras un cobro rechazado. Null = sin gracia activa.
- `created_at`, `updated_at`.

**`pagos_mercadopago`** — una fila por cobro (`authorized_payment` o pago único).

- `id uuid pk`, `suscripcion_id` (null en pago único), `miembro_id`, `membresia_id`.
- `payment_id text unique` — id del pago en MP. Es la **clave de idempotencia**.
- `monto numeric`, `moneda text default 'COP'`.
- `estado_mp text` (`approved`, `rejected`, `pending`…) y `status_detail text`.
- `periodo_desde date`, `periodo_hasta date` — periodo que cubre el cobro aprobado. Es la fuente de la vigencia.
- `recibido_at`, `procesado_at`.

**`eventos_mercadopago`** — bitácora cruda de notificaciones, para auditar y depurar.

- `id_notificacion text unique` (el `x-request-id`/`data.id` según corresponda), `tipo`, `accion`, `live_mode`, `firma_valida boolean`, `recibido_at`, `procesado_at null`, `error text null`.
- Se guarda **antes** de procesar: si el procesamiento falla, queda constancia y se puede reintentar.

### 2.3 Funciones de base de datos (`SECURITY DEFINER`, solo `service_role`)

- `registrar_cobro_mp(...)` — inserta o actualiza `pagos_mercadopago` por `payment_id` (upsert idempotente). Si el cobro está `approved`, crea o extiende la membresía en la **misma transacción** (ver §2.4).
- `activar_membresia_desde_cobro(pago_id)` — crea una membresía nueva si el miembro no tiene una vigente, o extiende `fecha_fin` si la tiene. Marca `origen = 'mercado_pago'`.
- `marcar_cobro_rechazado(...)` — fija `gracia_hasta = fecha_fin + 3 días` (ver supuesto §1).
- `cerrar_acceso_por_gracia(suscripcion_id)` — pasa la suscripción a estado cerrado; no toca la membresía (su `fecha_fin` ya la deja vencida).
- `cambiar_renovacion(suscripcion_id, activa)` — espejo local de la acción del socio.

### 2.4 Reglas de integridad

- Un `payment_id` no puede procesarse dos veces con efecto: el `unique` más el upsert lo garantizan.
- Una membresía nunca se crea sin `pago_id` cuando `origen = 'mercado_pago'` (CHECK).
- Un miembro tiene como mucho **una** suscripción MP con `renovacion_activa = true` (índice parcial único).
- `fn_validar_venta` (caja) sigue exigiendo membresía `activa` y vigente. No cambia.

### 2.5 Verificación

`supabase/verificacion/mercadopago_verificacion.sql`: comprueba los CHECK, el índice parcial, que un cobro duplicado no duplica membresías, que un cobro rechazado no crea membresía, y que `anon`/`authenticated` no pueden escribir en las tablas nuevas.

## 3. Pagos: Mercado Pago (servidor)

SDK oficial **`mercadopago`** (Node), solo en servidor, con el **Access Token** en variables de Vercel. Nunca en el repositorio.

Variables nuevas (`.env.example`):

- `MP_ACCESS_TOKEN` — por entorno (prueba y producción por separado).
- `MP_WEBHOOK_SECRET` — la clave secreta del panel de MP para validar firmas.
- `MP_PUBLIC_KEY` — solo si se usa Bricks (§9).

### 3.1 Módulo puro y probado (`src/lib/mercadopago/`)

Sin red, sin Supabase. Pruebas con Vitest.

- `estadoSuscripcion.ts` — mapea los estados de MP a acciones internas (activar, marcar gracia, cerrar, ignorar).
- `periodo.ts` — calcula `periodo_desde`/`periodo_hasta` y `gracia_hasta` a partir de fechas civiles (`YYYY-MM-DD`, con `Date.UTC` y formateo en UTC, según las reglas de fechas del proyecto).
- `firma.ts` — construye el *manifest* y compara el HMAC de `x-signature` (`ts`, `v1`) con tiempo constante. Rechaza `ts` fuera de una ventana razonable.
- `cliente.ts` — envoltorio fino del SDK para crear plan, crear suscripción, pausar/cancelar y consultar recursos. Recibe el token por parámetro.
- `mapeo.ts` — payload de MP → entrada de `registrar_cobro_mp`.

### 3.2 Acciones de servidor (server actions del portal de miembros)

Todas toman el miembro **de la sesión** (`requerirMiembro`), nunca del formulario.

| Acción | Qué hace |
|---|---|
| `iniciarSuscripcion(planId)` | Valida plan vigente, crea la suscripción en MP **de la API de Suscripciones** (`POST /preapproval`, **sin** `card_token_id`, con `status: pending`, `back_url` y `external_reference = miembro_id`), guarda `preapproval_id` y devuelve el link de pago de MP. **Modelo B (decidido 09/11/2026).** El campo de la respuesta que trae el link **no está confirmado en la documentación consultada** (§9.2) |
| `cambiarRenovacion(activa)` | `PUT /preapproval/{id}` con `status` = `paused`/`authorized`; espeja en `renovacion_activa` |
| `cancelarRenovacion()` | `PUT` con `status = cancelled`. El acceso sigue hasta `fecha_fin` (decisión §1.6) |
| `cambiarTarjeta()` | Redirige a MP para actualizar el medio de pago de la suscripción |
| `reingresarConPlan(planId)` | Igual que `iniciarSuscripcion`, pero con la membresía anterior ya vencida o cerrada |

Todas sueltan la caché necesaria y dejan constancia en `bitacora_actividad` cuando cambian algo de la suscripción.

### 3.3 Creación de cuenta pública

Hoy solo el admin crea miembros. Hace falta una acción pública de registro:

- `registrarseComoSocio(datos, planId?)` — valida con las reglas existentes (`lib/validacion/reglas.ts` y la política de contraseña `contrasena-segura.ts`), protege con **Turnstile** igual que los logins, crea el usuario de Auth y la fila de `miembros` con su número de registro (`numeros-registro.ts`), **sin membresía**.
- Control de abuso: límite por IP y por correo (capa 2 de rate limits ya existe; revisar qué cubre, §9).
- Idempotencia: si el correo ya existe, responde lo mismo que si no, para no revelar cuentas (y no envía nada distinto).
- Envía el correo de bienvenida/activación con el módulo de correo existente, si el flujo lo necesita. Decisión pendiente: si la cuenta se activa por enlace o queda activa al registrarse (§9).

## 4. Webhooks

Route Handler **`src/app/api/mercadopago/webhook/route.ts`**, `POST`.

Orden de operaciones (no se cambia):

1. **Leer el cuerpo crudo** y los headers `x-signature` y `x-request-id`.
2. **Validar la firma** (`firma.ts`). Firma inválida → **401**, y se registra en `eventos_mercadopago` con `firma_valida = false`.
3. **Guardar la notificación** en `eventos_mercadopago` (idempotencia por `id_notificacion`). Si ya existía, responder **200** sin procesar de nuevo.
4. **Responder 200 rápido.** MP da 22 s; el procesamiento real debe ser corto. Si el trabajo pesa, pasa a una cola o a un paso separado (decisión §9).
5. **Nunca fiarse del cuerpo:** consultar el recurso real en la API de MP (`/v1/payments/{id}` para cobros; el endpoint de su tópico para suscripciones).
6. Mapear el estado (`estadoSuscripcion.ts`) y llamar a la función de base de datos correspondiente (§2.3).
7. Marcar `procesado_at`, o `error` si falla.

Tópicos a suscribir (confirmar en §9): `subscription_preapproval`, `subscription_authorized_payment`, y `payment` como respaldo.

Dos URLs configuradas en MP: **una de pruebas y otra de producción**. Las URLs que se pasan al crear una suscripción pisan las del panel, así que hay que revisar cuál queda activa.

### 4.1 Efectos de cada evento (resumen)

| Evento de MP | Efecto en ORUM |
|---|---|
| Cobro aprobado | `registrar_cobro_mp` → crea o extiende membresía; `gracia_hasta = null`; **correo: pago confirmado / renovación cobrada** |
| Cobro rechazado | `marcar_cobro_rechazado` → `gracia_hasta`; **correo: cobro rechazado** con el plazo para corregir la tarjeta |
| Suscripción cancelada o pausada en MP | Espejo en `estado_mp` y `renovacion_activa`. No corta acceso por sí solo: el acceso lo decide `fecha_fin` y la gracia |
| Cobro recuperado durante la gracia | Igual que cobro aprobado; la gracia se anula |

## 5. Trabajo programado: cortes de gracia

No existe hoy ningún job que cierre vencimientos (`membresias.estado` no se actualiza sola). Hace falta uno, y no se apoya en MP:

- **Ruta cron** (Vercel Cron, diaria, protegida con `CRON_SECRET`) o `pg_cron` con llamada a función.
- Busca suscripciones con `gracia_hasta < hoy`, cierra el acceso, **cancela la suscripción en MP** (si no, MP sigue intentando cobrar) y deja la bitácora.
- Idempotente: volver a correrla no hace nada extra.

Decisión: si el job corre con retraso de horas, la vigencia no cambia (la deciden las fechas, no el job). Solo se retrasa el aviso de corte.

## 6. Correos

Módulo existente `src/lib/correo/correo.ts`. Se añaden tres constructores puros (`construirCorreoPagoConfirmado`, `construirCorreoRenovacionCobrada`, `construirCorreoCobroRechazado`) con la misma forma `{ asunto, html, texto }`, y el envío por `enviarCorreo` (best-effort).

- Que el correo falle **no** impide activar la membresía (el cobro ya ocurrió).
- Cada correo es idempotente por `payment_id` + tipo: si el webhook se repite, no se manda dos veces. Se registra en `eventos_mercadopago` o en una columna de envío.
- Ninguna plantilla usa palabras que los bloqueadores de anuncios oculten (regla del proyecto).

## 7. Seguridad

- Webhook: firma validada + consulta a la API antes de confiar en nada.
- Escrituras solo por `service_role` desde server actions y el webhook.
- Credenciales de MP solo en variables de entorno de Vercel. Revisar que `.env.local` no se suba (ya está en `.gitignore`).
- Protección del formulario de alta con Turnstile. Revisar límites de intentos.
- Auditoría: `auditoria-seguridad` y `auditoria-legal.md` existen en `docs/`; el flujo de datos personales (cédula, correo, método de pago) entra en esa revisión antes de salir a producción.
- Ningún dato de tarjeta pasa por nuestro servidor (Checkout/suscripción de MP). Si se usa Bricks (§9), el token de tarjeta sí llega al servidor: revisar PCI con esa opción.

## 8. Pruebas

- **Puras (Vitest, obligatorias):** `estadoSuscripcion`, `periodo`, `firma`, `mapeo`, y la regla de gracia.
- **SQL:** script de verificación de §2.5, con casos de cobro duplicado y de cobro rechazado.
- **Integración manual:** cuentas y tarjetas de prueba de MP Colombia. Recorrer: alta → pago aprobado → renovación → rechazo → gracia recuperada → gracia vencida → reingreso → cancelación con acceso hasta `fecha_fin`.
- **Webhook con firma real** en el entorno de pruebas, y una notificación repetida para comprobar idempotencia.

## 9. Pendiente de confirmar (bloquea implementación)

1. **Reintentos en Colombia (parcial, 09/11/2026):** la documentación general de suscripciones sin plan con pago autorizado indica hasta 4 reintentos en una ventana de 10 días, y la baja automática tras 3 cuotas rechazadas. Los ejemplos son en ARS; **falta confirmación específica de Colombia por escrito a MP.** Afecta a `estado_mp` tras los fallos y al momento de cancelar en MP.
2. **Flujo de pago (decidido: modelo B, 09/11/2026):** suscripción de la API de Suscripciones sin plan asociado, `status: pending`, y link de pago de MP. **Confirmado en prueba (09/11/2026):** la respuesta de `POST /preapproval` con `status: pending` trae el link en `init_point` (`https://www.mercadopago.com.co/subscriptions/checkout?preapproval_id=…&activation=true`). Además devuelve `id` (= `preapproval_id`), `status`, `external_reference` y `payer_email` vacío hasta el pago. **Pendiente:** comprobar que un comprador pueda pagar desde ese link **sin sesión de Mercado Pago** (ver nota de pruebas). Tampoco se ha confirmado si el plan asociado (`preapproval_plan`) sirve con el modelo B; por ahora se usa suscripción sin plan.
3. **Estados exactos y tópicos (parcial, 09/11/2026):** tópicos confirmados: `subscription_authorized_payment` (cobros recurrentes), `subscription_preapproval` (la suscripción) y `subscription_preapproval_plan`. Estados de cobro recurrente vistos: `processed`, `recycling`, `waiting for gateway`. Estados de suscripción vistos: `pending`, `authorized`. **Discrepancia sin resolver:** la gestión usa `canceled` en el `PUT`, y este plan escribía `cancelled`. Verificar contra la API antes de codificar.
4. **Producto:** se usa **Suscripciones** (API `/preapproval`), no **Planes de suscripción** (producto de panel sin integración). Corrección a la investigación previa: la referencia `subscription-plans/overview` es del producto de panel.
4. **Medios de pago recurrentes:** ¿PSE y Efecty sirven para cobro recurrente? Si no, la renovación solo es posible con tarjeta.
5. **Activación de cuenta:** ¿el socio activa su cuenta por correo (enlace) o queda activa al registrarse?
6. **Procesamiento del webhook:** ¿síncrono (dentro del Route Handler) o en cola? Depende del volumen esperado.
7. **Titular de la cuenta de MP** y credenciales de producción.
8. **Rate limits:** revisar qué cubre hoy la capa 2 antes de abrir el registro público.
9. **Membresías presenciales y de cortesía** siguen existiendo. Confirmar que el admin puede seguir registrando miembros sin pasar por MP.

## 10. Orden sugerido de implementación

1. Migración y verificación SQL (§2) — sin tocar código de usuario.
2. Módulo puro `src/lib/mercadopago/` con pruebas (§3.1).
3. Webhook con firma, idempotencia y bitácora (§4), contra el entorno de pruebas.
4. Funciones de base de datos de cobro (§2.3) y su conexión con el webhook.
5. Registro público sin membresía (§3.3).
6. Acciones del socio (§3.2) y cancelación con acceso hasta `fecha_fin`.
7. Job de cortes de gracia (§5).
8. Correos (§6).
9. Pruebas de punta a punta con MP de prueba (§8).

El frontend (`2026-11-09-mercado-pago-frontend.md`) se monta sobre el paso 5 en adelante.
