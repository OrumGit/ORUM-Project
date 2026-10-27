# Promociones de «solo primera compra» — borrador para confirmar con el cliente

> **Estado: BORRADOR, sin aprobar.** Nada de esto está implementado. Es el
> resumen de la conversación del 07/10/2026 para validarlo con el cliente antes
> de escribir la spec definitiva y el plan.

---

## 1. El problema

Cuando un comercio verifica a un socio, **no puede saber si ya ha comprado alguna
vez en su negocio**. Si una promoción aplica solo a la primera compra o visita,
el cajero no tiene forma de comprobarlo y la promoción se puede aplicar a
quien ya la usó.

## 2. Cómo funciona hoy (verificado en el código)

- La función `buscar_miembro_comercio` devuelve solo: nombre, número de
  membresía, vigencia y plan. **Nada del historial con ese comercio.**
- La tabla `ventas` ya guarda `miembro_id` y `sucursal_id` (y la sucursal
  pertenece a un comercio), así que **el dato para saber si es la primera vez
  existe**; solo no se consulta.
- La tabla `promociones` **no tiene ninguna marca** de «solo primera compra».
  Hoy esa condición solo podría escribirse como texto en la descripción.
- `fn_validar_venta` (la regla en la base que valida cada venta) **no comprueba**
  nada sobre el historial del socio.

## 3. Propuesta

Tres piezas que van juntas:

1. **Marca en la promoción.** Una opción «Solo primera compra» que el comercio
   (o el administrador) activa al crear o editar una promoción.
2. **Mostrarlo al cajero.** En la ventana de verificación del socio aparece:
   - «Primera vez en este comercio», o
   - «Ya ha comprado aquí» (con la fecha de la última compra).

   Las promociones marcadas como «solo primera compra» aparecen deshabilitadas,
   con el motivo escrito, si el socio ya compró.
3. **Bloqueo en la base.** Si alguien intenta registrar una venta con una
   promoción de primera compra y el socio ya tiene una venta en ese comercio,
   la venta se rechaza. Esto no se puede saltar aunque se llame a la API sin
   pasar por la pantalla.

**Por qué hace falta la marca:** bloquear solo por «ya compró alguna vez» sin
marcar nada bloquearía **todas** las promociones de cualquier socio recurrente,
que es el uso normal del club. La marca dice a cuáles se aplica la restricción.

Las promociones normales no cambian en nada.

## 4. Decisiones que debe confirmar el cliente

| # | Pregunta | Recomendación |
|---|---|---|
| 1 | ¿Qué cuenta como «haber ido antes»? **(a)** cualquier venta registrada en el comercio, con o sin promoción; **(b)** solo una venta en la que ya usó una promoción de ese comercio. | **(a)** — «ya vino» |
| 2 | ¿El historial se cuenta **por comercio** (todas sus sucursales juntas) o **por sucursal**? | **Por comercio**: la promoción pertenece al comercio |
| 3 | ¿Quién puede marcar una promoción como «solo primera compra»: el propio comercio, el administrador, o ambos? | Ambos, igual que el resto de campos de la promoción |
| 4 | Si una venta se anula o se corrige, ¿la persona vuelve a contar como «primera vez»? | Pendiente: hoy no hay un flujo de anulación que lo defina |
| 5 | Para las promociones ya existentes que dicen «primera compra» en su texto, ¿las marca alguien a mano o se deja así? | Marcarlas a mano; no se infiere del texto |

## 5. Alcance estimado (si se aprueba)

- **Base de datos:** una columna nueva en `promociones` y una comprobación nueva
  en `fn_validar_venta`; una forma de consultar «¿ya compró en este comercio?»
  (extender `buscar_miembro_comercio` o una función aparte).
- **Herramienta de Comercios:** la ventana del veredicto muestra el dato y
  deshabilita las promociones que ya no aplican.
- **Formulario de promoción:** la opción «Solo primera compra» (comercio y panel
  de administración).
- **Pruebas:** la lógica pura de «¿aplica la promoción?» con pruebas
  automatizadas; el resto, verificación manual.

## 6. Qué NO incluye

- Promociones con otros límites (una vez al mes, máximo N usos…). Si el cliente
  los quiere, es una ampliación aparte; esta marca no los cubre.
- Cambiar nada del estado de la membresía ni de cómo se calcula el descuento.

---

*Siguiente paso tras la respuesta del cliente: spec definitiva, plan de
implementación y, solo entonces, código.*
