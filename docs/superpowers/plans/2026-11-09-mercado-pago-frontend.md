# Mercado Pago · Plan de frontend

- **Fecha:** 2026-11-09
- **Estado:** Planeación. Nada implementado. Depende de las decisiones de §1 y de las preguntas de §8.
- **Par:** [`2026-11-09-mercado-pago-backend.md`](2026-11-09-mercado-pago-backend.md)

## 1. Decisiones que este plan ya asume

Las mismas que el plan de backend (§1 allí). Las que tocan la interfaz:

1. El alta sale de la **sección de precios** del portal público. Cada plan lleva a crear la cuenta con ese plan anotado.
2. Después de crear la cuenta, la persona entra al portal de miembros con sesión y paga ahí.
3. Renovación automática **activada por defecto**; el socio puede desactivarla.
4. Cancelar no corta el acceso: el carnet sigue vigente hasta la fecha de vencimiento.
5. Cobro rechazado: el socio ve el plazo para corregir la tarjeta (3 días) y, vencido, pierde el acceso.
6. Reingreso sin deuda: se muestra como una compra nueva, no como un pago atrasado.

## 2. Reglas del proyecto que aplican

Leer `CLAUDE.md` antes de tocar nada. Lo que más pesa aquí:

- **Formularios en overlay, no en página.** Registro, elegir plan, cambiar tarjeta, cancelar renovación: todos en `<Overlay>`. Escritorio: diálogo centrado. Móvil: hoja inferior.
- **Móvil y escritorio** usan el mismo componente.
- **Sin `style={{}}` para maquetar**, sin colores ni espaciados literales, todo con tokens.
- **Botón primario en el Portal de Miembros**: relleno dorado con texto en tinta **solo si** el par cumple 4,5:1 y 3:1, firmado por `accessibility-auditor`. Si no, tinta.
- **Sin `backdrop-filter` en filas**, sin `transition: all`, sin `ease-in`.
- **Ningún campo sin borde en reposo** (`--border-control`), y todo control con foco visible.
- **El portal de miembros va en claro** (`data-theme="light"`), ya fijado en su layout.
- **Campos de contraseña nueva** usan `CampoContrasenaNueva` y `motivoParaRechazar` (regla del proyecto).
- **Validación campo a campo** con `useValidacion` y las reglas de `lib/validacion/reglas.ts`.

## 3. Portal público: sección de precios

Ruta: la landing (`src/app/(publico)/`) y su sección de planes.

- Lee `planes_membresia` (solo los visibles y con `mp_plan_id`). Precio, duración y descripción, como hoy.
- Cada plan tiene un botón **«Quiero este plan»** que abre el **registro en overlay** con `?plan=<id>` en la URL. Si el visitante ya tiene sesión de socio, el botón lleva directo a elegir el pago.
- Estados del botón: plan no disponible (sin `mp_plan_id`) → deshabilitado con texto explicativo.
- El clic no navega: abre el overlay, por la regla de formularios.

### 3.1 Overlay de registro (público)

Campos: nombre, apellido, cédula, correo, teléfono (si se pide), contraseña.

- `CampoContrasenaNueva` con el medidor y los tres requisitos visibles. Mismo componente que en activar cuenta.
- Turnstile antes de enviar.
- Errores de servidor (correo ya existe, límite de intentos) en `ZonaAviso`, con el mismo texto para «correo existe» y «no existe» (no revelar cuentas).
- Al éxito: la ventana cambia a un paso «Revisa tu correo» o entra directo a la pantalla de pago, según la decisión §8.1.
- La ventana muestra el plan elegido arriba, con el precio, para que el visitante no pierda el contexto.

## 4. Portal de miembros: estados de la pantalla de inicio

El portal hoy asume que quien entra tiene membresía (`/miembros/inactiva` existe como caso aparte). Hay que tratar **cinco estados** explícitos, derivados en servidor con `esMembresiaVigente` y la gracia:

