# Top de comercios en el Inicio del socio

Fecha: 29/10/2026 · Estado: borrador para aprobación

## Intención

Que el socio, apenas abre el Portal de Miembros, vea qué comercios están
mejor valorados y cuáles se están usando más, y pueda ir a su ficha. Sirve
para decidir dónde usar la membresía.

## Qué se construye

Un bloque «Top de comercios» en el Inicio del socio (`/miembros`), **entre el
aviso de novedades y los filtros del directorio**.

- Dos pestañas: **Mejor calificados** y **Más ventas**. Abre en «Mejor
  calificados».
- Cada pestaña muestra **solo 5 comercios**, en filas numeradas del 1 al 5.
- Cada fila: logo, nombre, categoría(s) y el dato a la derecha (`★ 4,9` o
  `128 ventas`). Al tocarla se abre la ficha del comercio
  (`/miembros/comercios/[id]`).
- **Mejor calificados:** promedio de estrellas de las reseñas, solo comercios
  activos con **al menos 3 reseñas**. Desempate: más reseñas, luego nombre.
- **Más ventas:** número de ventas registradas en la caja durante **el último
  mes**, solo comercios activos. Desempate: nombre.
- Si una pestaña tiene menos de 5 comercios que cumplan, muestra los que haya.
  Si no hay ninguno, la pestaña dice por qué en una línea (por ejemplo «Aún
  no hay comercios con 3 reseñas») y no se oculta el bloque. Si las dos están
  vacías, el bloque no se pinta.

## Lo que decidió el propietario

- Solo los 5 primeros, visible en la primera pantalla del socio.
- Diseño A: una lista con dos pestañas.
- Ventas: solo el último mes.
- Reseñas: mínimo 3 para entrar al top.
- Ubicación: entre el aviso de novedades y los filtros.

## Decisiones mías (por revisar)

- «Último mes» = los últimos 30 días corridos hasta ahora, con hora de
  Colombia, no el mes de calendario. Así el 1 de cada mes el top no queda
  vacío.
- Se cuenta el **número** de ventas, no el dinero. No se muestra cuánto
  factura cada comercio.
- Un comercio con 0 ventas en el mes no entra a «Más ventas».
- El nombre del comercio no cambia de lugar al cambiar de pestaña: solo la
  lista.
- No se anima la lista al cambiar de pestaña más que con un fundido corto
  (es algo que el socio ve a menudo; regla cero de movimiento).

## Fuera de alcance

- Top en el Portal Público, en Comercios o en el Panel.
- Más de 5 comercios, «Ver todos» o filtros por categoría o ciudad.
- Otros periodos (semana, año, histórico).
- Mostrar importes en dinero.
- Reseñas nuevas o cambios en cómo se reseña.

## Lo que sería un fracaso aunque funcione

- Que un comercio con una reseña de 5 estrellas aparezca arriba (por eso el
  mínimo de 3).
- Que se filtren datos de otros socios o ingresos de un comercio.
- Que el Inicio tarde más en abrir o se mueva al cargar el bloque.
- Que parezca otro estilo: usa los tokens y componentes del sistema (v6).

## Restricciones técnicas

- **Datos.** Un socio no puede leer `ventas` ni `resenas` de otros. Hace falta
  una función de base de datos (`security definer`, `stable`, ejecutable solo
  por `authenticated`) que devuelva, ya ordenado y limitado a 5, `comercio_id`
  y el dato (promedio y total, o número de ventas). Dos funciones o una con
  parámetro, a criterio de quien construya. Solo comercios
  `activo and deleted_at is null`. Migración nueva en `supabase/migrations/`,
  con su comprobación en `supabase/verificacion/`. **La migración se aplica a
  mano**: el código debe tolerar que aún no exista (el bloque no se pinta, el
  Inicio no se rompe), como ya hacen horarios y publicidad.
- **Lógica pura probada** en `src/lib/` (dominio `comercios/`): armar y
  ordenar filas, desempates, texto del dato, estados vacíos. El resto se
  verifica a mano.
- **Interfaz.** Componente nuevo en `src/components/comercios/` (lo usa el
  Inicio del socio; si otro portal lo pide, ya está en el sitio correcto).
  Pestañas con el patrón existente (`Pestanas` / `SegmentedControl`), logos con
  `ComercioLogo`. Sin trazo en reposo, sin sombra en filas, hover solo bajo
  `@media (hover: hover)`, objetivos táctiles ≥ 44 px, dato con texto
  (estrella más número, nunca color solo), foco visible. Estado de las
  pestañas en el cliente; la carga de datos, en el servidor
  (`MiembrosHomePage`, en paralelo con lo que ya pide).
- **Caché.** Los números pueden tener un retraso de minutos; no hace falta
  tiempo real.

## Queda a criterio de quien construya

- Forma exacta de la función SQL y del nombre de las pestañas en código.
- Alto exacto de las filas y cómo se comporta en 320 a 414 px y en escritorio.
- Si las pestañas son enlaces o botones (accesible en ambos casos).

## Cómo se comprueba

`tsc`, `eslint`, pruebas y `build` limpios. Mirar el Inicio en escritorio y
móvil con datos reales o de ejemplo: con 0, 1, 5 y más de 5 comercios; con
empates; con un comercio de menos de 3 reseñas que no debe entrar.
