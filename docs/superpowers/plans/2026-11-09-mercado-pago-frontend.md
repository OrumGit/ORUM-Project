# Mercado Pago · Plan de frontend

- **Fecha:** 2026-11-09
- **Estado:** Parcial al 25/11/2026. El overlay de registro, el sondeo del retorno y «Completa tu membresía» ya existen en el código. Lo que falta, y la verificación en Preview, está en §15. Las secciones §13 y §14 son el histórico del traspaso del 19/11: su orden de trabajo ya no es el vigente.
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

## 13. Estado y lo que falta de interfaz (13/11/2026)

Lo que ya existe en el backend y en pantallas provisionales (`commit e91cd49`):

- **`/registro?plan=N`** (página provisional): formulario con datos, **ciudad** y **dirección** (obligatorias), contraseña y términos. Recibe el plan por la URL. Todavía **ningún enlace de la web lleva a ella**: la sección de precios no tiene el botón de elegir plan.
- **`/registro/confirmar`**: pide confirmar el correo; cuando ya está confirmado y el registro sigue pendiente, muestra el botón «Continuar al pago». Usa `PantallaAcceso` y un aviso sencillo, sin diseño final.
- **`/registro/pago/retorno`**: página de retorno provisional con dos textos (confirmando el pago / membresía activa). No sondea ni distingue rechazo, pago pendiente ni cancelado.

Lo que falta, en orden de prioridad:

1. **Overlay de registro desde precios (§3.1).** Sustituye a la página provisional. Debe abrirse desde el botón de cada plan, con el plan arriba, y llevar ciudad (lista con `SelectMenu`) y dirección. Sin esto, nadie puede llegar al registro sin escribir la URL.
2. **Pantalla «Completa tu membresía» en el Portal de Miembros (§12.3).** Quien entra con un registro pendiente (número o correo) debe ver el plan y el botón de pagar. Hoy solo existe en `/registro/confirmar`.
3. **Retorno de Mercado Pago (§5.2).** La `back_url` apunta a `/registro/pago/retorno`. Hay que decidir si vive ahí o en `miembros/(portal)/pago/retorno`, y añadir sondeo con tope de 60 s, «Revisar de nuevo» y mensajes de rechazo («Intentar con otra tarjeta», «Elegir otro plan»).
4. **Pago pendiente (§5.3).** Estado «confirmando» que indique el medio de pago cuando Mercado Pago lo devuelva como pendiente. Depende de confirmar los medios en un cobro real.
5. **Mensajes de error del alta.** Si la cédula ya es socio (`cedula_ya_es_socio`), la persona no debe ver un error genérico: hay que decidir el texto y el paso siguiente.
6. **Vistas previas en `/dev/`** para los estados de registro, confirmación y retorno, con datos falsos, antes de probar con pagos reales.
7. **Revisión de accesibilidad y móvil** de las pantallas nuevas (`accessibility-auditor`, `mobile-ux-specialist`) antes de darlas por terminadas.

Bloqueante de datos: el correo del comprador de prueba (`MP_PAGADOR_PRUEBA`, solo en el preview). Sin él no se puede probar el pago de punta a punta, y por tanto tampoco los estados 2 a 4.

### Estado al 18/11/2026

**Hecho**

- ✅ **Enlace de «Adquirir» a `/registro?plan=N`** (`abac71f`). Ya no abre WhatsApp. Sigue en la fachada, pero **el overlay no existe**: el botón abre la página provisional.
- ✅ **Pago de punta a punta en Preview.** Desde el formulario hasta la membresía activa, con el comprador de prueba. Es el bloqueante de datos que estaba en la lista de arriba: **resuelto**.
- ✅ **`/registro/pago/retorno` concilia la suscripción** (`07abeb7`): si el webhook no llegó, la página consulta las cuotas en Mercado Pago y completa el alta. Esto cambia la descripción de §13.3: la página ya no solo muestra un estado, también aplica el cobro. Su texto de «confirmando» sigue siendo provisional.
- ✅ **Mensajes de error del pago.** «No pudimos abrir el pago» se mantiene para fallos de creación. El detalle técnico va al log, no a la persona.

**Pendiente, en orden**