| Estado | Qué ve el socio |
|---|---|
| **Sin membresía** (cuenta creada, nunca pagó) | Planes disponibles con botón «Pagar». Sin carnet |
| **Pago en confirmación** (MP todavía no confirma) | «Estamos confirmando tu pago». Se actualiza sola al confirmarse. Sin carnet todavía |
| **Vigente** | Carnet con vencimiento. Renovación automática visible |
| **Vigente, renovación cancelada** | Carnet con vencimiento y «Tu membresía termina el …». Botón para volver a activar la renovación |
| **En gracia** (cobro rechazado) | Carnet vigente + banda con «No pudimos cobrar tu renovación. Actualiza tu tarjeta antes del …» y botón «Cambiar tarjeta» |
| **Vencida / cortada** | «Tu membresía venció el …». Planes para volver a entrar, sin deuda |

Reglas:

- El carnet solo sale en estados vigentes; nunca se pinta con datos de una membresía vencida.
- La banda de gracia usa **color y texto**, nunca solo color.
- Los cambios de estado llegan en servidor. El cliente no decide la vigencia.

## 5. Flujo de pago

### 5.1 Elegir plan y pagar

- Overlay «Elige tu plan»: lista de planes en tarjetas, el elegido con filo dorado de 1px y `aria-pressed`. Renovación automática con su interruptor, activado.
- Botón **«Pagar con Mercado Pago»**. Al pulsarlo se llama `iniciarSuscripcion(planId)` y se redirige a la URL de pago (o se monta Bricks, según §8.2).
- Mientras se crea la suscripción: botón con `Spinner` y deshabilitado, para no crear dos.
- Error de servidor → `ZonaAviso` dentro del overlay, sin cerrarlo.

### 5.2 Retorno desde Mercado Pago

Ruta `miembros/(portal)/pago/retorno`:

- **No confiar en los parámetros de la URL.** Muestra «Estamos confirmando tu pago» y consulta el estado real en servidor.
- Sondeo cada pocos segundos con tope (p. ej. 60 s) y luego un mensaje con botón «Revisar de nuevo». Sin sondeo infinito.
- Cuando el estado es vigente: animación corta de confirmación (el recibo de `acuse-venta` es referencia de estilo) y el carnet.
- Si MP dice rechazado: mensaje con «Intentar con otra tarjeta» y «Elegir otro plan».
- Respeta `prefers-reduced-motion`.

### 5.3 Pago pendiente

Si el pago queda pendiente (efectivo, PSE, etc., según §8.4), el estado «confirmando» se queda visible y dice el medio: «Tu pago de PSE está pendiente. Te avisaremos por correo.»

## 6. Gestión de la renovación (perfil)

Ruta `perfil` (la tarjeta de membresía ya existe). Una sección **«Renovación automática»** con:

- Estado en texto y punto: «Activa · se renueva el 12/12/2026» o «Desactivada · termina el 12/12/2026».
- **Interruptor** → abre overlay de confirmación, nunca cambia directo. El overlay dice qué pasa antes de confirmar.
- **Cambiar tarjeta** → overlay que explica que se abrirá Mercado Pago y vuelve al perfil.
- **Cancelar renovación** → overlay con motivo opcional (lista corta, sin obligar), texto claro: «Tu acceso sigue hasta el 12/12/2026. Después no se cobrará nada.»
- Ninguna de estas acciones borra la membresía ni devuelve dinero.

Móvil: hoja inferior con detents `medium`.

## 7. Carnet y perfil

- `carnet.tsx`: muestra la fecha de vencimiento con `Cifra`, en formato Colombia (`ahoraEnBogota`/`inicioDiaBogota` según las reglas de fechas; `fecha_fin` es civil y se formatea en UTC).
- Badge de estado: vigente / vence en N días (ámbar) / en gracia / cancelada-por-renovación. Cada uno con punto **y** texto.
- El número de miembro no cambia nunca, ni al reingresar: el carnet lo muestra igual.

## 8. Pendiente de confirmar (bloquea implementación)

1. **Tras registrarse:** ¿pantalla de pago directa o «Revisa tu correo» primero? (Depende de la activación de cuenta, plan de backend §9.5.)
2. **Flujo de pago:** redirección a Mercado Pago o Bricks dentro de ORUM. Con Bricks, el formulario de tarjeta se ve en el portal y cambia el diseño de §5.1.
3. **Medios de pago:** qué métodos se ofrecen en la pantalla, según lo que MP permita para suscripciones en Colombia.
4. **Pago pendiente:** qué medios lo generan y cómo se explica al socio.
5. **Reintentos:** el texto de la banda de gracia depende de la política de MP Colombia (plan de backend §9.1). Si MP reintenta de otra forma, cambia el texto y el plazo mostrado.

## 9. Panel de administración (cambios menores)

- En la ficha del miembro: **origen de la membresía** («Mercado Pago», «Presencial», «Cortesía») como texto junto al estado. Sin color como único portador.
- En `Miembros` y `Métricas`: las membresías de Mercado Pago cuentan como venta. Las cortesías siguen sin contar (regla vigente).
- Vista de la suscripción (estado de MP, gracia, renovación) en la ficha, solo lectura.
- El admin no cancela suscripciones de MP desde aquí en esta fase. Decisión a confirmar.

## 10. Vistas previas y verificación

- Vistas en `/dev/` con datos falsos, solo fuera de producción: `/dev/socio-pago` (los cinco estados de §4) y `/dev/socio-renovacion` (overlays de §6).
- Revisar a 320, 375, 390 y 1280 px con `/dev/panel-movil`-style: que nada se salga de su caja (`minmax(0,1fr)`, botones sin partir texto).
- `accessibility-auditor` firma el contraste del botón primario de pago y de la banda de gracia en **los dos temas que se usen** (el portal es claro, pero el cromo de cabecera en inicio es oscuro).
- `motion-ux-polish` solo como capa final, después de QA.
- Prueba real: un socio con sesión y una cuenta de MP de prueba. Mientras no exista, queda como deuda igual que el resto de portales sin sesión real.

## 11. Orden sugerido de implementación

1. Estados de §4 con datos de prueba (`/dev/`), sin cobro real.
2. Overlay de registro desde precios (§3), contra la acción de backend §3.3.
3. Pantalla de elegir plan y pagar (§5.1) con `iniciarSuscripcion` en modo de prueba.
4. Retorno y sondeo (§5.2).
5. Gestión de renovación en el perfil (§6).
6. Banda de gracia y estados de vencimiento (§4 completo).
7. Ajustes del panel (§9).
8. Pruebas de interfaz con socio real, accesibilidad y pulido de movimiento.

## 12. Flujo de registro y pago (decidido 11/11/2026)

Resuelve §8.1 («Revisa tu correo» primero) y amplía §3.1:

1. **Formulario** (§3.1): datos, términos y contraseña. Al enviar, `iniciarRegistro` (`src/app/(publico)/registro/actions.ts`) crea el usuario sin confirmar y envía el correo. La ventana pasa a «Revisa tu correo», con el plan elegido arriba.
2. **Ruta de confirmación** `/registro/confirmar?token_hash=…&type=signup`: al abrirla no canjea nada (un escáner de correo no debe gastar el enlace). La persona pulsa **«Confirmar mi correo»** y solo entonces se canjea el token y se abre sesión.
3. **Pantalla «Completa tu membresía»** (miembros, sin ficha): para quien entra sin haber pagado. Muestra el plan y el botón **Pagar**, que crea una suscripción nueva en Mercado Pago. Solo se muestra si `puedeAbrirPago` lo permite (correo confirmado y registro pendiente).
4. **Enlace vencido o ya usado:** mensaje claro y la vía para entrar con correo y contraseña. El reenvío del correo queda pendiente.
5. **Login de socios:** acepta número de socio o correo en el mismo campo.