1. 🔴 **Overlay de registro desde precios (§13.1).** Sigue siendo prioridad: la página provisional `/registro` no está pensada para el público.
2. 🔴 **Retorno con sondeo (§13.3 y §5.2).** La conciliación está en el servidor, pero la pantalla no sondea: si el alta tarda, la persona ve «confirmando» sin reintentar. Falta el sondeo con tope de 60 s, «Revisar de nuevo» y los mensajes de rechazo.
3. 🟠 **Pantalla «Completa tu membresía» en miembros (§13.2).** Sigue sin existir fuera de `/registro/confirmar`.
4. 🟠 **Pago pendiente y rechazo (§5.3).** Hasta ahora solo se ha probado el pago aprobado. Falta confirmar los estados que devuelve Mercado Pago en un rechazo o en un pago pendiente, con el comprador de prueba.
5. 🟠 **Renovaciones en el perfil (§6).** Depende del webhook (ver backend): sin él, la pantalla no puede mostrar «se renueva el…» con datos reales.
6. 🟡 **Mensaje de `cedula_ya_es_socio` (§13.5).** Sigue pendiente de decidir el texto.
7. 🟡 **Vistas previas en `/dev/` (§13.6)** y revisión de accesibilidad y móvil (§13.7).

**Nota de cierre:** el backend de la membresía de punta a punta funciona en Preview. Lo que falta del frontend es presentación y estados de error, no el flujo de cobro. El webhook sigue siendo un pendiente del backend (ver `2026-11-09-mercado-pago-backend.md`, §10, «Estado al 18/11/2026»).

## 14. Traspaso a frontend (19/11/2026)

Esta sección es para quien implemente la interfaz. Resume qué ya está resuelto en el servidor, en qué orden conviene hacer el resto y qué espera a otra cosa. No cambia las decisiones de §1 a §13.

### 14.1 Lo que ya funciona y puedes dar por bueno

- **El cobro de punta a punta** en Preview: registro → confirmación de correo → pago en Mercado Pago → membresía activa. Probado el 17/11 con el comprador de prueba.
- **La conciliación desde el retorno**: `/registro/pago/retorno` aplica la suscripción si el webhook no llegó. Ver `src/lib/mercadopago/conciliar.ts`.
- **El acceso respeta la gracia** (19/11): un socio con cobro rechazado conserva el acceso hasta `gracia_hasta`. La puerta del portal (`requireMiembroVigente`), el carnet, el perfil y los listados ya lo tienen en cuenta. **La interfaz no tiene que recalcularlo**: usa `derivarEstadoMembresia` con la gracia que le pasan.
- **La renovación cuenta desde `fecha_fin`** (19/11). La pantalla de perfil puede mostrar el día de fin sin corregirlo.

### 14.2 Orden de trabajo

1. **Overlay de registro desde precios (§13.1).** Sustituye la página provisional `/registro?plan=N`. Sin dependencias de backend.
2. **Retorno con sondeo (§13.3 y §5.2).** Al volver de Mercado Pago, reintentar la consulta durante 60 s como máximo, mostrar «Revisar de nuevo» y los mensajes de rechazo. El servidor ya concilia; la pantalla solo consulta.
3. **«Completa tu membresía» en miembros (§13.2).** Para el socio que pagó a medias o no tiene membresía.
4. **Pago pendiente y rechazo (§5.3).** Construir con vistas previas en `/dev/`. La verificación real depende del escenario D del plan de pruebas.

Los puntos 1 a 3 pueden avanzar sin esperar a ninguna prueba del sandbox.

### 14.3 Lo que espera a otra cosa

- **Renovaciones en el perfil (§6):** necesita que el webhook funcione (punto 1 de la lista de backend). Sin él, «se renueva el…» no tendría datos reales.
- **Revisión de accesibilidad y móvil (§13.7):** al final, con las cuatro pantallas hechas. Pasar por `accessibility-auditor` y `mobile-ux-specialist`.

### 14.4 Decisión pendiente de producto

- **Texto del mensaje `cedula_ya_es_socio` (§13.5).** Lo decide el propietario. Hasta entonces, usar el texto provisional y dejarlo marcado en el código.

### 14.5 Reglas que no cambian

- Las pantallas de registro y pago se abren **como overlay**, no como página nueva (CLAUDE.md, «Formularios: overlay, no página»).
- Los estados de la membresía se leen **siempre derivados**, nunca `membresias.estado` en crudo.
- El oro no se usa como texto sobre fondo claro; el botón principal puede ser relleno dorado solo si cumple los dos ratios de contraste que indica CLAUDE.md.
- Antes de dar algo por terminado: `tsc`, ESLint y pruebas, y revisión visual en Preview.

### 14.6 Dónde mirar el backend

- Estado y decisiones: `2026-11-09-mercado-pago-backend.md`, sección «Estado al 19/11/2026».
- Pruebas pendientes: `2026-11-18-mercado-pago-pruebas.md`.

## 15. Estado al 25/11/2026

Esta sección sustituye al orden de trabajo de §13.7 y §14.2. Se escribió comprobando el código de la rama `feat/mercadopago-backend` (commits hasta `2a8fc7d`), no solo los commits de traspaso.

### 15.1 Ya existe en el código

| Punto del traspaso | Dónde está | Commit |
|---|---|---|
| §13.1 Overlay de registro desde precios | `src/app/(publico)/@modal/(.)registro/page.tsx` intercepta `/registro?plan=N`. El enlace de cada plan está en `(publico)/_components/membresias-publicas.tsx` | `afb5a03`, `2a8fc7d` |
| §5.2 y §13.3 Retorno con sondeo | `registro/pago/_components/estado-pago.tsx`: consulta cada 3 s, tope de un minuto, «Revisar de nuevo», vistas separadas para rechazado y pendiente | `afb5a03` |
| §13.2 «Completa tu membresía» | `src/app/(publico)/registro/completar/page.tsx`, con la lista de planes y el botón de pagar | `afb5a03` |
| Interfaz de registro, código y pago en una ventana | `registro/_components/ventana-registro.tsx`, `codigo-actions.ts`, `pagar/actions.ts` | `5cfa2ee`, `afb5a03`, `2a8fc7d` |

### 15.2 Sigue pendiente

1. **Mensaje de `cedula_ya_es_socio` (§13.5 y §14.4).** No hay ningún código que emita ni maneje ese caso en `src`. El texto lo decide el propietario.
2. **Verificación en Preview (§10).** Ningún punto de §15.1 se ha visto con sesión real en esta rama. Hay que recorrer el overlay, el sondeo y los estados de rechazo y pendiente con el comprador de prueba.
3. **Renovaciones en el perfil (§6).** Depende del webhook del backend (`2026-11-09-mercado-pago-backend.md`, §10).
4. **Accesibilidad y móvil (§13.7).** Pasar `accessibility-auditor` y `mobile-ux-specialist` sobre las pantallas de §15.1.
5. **Vistas previas en `/dev/` (§13.6).** Existe `/dev/pago`. No se ha comprobado si cubre los estados de rechazo y pendiente.

### 15.3 Orden sugerido a partir de hoy

1. Verificar §15.1 en Preview y registrar qué falla.
2. Decidir el texto de `cedula_ya_es_socio` con el propietario, e implementarlo.
3. Accesibilidad y móvil de las pantallas de §15.1.
4. Renovaciones en el perfil, cuando el webhook esté probado.

### 15.4 Nota sobre el traspaso del 19/11

El apartado §14 se escribió antes de los commits `afb5a03` y `2a8fc7d`. Su tabla de «lo que falta» ya no describe la rama. Se conserva como histórico.

### 15.5 Cambios del 25/11/2026 que afectan a esta lista

- **§6 (renovación automática en el perfil) queda retirado.** No hay interruptor, ni «cambiar tarjeta», ni «cancelar renovación», porque el modelo es pago único.
- **§5.3 (pago pendiente)** sigue vigente y ahora aplica a Efecty: el mensaje debe decir el medio y el plazo que muestra Mercado Pago.
- **La banda de gracia (§4, estado «En gracia») se elimina.** La gracia ya no existe en la base ni en el código.
- **Lo que falta de interfaz**: estados de vencimiento, mensaje de pago pendiente con Efecty, y la pantalla de renovación para socios agregados por el administrador (depende del backend, ver `2026-11-09-mercado-pago-backend.md` §14.2).
- La pantalla de retorno ya concilia pagos únicos. Falta revisarla con un pago real en Preview.
