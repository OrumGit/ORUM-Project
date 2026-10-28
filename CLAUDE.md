# ORUM — Reglas de diseño e interfaz

> **Lee esto antes de tocar una sola línea de interfaz.**
>
> Este archivo lo carga Claude Code automáticamente al abrir el proyecto. Existe
> porque ya pasó una vez: dos sesiones trabajaron en paralelo y construyeron dos
> sistemas de diseño incompatibles sobre los mismos archivos.
>
> **Dirección de arte vigente: v6 — «negro, crema y oro cálido»**, fijada
> el 22/09/2026 a partir de la guía de marca entregada por el cliente. Lo
> aplicado y lo medido está en
> [`.claude/docs/log/v6-crema-oro.md`](.claude/docs/log/v6-crema-oro.md).
>
> **Reemplaza formalmente a la v5** ([`.claude/docs/log/v5-negro-oro.md`](.claude/docs/log/v5-negro-oro.md),
> 15/09/2026), que había ido en la dirección contraria en las dos cosas que
> esta versión deshace. No es un vaivén de gusto de sesión: la v6 viene de una
> identidad de marca real del cliente (logo, paleta y tipografía nombrados por
> archivo), no de una preferencia de quien programaba ese día.
>
> Hereda de la v3, la v4 y la v5 todo lo que no nombra —la sombra en vez del
> trazo, el oro como respuesta al toque, las franjas tonales, las curvas y
> duraciones, la disciplina de los cuatro trabajos del oro— y cambia dos cosas
> de raíz, las mismas dos que la v5 había cambiado, ahora en la dirección
> opuesta:
>
> 1. **Los neutrales claros pasan de NEUTROS a CÁLIDOS**: el blanco puro de la
>    v5 vuelve a ser un crema (`#FAF6EC`). La franja negra **sigue siendo
>    negra en los dos temas** —eso NO cambia— y de hecho se corrigió un bug
>    real donde en tema claro no lo era (ver «Tonalidades» y el log v6, §3).
>    El oro **no se tocó**: se calibró el crema alrededor del oro ya probado.
> 2. **Dos familias tipográficas**: Playfair Display (títulos, vía
>    `--font-display`) + Montserrat (texto, vía `--font-sans`). El serif de
>    display vuelve al sistema, por nombre, porque la guía de marca del
>    cliente lo pide así.
>
> ⚠️ **Queda DEROGADA**: la regla de «una sola familia tipográfica» de la v5.
> Si la encuentras escrita en algún sitio, ese sitio está sin actualizar.
>
> ⚠️ **Los antiguos `--cacao-*` se llaman ahora `--negro-*` (tres crudos) y
> `--franja-*` (los semánticos).** Son la franja negra, en los dos temas, sin
> excepción. Renombrados el 16/10/2026 (ver «Deuda conocida» #6); si encuentras
> un `--cacao-*` en un documento, ese documento está sin actualizar.
>
> Cada dirección sustituye a la anterior
> ([`.claude/docs/DIRECCION-ARTE-v4.md`](.claude/docs/DIRECCION-ARTE-v4.md),
> [`.claude/docs/DIRECCION-ARTE-v3.md`](.claude/docs/DIRECCION-ARTE-v3.md),
> [`.claude/docs/DIRECCION-ARTE-claro.md`](.claude/docs/DIRECCION-ARTE-claro.md))
> **solo en lo que dice**; lo que no nombra sigue vigente. El detalle del porqué
> de cada decisión previa está en
> [`docs/superpowers/specs/2026-08-04-rediseno-visual-orum-design.md`](docs/superpowers/specs/2026-08-04-rediseno-visual-orum-design.md).
>
> Y las restricciones que el propietario levantó —presupuesto del oro, «serif
> solo en h1», sombra solo como jerarquía— están en
> [`.claude/docs/LICENCIA-CREATIVA-v4.md`](.claude/docs/LICENCIA-CREATIVA-v4.md),
> que **sigue vigente**. Lo que ahí NO se levantó es el contraste AA.
>
> Si algo de este archivo y algo de ese documento se contradicen, **gana este
> archivo**: aquí es donde la dirección se traduce a reglas, y aquí es donde se
> arregla la contradicción.

---

## Lo que ORUM es

Club de beneficios por membresía. Dos ejes que no se deben confundir:

- **El producto no es binario.** `planes_membresia` sostiene varios planes con
  precio y duración propios (`precio numeric`, `duracion_meses integer`), y
  `membresias.plan_id` apunta a uno de ellos. Que el carnet muestre `plan.nombre`
  (`src/app/miembros/(portal)/perfil/page.tsx:72`) es correcto, no un defecto.
- **El estado de la membresía sí es binario: vigente o no.** Se deriva siempre
  con `derivarEstadoMembresia` — ver "Estado de membresía" más abajo, que **no
  cambia** con esta revisión.

Cuatro portales: Público, Miembros, Administración y Herramienta de Comercios.

---

## Las cuatro reglas que mandan

Cuando dos opciones compitan, gana la que esté más arriba:

1. **Menor número de clics.** Si un formulario cabe en un overlay, no crea una página.
2. **Rendimiento.** Fluidez a 60fps, respuesta bajo 100ms.
3. **Buenas prácticas.** Accesible, tipado, sin regresiones.
4. **Detalle.** Animación, loader, micro-respuesta. Es lo que separa "correcto" de "caro".

---

## Prohibiciones duras

Romper cualquiera de estas es un bug, no una preferencia.

| Nunca | Por qué |
|---|---|
| `className="orum-*"` | Esa capa se eliminó. No existe. |
| Valores literales de color, espaciado, radio o duración | Todo sale de `src/styles/tokens.css` vía `var(--…)` |
| `style={{ … }}` para maquetar | Los estilos van en `.module.css`. Solo se admite inyectar tokens dinámicos. |
| Animar `width`, `height`, `top`, `left`, `margin` | Recalcula layout cada fotograma. Solo `transform` y `opacity`. **Única excepción: las View Transitions** — ver «Movimiento». |
| `transition: all` | Anima propiedades que no sabes que existen, incluidas las caras. Enumera. |
| `ease-in` en interfaz | Empieza lento justo en el instante que el usuario más mira. El token se eliminó. |
| Que algo entre desde `scale(0)` | En el mundo real nada aparece de la nada. Desde `0.95` + `opacity: 0`. |
| Una **tercera** familia tipográfica | v6: Montserrat (`--font-sans`) y Playfair Display (`--font-display`), y ninguna más. El serif solo entra por `--font-display`. |
| `--gold-400` o `--gold-500` sobre una superficie clara | 1,61:1 y 2,03:1. Ni el 3:1 de texto grande. El oro brillante **solo vive sobre negro**. |
| `none` dentro de una lista de sombras | Invalida la declaración ENTERA en silencio. Usa `0 0 rgba(0,0,0,0)`. |
| `outline: none` sin sustituto | Deja la interfaz sin foco visible. |
| Color como único portador de significado | Siempre punto/icono **+ texto**. |
| `backdrop-filter` en filas de lista | Destroza el scroll en gama media. Solo en cromo fijo. |
| Que un formulario ponga su propia tarjeta | La superficie la pone quien lo usa. |
| Un **trazo en una superficie en reposo** | Lo que define una tarjeta, un modal, un menú, un toast o una tabla es **la sombra**. Si no se ve, sube de sombra — no le pongas borde. |
| Poner **sombra a un chip, una píldora o una fila de lista** | Es el modo de fallo de esta dirección: todo flota y nada pesa. **Flota solo lo que el dedo puede levantar.** |
| Quitar el borde a algo interactivo **sin dejarle foco visible** | Una sombra suave no cumple el 3:1 de WCAG 1.4.11 en el límite de un control. El foco es lo que sostiene ese criterio. |
| Quitarle el borde en reposo a un **campo de formulario** | La regla «sin bordes» es para **superficies**, no para controles de entrada: un `<input>` vacío sobre blanco puro es invisible. |
| Distinguir **una superficie de su fondo** con un tinte | Eso lo hace la sombra. La franja tonal (`--surface-alt`) separa **secciones**, que es otra cosa: a 1,08:1 no despega una tarjeta de nada. |
| Un **segundo grosor** de trazo | 1px, y punto. El único 2px del sistema es el de `:focus-visible`. |
| Sombra o desplazamiento animados en **filas de lista** | Se paga en móvil de gama media, que es donde más filas hay. Ahí el feedback es **opacidad**. |
| `:hover` **fuera de** `@media (hover: hover)` | En táctil el hover se queda pegado tras el toque. |

---

## Blanco, luz y sombra

La frase entera: **crema, ninguna línea, luz y sombra — y el oro aparece cuando
tocas algo.** El crema no es un fondo, es el material. Lo que lo separa en capas
es la luz.

### El crema no tiene escalones

En tema claro **`--bg`, `--surface` y `--surface-sunk` son el mismo `--w-0`**
—que desde la v6 es un **crema cálido `#FAF6EC`**; el blanco puro `#FFFFFF` de
la v5 queda retirado, no por volver a la v4 (aquel papel `#FDFCFA` era casi
blanco con un susurro cálido; este crema es visiblemente crema, a propósito,
porque así lo pide la guía de marca del cliente)—. La separación entre
superficies **no la da un gris más claro ni un trazo**: la da la sombra. Eso
no cambió con la v6 ni cambiará con la próxima versión que toque el color: es
el principio que sobrevive a cualquier paleta.

⚠️ **Esto NO lo derogan las franjas tonales**, y confundirlo es el error fácil:
`--surface-alt` separa **secciones**, no superficies. Dos franjas a 1,04:1 (v6;
era 1,08:1 en la v5) no despegan una tarjeta de su fondo — eso lo sigue
haciendo la sombra, y solo la sombra.

Consecuencia directa y buscada: **si una superficie no tiene sombra,
desaparece.** Cuando algo «se pierde» sobre el fondo no es un fallo del token:
es que a esa superficie le falta su escalón. **La respuesta es subir de sombra,
nunca devolverle un borde.**

⚠️ **DESDE EL 29/09/2026, NINGÚN TINTE AL APUNTAR NI AL ELEGIR** (encargo del
propietario: «prefiero que quede sin fondo y simplemente haga alguna
animación», para todos los componentes). `--surface-hover` vale
`transparent` en todos los temas y ámbitos, y las opciones elegidas de los
menús ya no llevan `--gold-bg`. La respuesta al apuntar es **movimiento**:
los textos y enlaces suben 1–2px (`translate`), las filas de menú se deslizan
3px, las X de cerrar giran 90°, los iconos de campo crecen, los anillos de
«Así funciona» suben y crecen. Las filas de `DataList` no se mueven (regla de
listas largas): solo cursor y acuse de pulsación por opacidad. Lo elegido se
dice con filo dorado, check, peso y `aria-*` — nunca con un relleno. **No
reintroducir un fondo de hover en un componente nuevo.** El párrafo que sigue
describe el tinte que había y por qué necesitaba segundo canal; el segundo
canal sigue siendo obligatorio, ahora como único canal visible.

La única excepción que conservaba tinte era `--surface-hover`. **Es deliberadamente
tenue: 1,07:1 sobre crema** (v6; era 1,13:1 sobre blanco puro en la v5 — la
mezcla de tinta bajó de 6 % a 3,5 % porque al 6 % el filo dorado de
`Button variant="brand"` caía bajo el 3:1 de 1.4.11 contra este hover; ver
`.claude/docs/log/v6-crema-oro.md`). Por eso, donde el hover o la selección
sean la ÚNICA señal —fila de menú, opción de la paleta de comandos, destino
activo—, **hace falta un segundo canal**: el filo dorado que aparece
(`box-shadow: inset`, que no mueve la caja), las acciones que se revelan, o
`aria-current`. Nunca el color solo.

Un hundido **se hunde**: `--shadow-hundida`, que es una sombra `inset` — la misma
luz entrando al revés. No es un escalón negativo de la escala, porque no existe
tal cosa. Los dos únicos sitios donde el relleno sigue siendo información —y por
eso existe `--surface-hueco`— son el esqueleto de carga y el carril de la barra
de progreso: perfilar un esqueleto dibujaría el contorno exacto del contenido que
aún no ha llegado, y un esqueleto no debe prometer una forma que puede no
cumplirse.

### Fuera el trazo, y cómo se retiró

**Ninguna superficie lleva borde en reposo.** No se consiguió con
`border: none`, y el matiz importa: cada superficie declara

```css
border: 1px solid var(--border-superficie); /* vale `transparent` */
```

Dos cosas se ganan con eso. La caja **mide lo mismo** con filo y sin él, así que
devolverlo no desplaza un píxel. Y `@media (prefers-contrast: more)` los devuelve
**cambiando un token en un solo sitio** (`globals.css`, al final), lo que alcanza
también a los componentes que se escriban mañana. Una media query por módulo se
rompe el día que alguien la olvida, y el fallo es invisible para quien no usa ese
modo.

Lo que queda de trazo, y para qué:

| Token | Valor en claro | Ratio sobre crema (v6) | Para qué |
|---|---|---|---|
| `--border-superficie` | `transparent` | — | El filo de una superficie. **Transparente en reposo**; lo repone `prefers-contrast: more` |
| `--border` | tinta al 55 % | 4,08:1 | Divisiones **dentro** de una superficie (cabeceras, pies, `Divider`), cromo fijo del shell, y el **borde en reposo de un control de entrada** |
| `--border-subtle` | tinta al 22 % | 1,62:1 | Hairlines de fila. No define nada |
| `--border-strong` | tinta plena | 17,47:1 | **Ya no se usa.** Es el valor al que alto contraste devuelve `--border-superficie` |

✅ **El borde en reposo de un control de entrada es `--border-control`, no
`--border`.** En claro valen lo mismo; en OSCURO `--border` da 1,92:1 contra la
tarjeta y reprobaba 1.4.11, así que el control sube a `--n-500` (3,19:1) sin
engordar los divisores. **Los criterios se comprueban por tema.**

**Grosor: 1px.** El 2px de «superficie principal» de la v2 desapareció con el
trazo. El único 2px que queda en el sistema es el de `:focus-visible`.

### Las dos excepciones, que no son negociables

1. **Un campo de formulario conserva borde en reposo.** `Input`, `Select`,
   `Textarea`, `Checkbox`, `Radio` y `Button secondary`. Sin él no hay forma de
   saber dónde se escribe. Va a `--border` (4,08:1 en claro, v6), por encima
   del 3:1 de WCAG 1.4.11. **En oscuro no llega**; ver el aviso de arriba.
2. **Todo control que recibe foco lleva su filo en `:focus-visible`.** Una sombra
   suave **no cumple** el 3:1 que 1.4.11 exige en el límite de un control
   interactivo. El foco no es decorativo: es lo que sostiene el criterio ahora
   que el borde en reposo se fue. Si quitas un borde y no dejas foco visible, has
   roto accesibilidad.

### La sombra hace todo el trabajo, así que tiene que poder

**Dos capas por escalón**: un contacto corto y oscuro que ancla el objeto al
fondo, y un halo amplio y muy suave que le da volumen. Lleva el tinte
`rgb 10/10/14` desde la v5, y **la v6 no lo tocó**: el crema nuevo no cambió
la temperatura de la sombra, solo la del fondo sobre el que se ve. El
principio sigue siendo el mismo —la sombra hereda la temperatura de la
paleta, nunca la contraria.

**Las geometrías y las opacidades no se tocaron** desde W1, ni con la v5 ni
con la v6. Sobre el crema se ven parecido a como se veían sobre el blanco
puro de la v5 — el salto grande fue el de la v4 (papel cálido) a la v5
(blanco puro); el de la v6 (blanco puro → crema) es menor.

**Regla de grosor: la superficie grande se lee más gruesa.**

| Peldaño semántico | Escalón | Quién |
|---|---|---|
| — | ninguno | chip, píldora, badge, fila de lista, segmento |
| `--shadow-card` | 1 | tarjeta, tabla, fila-tarjeta en móvil |
| `--shadow-raised` | 2 | tarjeta principal, tarjeta apuntada |
| `--shadow-flotante` | 3 | menú, toast, popover |
| `--shadow-overlay` | 4 | modal, hoja, paleta de comandos |

Más `--shadow-press` (el contacto sin el halo: lo que queda bajo el dedo) y
`--shadow-hundida` (la `inset`).

**La escala subió en W1 (14/09/2026)**: la primera v3 acertó la gramática y se
quedó corta de amplitud — sobre papel blanco la tarjeta no se despegaba, que es
la premisa entera de esta dirección. Se subió **extensión antes que opacidad**
(el halo desenfoca 1,5–2,5x más; la opacidad sube bastante menos en
proporción), porque una sombra concentrada y opaca se lee como cerco gris y la
misma cantidad de negro repartida sobre el doble de radio se lee como volumen.
Si el gris se ve **como gris**, alguien subió opacidad donde tocaba subir radio.
Valores exactos y razonamiento: `tokens.css` §6.

**Pide siempre el token semántico, nunca `--shadow-3` crudo.** Los crudos no se
remapean por tema: `Menu` y `Toast` pedían el crudo y en tema oscuro no tenían
sombra alguna.

**La prohibición de `none` en listas de sombras importa ahora el doble**, porque
**todos** los escalones tienen dos entradas. Un `none` dentro invalida la
declaración ENTERA en silencio y la pantalla se queda sin una sola sombra.
`--edge` sigue valiendo `0 0 rgba(0,0,0,0)`. Un `box-shadow: none` que sea el
valor **completo** de la declaración sí es legal.

### La disciplina de la sombra: el riesgo real

La v2 fallaba por cuadrícula de cajas. **Esta falla por lo contrario: que todo
flote y nada pese.** Si cada tarjeta, cada chip y cada píldora lleva sombra, la
pantalla es una sopa de objetos levitando y se pierde la jerarquía igual que se
perdía con los bordes.

**La sombra es jerarquía, no decoración. Un chip no lleva sombra. Una fila de
lista no lleva sombra. Flota lo que el dedo puede levantar.**

Si al mirar una captura todo parece despegado del fondo, **sobran sombras — y la
respuesta es quitar, no añadir oro.**

### El tema oscuro NO se retira

Priorizar el claro no es eliminar el oscuro: el menú de tema existe, hay usuarios
con la preferencia puesta y `prefers-color-scheme` sigue mandando en quien no ha
elegido.

⚠️ **Excepción: el Portal Público va SIEMPRE en claro** (encargo del
propietario, 25/09/2026). La fachada la ve gente en todo tipo de
dispositivos, y con el modo oscuro puesto las franjas crema salían negras.
`(publico)/layout.tsx` fija `data-theme="light"` en su envoltorio —la
contraparte del `data-theme="dark"` de `PantallaAuth`—, así que ahí no
aplican ni la preferencia del sistema ni el tema elegido.

⚠️ **Y el Portal de Miembros también, desde el 29/09/2026** (mismo encargo,
mismo motivo: con el teléfono en modo oscuro las franjas crema del rediseño
salían negras). `miembros/(portal)/layout.tsx` fija `data-theme="light"` en
`.portal`, que además pinta su propio `background-color`/`color` —el `body`
sigue con el tema del documento—, y el menú de la cuenta ya no ofrece
selector de tema. La cabecera de Inicio es la única pieza oscura, con su
propio `data-theme="dark"`. Y su fondo es **blanco puro**
(`--blanco`, no el crema `--w-0`): `publico.module.css` remapea `--w-0` en
la fachada; las franjas tintadas siguen en crema.

⚠️ **Y la Herramienta de Comercios, desde el 04/10/2026** (encargo del
propietario: «vamos a rediseñar comercios; utiliza el estilo del portal
inicial y miembros, sus reglas, colores y estilo»). `comercios/(portal)/layout.tsx`
fija `data-theme="light"` y **no copia el cromo: importa el del Portal de
Miembros** (`miembros/(portal)/portal.module.css`), así que la cabecera
negra fundida, el fondo blanco y la paleta de la fachada son los mismos por
construcción. El selector de tema que vivía en el menú del avatar se retiró
con el menú.

⚠️ **Y el Panel de Administración, desde el mismo 04/10/2026** (encargo:
«un rediseño total, con el mismo estilo que el portal inicial, comercios y
miembros, pero muy administrativo»). `AppShell` fija `data-theme="light"` e
importa el mismo cromo de miembros para la paleta y el fondo blanco; el
selector de tema se retiró con la barra lateral. **Ya ningún portal ofrece
el tema oscuro**: sus tokens siguen en `globals.css` (el `QrCode`, la franja
negra y `/dev/ui` los usan), pero ninguna pantalla de producción lo pinta.

### La paleta de la fachada pública es la del rediseño aprobado

Encargo del propietario (25/09/2026): el Portal Público usa **exactamente**
los colores del boceto (artifact «ORUM — Rediseño Portal Inicial»). Donde el
boceto y el sistema difieren, en la fachada manda el boceto. Todo vive en
`publico.module.css` (`.fachada[data-theme='light']`) y en tokens propios, así
que los otros tres portales no cambian:

| Qué | Sistema | Fachada pública | Contraste |
|---|---|---|---|
| Fondo y tarjeta | `--w-0` crema | `--blanco` #FFFFFF | — |
| Oro de texto (`--brand`) | `--gold-700` | **`--gold-650`** #8E6B13 | 4,93 blanco · 4,29 gris hondo → ahí solo texto grande o iconos |
| Fondo de insignia (`--gold-bg`) | oro 10 % | oro 12 % | — |
| Sombras de escalón 1–3 | `--shadow-1..3` | `--sombra-fachada-1..3` (más densas) | — |
| Filo interno (`--border-subtle`) | negro 22 % | tinta 12 % | decorativo |
| Texto sobre negro, 3.er nivel | colapsa a `--franja-fg-2` | `--franja-fg-3` donde el boceto lo pide | 6,35 tarjeta negra |

**Reglas que se relajan SOLO en la fachada**, porque el boceto las pide y el
contraste AA de texto se sigue cumpliendo:

- **Relleno `--gold-300` sobre claro** (el botón de WhatsApp de la ficha): el
  texto en tinta da 12,65:1; el relleno pálido no marca un filo de 3:1 contra
  el blanco, y no hace falta porque el texto nombra el botón.
- **Botones con texto sin filo de 3:1** («Quiero ser aliado», los disparadores
  Ciudad/Ordenar): los identifica su texto. El filo de 3:1 sigue siendo
  obligatorio en los **campos donde se escribe** (`Input`, el buscador).
- **Lo que NO se relaja**: 4,5:1 en texto normal. Cuando el color exacto del
  boceto no llega, se oscurece un paso y se anota (la opción elegida de los
  desplegables va en `--gold-800`: el oro del boceto da 4,21:1 ahí).

**El claro es donde se diseña y se juzga.** En oscuro una sombra negra sobre
fondo negro no se ve, así que allí el material lo declara **`--edge`**, que con
la v3 pasó de ser un chaflán superior a un **anillo completo de luz**: es el
sustituto del borde que se retiró, y sin él un menú `--surface` sobre una tarjeta
`--surface` se quedaba sin ningún límite. Los cuatro peldaños semánticos existen
también en oscuro, con la misma gramática de dos capas y mucha más opacidad.

**Cada cambio se audita en SU tema.** Los criterios de contraste se comprueban
por tema, nunca una vez para los dos.

---

## El oro

**El oro es color de MARCA siempre.** Es color de acción **solo** donde se
indica abajo, y solo mientras el par relleno/texto cumpla los dos ratios de
contraste de esta sección. Donde no se cumplan, sigue siendo tinta.

**Jamás codifica datos.**

- **Panel de Administración**: botón primario = **tinta**, negro sobre
  claro. No cambia: es la herramienta de trabajo. Todos sus botones van en
  **píldora** (`--boton-radio`, el gancho de `button.module.css` que pone el
  shell), los secundarios sin borde y con sombra (15/10/2026), y su acción
  ceremonial —«Registrar miembro», en la barra de arriba— es
  `variant="brand"` en `--gold-500` con texto en tinta, como en comercios. `--action` NO se pasó al oro: también pinta la casilla marcada,
  y su filo daría 1,9:1 contra el blanco.
- **Herramienta de Comercios** (desde el 04/10/2026): la acción principal va
  en píldora con relleno `--gold-500` y texto en tinta (8,5:1), el mismo par
  que las puertas de acceso. Antes era tinta; el rediseño la pasó al oro de
  la fachada. Como relleno no marca un filo de 3:1 contra el blanco: lo
  identifica su texto (la misma relajación de la fachada). Sigue siendo
  RELLENO: `--gold-500` como color de letra sobre claro continúa prohibido.
- **Portal de Miembros y las seis pantallas de acceso**: el botón primario
  puede usar relleno dorado con texto en tinta, **condicionado** a que el par
  concreto cumpla a la vez:
  - **4.5:1** entre el texto y el relleno (WCAG 1.4.3).
  - **3:1** entre el borde del relleno y la superficie que lo rodea, en **los
    dos temas** donde se use (WCAG 1.4.11).

  Si el par no llega a esos dos números, el primario de esa pantalla **vuelve
  a tinta**. No hay apaño de borde que sustituya la medición, y no se aprueba
  con una estimación: solo con el ratio firmado por `accessibility-auditor`.
- El oro vive en: wordmark, indicador de ruta activa, anillo de focus,
  hairlines, **la respuesta al toque** (abajo), el titular de la franja negra y
  —donde el punto anterior lo habilite— la acción principal del recorrido del
  cliente.
- **Presupuesto: levantado.** El ≤5 % del área visible lo retiró el propietario
  en `LICENCIA-CREATIVA-v4.md`. El oro puede ocupar lo que la pantalla pida. Lo
  que **no** se levantó es el contraste.
- El oro de marca sobre el crema de la v6 **sigue prohibido** (1,89:1 — peor
  todavía que los 2,03:1 sobre el blanco puro de la v5, porque el crema es más
  oscuro). `--gold-600` sigue siendo el único tono que cumple los dos criterios
  en claro, y **no cambió de valor** con la v6: se recalibró el crema
  alrededor de él.

### El oro es la respuesta al toque

Con la v3 el oro gana un papel nuevo, y es un cambio importante: deja de ser solo
marca y pasa a ser **la señal de que el sistema te está respondiendo**.

| Estado | Qué pasa |
|---|---|
| **Reposo** | Sin filo. Solo sombra |
| **Señalado / enfocado / arrastrado** | Aparece un filo de 1px en `--brand-edge` y la sombra sube un escalón |
| **Activo / seleccionado** | Filo dorado + relleno de `--surface-hover` |
| **Favorito marcado** | El corazón se llena de **rojo**. Aquí el color SÍ es dato, y por eso no va en oro: es el único sitio donde el color dice algo que el oro no puede decir |

El token es **`--filo-activo`** (`0 0 0 1px var(--brand-edge)`), y va en
`box-shadow`, no en `border`: así no toca la caja y puede aparecer y desaparecer
sin mover el contenido. Se compone en lista con la sombra:

```css
box-shadow: var(--filo-activo), var(--shadow-raised), var(--edge);
```

**Casi todo es un filo de 1px**, y salvo el segmento seleccionado y el indicador
de ruta activa **ninguno existe en reposo**: en una captura estática de la
pantalla quieta, el oro de interacción es cero.

**Y sigue sin codificar datos.** Dice «el sistema te está respondiendo», nunca
«este dato es así».

### Cuatro oros, y el error es usarlos al revés

El oro se reparte en cuatro trabajos. **No son intercambiables**, y el fallo
típico —poner el oro brillante sobre una superficie clara— es el que arruina la
accesibilidad de una pantalla entera de un plumazo.

**La regla física, en una línea: sobre NEGRO el oro brillante gana contraste;
sobre CREMA lo pierde.** Es la misma fórmula leída en direcciones opuestas, así
que ningún oro puede ser a la vez más brillante y más legible sobre un fondo
claro. Por eso la v6 **no tocó ninguno de los cuatro oros**: recalibró el
crema alrededor de ellos en vez de perseguir el brillo otra vez.

| Trabajo | Token | Ratio | Prohibición |
|---|---|---|---|
| **Display, solo sobre negro** | `--gold-400` | **12,27:1** sobre `--franja-bg` · 11,69:1 sobre el fondo oscuro — sin cambio | ⛔ Sobre crema da **1,64:1** y sobre gris claro **1,54:1**. Ni el 3:1 de texto grande |
| **Marca · acción en oscuro** | `--gold-500` | 9,26:1 sobre el fondo oscuro · 8,25:1 de filo sobre la tarjeta — sin cambio | ⛔ Sobre crema da 1,89:1 |
| **Relleno de acción · filo** | `--gold-600` | **4,84:1** con texto `--tinta-1` (1.4.3) · **3,27:1** de filo sobre crema, 3,13 sobre gris claro, 3,07 sobre gris hondo, 3,04 sobre `--surface-hover`, 5,61 sobre la franja negra (1.4.11) | — |
| **Texto e iconos dorados** | `--gold-700` | 4,87:1 crema · 4,67:1 gris claro · **4,58:1 gris hondo** | Cumple sobre **las tres** — el margen sobre la más honda no cambió desde la v5 |
| Texto dorado sobre oscuro | `--gold-300` | 13,95:1 sobre el fondo · 14,64:1 sobre la franja negra — sin cambio | — |

**El titular dorado grande vive sobre la franja negra, nunca sobre un gris.**
El mismo oro que da 1,54:1 sobre gris claro da 12,27:1 sobre negro. La salida
accesible es también la más impactante.

**Dónde está el techo, y no es negociable**: `--gold-600` está a **0,07 puntos**
del suelo de 1.4.11 contra `--surface-alt-2` (era 0,08 en la v5 — el margen no
cambió casi nada, porque el crema se calibró exactamente para conservarlo). No
se puede subir el oro ni oscurecer `--w-100` sin recalcular ese par. Cualquier
cambio futuro en `--w-0`, `--w-100` o `--gold-600` obliga a recalcularlo antes
de tocar nada más.

**`--gold-700` no se movió desde la v5** y sigue cumpliendo AA sobre las tres
superficies claras. Un oro de texto legible sobre un fondo claro es oscuro por
obligación; el brillo se ve en la franja negra.

---

## Tonalidades: crema, grises, negro

**Los neutrales claros de ORUM son CÁLIDOS.** Esto deroga la regla NEUTRA de la
v5 (que a su vez había derogado la cálida de la v4, que a su vez había
derogado la fría de la v3). No es un vaivén de gusto: la v6 viene de una guía
de marca real del cliente, con la paleta nombrada por archivo.

Sigue vigente el encargo que las franjas resuelven: «fondos que no sean solo
blanco o negro» y que **los espacios vacíos de escritorio se veían feos**. El
vacío no sobraba: **le faltaba estructura**.

| Superficie | Token | Para qué |
|---|---|---|
| **Crema** `#FAF6EC` | `--bg` · `--surface` | Fondo y tarjeta. Sigue sin haber escalones entre ellos |
| **Gris claro** `#F7F1E4` | `--surface-alt` | Franja alterna. **1,04:1** contra el crema: separa **sin trazo** |
| **Gris hondo** `#F5EFDF` | `--surface-alt-2` | Relleno: hueco, carril, esqueleto. Superficie de relleno, no de párrafo |
| **Negro** `#0A0A0C` | `--franja-bg` | La franja oscura. El único sitio donde vive el oro de display. Negra en los DOS temas — ver el aviso de abajo |

La separación de las franjas **bajó** de 1,08:1 (v5) a 1,04:1 (v6): el crema se
calibró para conservar el margen de `--gold-600` contra `--w-100` (ver «El
oro»), y eso no dejaba sitio para separar más las franjas sin romper ese par.

Herramienta: **`<Section tono="crema" | "honda" | "negro">`**. ⚠️ `crema` y `honda`
conservan los nombres de la v4 y ya no describen su color: `crema` es ahora gris
claro y `honda` gris hondo. `negro` (antes `cacao`, renombrado el 16/10/2026) sí
lo describe.
Una franja **no es una tarjeta**: no lleva sombra ni borde, porque no está
levantada, está teñida.

⚠️ **CERRADO EN LA v6 — la franja negra en tema claro tenía un bug real.**
`globals.css` mapeaba `--franja-bg` (entonces `--cacao-bg`) a un marfil claro (`--champan-100`) SOLO en
tema claro, contradiciendo el propio comentario de la línea anterior en ese
archivo y contradiciendo este documento. Confirmado con el propietario: la
franja **negra no sigue al tema** —es negra en claro y en oscuro, igual que el
`QrCode`, sin excepción— y **remapea sus tokens de texto hacia dentro**, así
que lo que viva ahí no hay que vestirlo a mano. En oscuro se separa del fondo
por 1,05:1, así que sigue leyéndose como franja en vez de desaparecer. Detalle
en `.claude/docs/log/v6-crema-oro.md` §3.

**El tema oscuro NO cambió con la v6**, y **se audita aparte**: los criterios
de contraste se comprueban por tema, nunca una vez para los dos.

⚠️ **Al cambiar la temperatura o la claridad de la rampa cambia la luminancia, y
un ratio firmado deja de valer.** Ya ha costado tres veces: en la v4 el filo de
la placa de logo era `--n-400` y al pasar a cálido cayó a 2,81:1 (hubo que
añadir `--n-450`); en la v5 esos mismos cuatro números volvieron a moverse y
hubo que recalcularlos otra vez. **La v6 NO tocó la placa de logo** —vive en
`--n-*`, la rampa oscura, que no cambió— así que esos cuatro números se
quedan como estaban en la v5. **Ningún valor entra sin recalcular.**

✅ **`--text-3` y `--gold-700` sobre la superficie más honda**: reprobaban AA
en la v4 (4,18:1 y 4,21:1), se cerró en la v5 (4,59:1 y 4,58:1 sobre blanco
puro) y con la v6 se recalculó otra vez sobre el crema: **6,35:1 y 4,58:1**.
`--text-3` ganó margen (ahora tiene valor propio, ya no comparte token con la
rampa oscura); `--gold-700` se quedó en el mismo número exacto — no es
casualidad, fue el par que decidió dónde calibrar el crema. El margen sigue
siendo corto, así que **`--w-100` no puede oscurecerse** sin recalcular.

---

## Tipografía: DOS familias

⚠️ **ESTO DEROGA «UNA SOLA FAMILIA» DE LA v5.** Encargo literal de la guía de
marca del cliente: **Playfair Display** para títulos, **Montserrat** para
texto. No es un vaivén de gusto de sesión — es una identidad de marca
entregada por el cliente, con las dos familias nombradas por archivo.

**Montserrat** viste todo lo que no es titular ceremonial: nav, botones,
formularios, tablas, cuerpo de párrafo. Reemplaza a Plus Jakarta Sans en el
mismo rol exacto. Se carga con `next/font/google`, subconjunto latino,
`display: swap`, variable en `wght` (el sistema consume 400–800).

**Playfair Display** entra por primera vez desde que la v5 retiró a Fraunces.
Serif de contraste alto, con cursiva real (`style: ['normal', 'italic']`) —
los acentos en cursiva dorada del héroe y los títulos de sección dependen de
que sea un corte auténtico, no una oblicua sintética. Pesos 500–800.

| Token | Valor | Dónde |
|---|---|---|
| `--font-sans` | Montserrat | Todo lo que NO es titular ceremonial |
| `--font-display` | Playfair Display | Héroe, «así funciona», `Cifra`, la ficha de comercio, el carnet del socio, `TituloSeccion` y —desde el rediseño del panel, 04/10/2026— el `h1` de `PageHeader` |

`--font-display` sigue siendo la ÚNICA puerta por la que un serif puede
entrar a una pantalla. La lista de consumidores creció UNA vez, y por
encargo: `PageHeader` con un `title` de texto pinta el titular de la
fachada (`TituloSeccion tamano="pagina"`, 28–36px, estrella y última
palabra en cursiva dorada). Lo usan el Panel de Administración entero y
`/novedades`. Un titular en serif nuevo entra por ahí, no con su propio
`font-family`.

**Lo que sigue DEROGADO de la v4** (no vuelve con la v6): «nunca en
Administración», «nunca por debajo de 28px», «un acento por pantalla». Lo que
SÍ vuelve, porque la familia física es otra vez un serif de contraste alto:

- **Un serif de display necesita MENOS peso y tracking más abierto que un
  sans geométrico** — es el motivo inverso al que subió el peso en la v5. Un
  serif crea presencia con la modulación de sus astas; a 72px, 600 le basta.
  `hero-1` baja de 800 a **600** y su tracking se abre de −0,040 a **−0,032em**
  — de vuelta a los valores de la v4. `hero-2` y `hero-cifra` bajan igual, de
  700 a **600**.
- ⚠️ **`display-1` (48px) NO baja de peso.** Es la trampa fácil de esta
  versión: `.t-display-1` vive en `--font-sans` (Montserrat), no en
  `--font-display` — sigue siendo un sans geométrico, así que el motivo de la
  v5 para subirlo a 700 sigue siendo cierto. Se queda en 700 / −0,030em.
- **De `display-2` (36px) hacia abajo el peso 600 no se toca**: subirlo
  engordaría los encabezados de todas las páginas de Administración.
- **`hero` sigue separado de `display`.** La frontera sigue siendo de escala
  (72px contra 48px) Y ahora también de familia otra vez, pero son la MISMA
  frontera: lo que pide `--font-display` es lo que sube a `hero`.
- **El rango no cambia**: `hero-1` llega a 72px contra 15 de cuerpo, 4,8x.
- **`-webkit-font-smoothing: auto` vuelve** en `.t-hero-1/.t-hero-2/.t-hero-cifra`:
  Playfair Display pierde sus astas finas con `antialiased` en Chrome/macOS,
  el mismo motivo que en la v4. Los módulos que ya usaban `--font-display`
  (héroe público, `Cifra`, la ficha de comercio, el carnet) YA tenían esta
  propiedad escrita desde antes de la v5 — nunca se limpió al retirarla del
  sistema global, así que vuelve a ser correcta sin tocar esos archivos.
- **Coste medido** (`.next/static/media` tras `build`): **364 KB** de woff2 en
  total (todos los cortes de `unicode-range`), de los que aproximadamente
  **110 KB** están marcados para precarga. La v5 había bajado el presupuesto a
  57,6 KB / 26,6 KB con una sola familia; la v6 lo sube de vuelta al tener dos
  — es un costo aceptado por mandato explícito del cliente, no un descuido.

---

## Estado de membresía

Un solo eje, binario. Derivado **siempre** con `derivarEstadoMembresia`:

```ts
esActiva = estado === 'activa' && fecha_fin >= hoy
```

**Nunca leas `membresias.estado` en crudo.** Esa columna tiene default `'activa'` y
nada la actualiza al vencer: mostrarías "Activa" en verde a quien lleva meses sin
pagar.

- **Activa** → verde, punto lleno
- **Inactiva** → rojo atenuado, punto **hueco** (la forma cambia, no solo el color),
  con el motivo como texto secundario
- **"Vence en N días"** no es un estado: sigue activa. Señal ámbar secundaria.

**Cortesía** (22/10/2026): una membresía puede ser de cortesía
(`membresias.es_cortesia`, siempre con `precio_pagado` 0; lo exige un CHECK).
Existe y da acceso, pero NO es una venta: no suma al ingreso ni al conteo de
«membresías vendidas» de Métricas (`agruparMembresiasPorEmpleado` la salta),
la ficha del miembro dice «Cortesía» en vez de «$0» y la bitácora también. Se
marca con la casilla de «Registrar miembro» y de «Renovar membresía»
(`es_cortesia`); con ella marcada el campo del precio no se pinta
(`salvoCortesia`) y el servidor ignora cualquier precio. Poner 0 sin casilla ya
no es la forma de regalar una membresía: sigue siendo un descuento total.

---

## Movimiento

Curvas y duraciones en `tokens.css`; resortes en `src/lib/shared/motion.ts`.

### Regla cero: la FRECUENCIA decide si algo anima

Antes de elegir duración o curva, cuenta cuántas veces al día alguien va a ver
esto. Es lo que la v4 añade al marco anterior, y manda sobre todo lo demás.

| Frecuencia | Decisión | En ORUM |
|---|---|---|
| Cientos de veces al día | **No animar nunca** | Abrir el carnet desde la barra inferior |
| Decenas | Al mínimo | Hover de tarjeta, chips de filtro |
| Ocasional | Estándar | Overlay de ficha, toast, hoja |
| Rara / primera vez | Se puede deleitar | Alta de socio, primer favorito |

Una animación preciosa en algo que se hace 200 veces al día son 200 esperas, y
se percibe como lentitud mucho antes de que alguien la llame bonita.

### Duraciones y curvas (v4: bajan las unas, suben las otras)

| Banda | Valor | Token |
|---|---|---|
| Pulsación | 100–160 ms | `--dur-instant` 100 · `--dur-press` 90 · `--dur-rebote` 200 |
| Desplegable, chip | 150–250 ms | `--dur-fast` 140 · `--dur-base` 220 |
| Overlay, hoja | 200–500 ms | `--dur-slow` 320 · `--dur-page` 420 |
| **Salida** | ~0,65x de la entrada | `--dur-salida` 150 · `salidaDe()` en JS |
| Escalonado | 30–80 ms | `--escalonado` 40 · `retardoEscalonado()` |

```
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1)      /* entradas */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)     /* movimiento en pantalla */
--ease-hero:   cubic-bezier(0.645, 0.045, 0.355, 1)/* recorridos largos */
```

Las de CSS son flojas; estas están medidas en las referencias. **`--ease-in` se
eliminó del sistema**, no se dejó «por si acaso»: una curva que empieza lenta
arranca justo en el instante en que el usuario más mira, y hace que 300 ms se
sientan como 500.

### Cinco correcciones de la v4 que son bugs si se incumplen

1. **Nada entra desde `scale(0)`.** En el mundo real nada aparece de la nada.
   Desde `0.95`–`0.92` con `opacity: 0` haciendo el trabajo de ocultar.
2. **`transition: all` es un bug de rendimiento.** Enumera las propiedades. Y
   ojo con declarar **la misma propiedad dos veces** en una lista separada por
   comas: gana la última y la primera no se aplica nunca — sin aviso.
3. **La salida más rápida que la entrada.** Lento donde el usuario decide,
   rápido donde el sistema responde: cerrar ya está decidido.
4. **Escalonado de 30–80 ms, y con tope.** El tope importa más que el paso: sin
   él, la fila 25 llega casi un segundo tarde.
5. **Transiciones, no `@keyframes`, en lo que se dispara rápido.** Una
   transición se reencamina a media animación; un keyframe reinicia desde cero.
   Excepción legítima: cuando el elemento se **intercambia** (React desmonta uno
   y monta otro) no hay valor de partida que transicionar, y ahí el keyframe es
   lo correcto.

**Para animar un número** (un desplazamiento, un progreso) la forma correcta de
`motion` es la de valor único:

```ts
animate(desde, hasta, { ...SPRING_SHEET, onUpdate: (v) => colocar(v) })
```

`animate(callback, [desde, hasta], opciones)` **no existe** en motion 12: no lanza
excepción, simplemente no anima. La hoja inferior se abría y se quedaba en su
posición cerrada —asomando solo el tirador— y nada en consola lo delataba.

### Las siete reglas, y ninguna es opcional

El encargo pide explícitamente movimiento de estilo Apple. Traducido a reglas
ejecutables (todas salen de *Designing Fluid Interfaces*, WWDC 2018):

1. **Responder en `pointerdown`, no en `click`.** En cuanto aparece latencia, la
   sensación de manipulación directa se cae por un precipicio. En CSS puro el
   equivalente exacto es **`:active`**, que el navegador enciende al APRETAR.
2. **Resortes, no duraciones.** Por defecto **críticamente amortiguado**
   (`bounce: 0`, respuesta 0,3–0,4 s). El rebote se gana — ver abajo.
3. **Interrumpible siempre.** Una animación en curso se puede agarrar y
   revertir, y se anima **desde el valor en pantalla**, nunca desde el lógico.
   Arrancar del lógico hace saltar el elemento al destino antes de volver, y ese
   salto se ve por bueno que sea el resorte. Para eso está
   **`leerTransformEnPantalla`**.
4. **Entrada y salida por el mismo camino, y ancladas al origen.** Lo que nace de
   una tarjeta crece **desde esa tarjeta** (`transform-origin`), no desde el
   centro de la pantalla. Para calcularlo, **`origenDesde`** (función pura: recibe
   cajas, no elementos).
5. **Materializar, no fundir.** Una superficie translúcida entra animando
   **desenfoque y escala a la vez**, para que se lea como un material que llega y
   no como una opacidad que sube. `SPRING_MATERIAL` y `pasosMaterial`. Aplicado
   hoy en el velo del modal y en la tarjeta de acceso. **Es la única excepción
   viva a «solo transform y opacity» fuera de las View Transitions**, y se
   sostiene porque son UNA capa, UNA vez, y ya promocionadas por su
   `backdrop-filter` en reposo. **No se copia a nada que se repita.**
6. **Solo `transform` y `opacity`** en todo lo demás.
7. **`prefers-reduced-motion` ≠ sin feedback**: es el equivalente no vestibular
   (fundido corto en vez de viaje, sin rebote, sin paralaje). Lo que debe seguir
   animando —spinner, esqueleto, progreso— lleva `data-motion-esencial`.
   **`transicionSegunPreferencia(preset)`** elige por ti, y existe para que nadie
   vuelva a escribir dos llamadas a `animate` duplicadas: la rama de
   accesibilidad se queda sin actualizar cuando se toca la otra, y el fallo solo
   lo ve quien tiene la preferencia puesta.

- Gestos: seguimiento 1:1, resistencia elástica en los bordes
  (`amortiguarBorde`), y al soltar se decide por **dónde iba** el gesto
  (`proyectarMomento`), no por dónde se soltó.

Presets disponibles: `SPRING_UI` (por defecto), `SPRING_MOVE`, `SPRING_SHEET`,
`SPRING_POP`, `SPRING_FLICK`, `SPRING_MATERIAL`, `SPRING_PRESS`, `sinRebote()`
para derivar uno amortiguado de otro, y **`salidaDe()`** para derivar la versión
de salida de un preset de entrada: mismo carácter, 0,65x de duración y **sin
rebote** —un sobreimpulso al salir deja el objeto pasándose de su destino justo
antes de desaparecer, y el ojo lo lee como un tirón—.

Curvas en la forma que espera `motion`: `EASE_OUT`, `EASE_IN_OUT`, `EASE_HERO`.
Si cambias una, **cambia su gemela de `tokens.css` en el mismo commit**: que la
misma animación se sienta distinta según la escriba CSS o JS es el peor tipo de
incoherencia, porque no se ve en el código, solo en pantalla.

### Presionar hunde, apuntar levanta

Un botón que al pulsarse baja 2px y se queda solo con el contacto de su sombra
—pierde el halo— comunica **físicamente** lo que un cambio de color solo comunica
por convención. Y ocurre en `:active`, que es la regla 1 en CSS puro.

- **Pulsación**: `translate: 0 2px` + `--shadow-press`. En `:active`.
- **Hover**: `translate: 0 -2px` + **`--filo-activo`** + el escalón siguiente de
  sombra, **solo bajo `@media (hover: hover)`**. En táctil el hover se queda
  pegado tras el toque.
- Se anima `translate`, que es propiedad independiente de `transform`: así no
  pisa las transformaciones que ya use el componente y ambas se componen solas.
  Y **no se acumula con `scale`**: quien use `translate` repone `scale: 1`, que
  además desactiva la regla global de `globals.css` §4b.
- **Solo se levanta lo que ya estaba elevado.** `Button secondary` y `ghost` son
  tinta sobre papel: darles sombra al pulsar los haría subir justo cuando se les
  empuja.
- **Techo, y no es negociable**: nada de sombra ni desplazamiento animados en
  filas de lista largas. Ahí el feedback es **opacidad**, porque el que paga la
  factura es un móvil de gama media y es donde más filas hay.

### El rebote

Por defecto `bounce: 0`. **`bounce: 0.2` está permitido** en entradas de
overlay, confirmaciones y aparición de tarjetas. **Sigue prohibido** en
navegación y en cambios de estado de datos: ahí el rebote se lee como juguete.

La vuelta del acuse de presión —`--dur-rebote` / `--ease-rebote`, la que pasa
por `globals.css` §4b y alcanza a todo lo pulsable— vale **200 ms con ~+4 % de
sobreimpulso**. Estuvo en 440 ms y +12 %, luego en 320, y la v4 la baja a 200:
la banda de **pulsación** es 100–160 ms —Podia mide 120— y 320 era el resto de
una escala calibrada para resortes de overlay, no para el acuse de un botón.
Es el gesto más frecuente de la aplicación, y la regla cero manda hacia abajo.
`--ease-spring` **sí** conserva el 1.56 — ese es el rebote de lo que se gana.

### Suave siempre, seco una vez

Las dos peticiones conviven así, y el orden importa:

- **Todo lo continuo es suave.** Lo que responde mientras el dedo está ahí
  —hundir, levantar, abrir, mover— usa entrada rápida y salida decelerada
  (`--ease-out`) o un resorte sin rebote. Sin excepciones.
- **El único gesto seco es el acento puntual de la selección** (`Agitar`). No
  acompaña un gesto: celebra un resultado, ocurre una vez y se acaba.

No es un compromiso entre dos estilos: **el acento funciona porque todo lo demás
es suave.** Sobre un fondo igual de seco desaparecería en el ruido. Por eso se
aplica al **icono**, nunca a la superficie que lo contiene, y al **encender**,
nunca al apagar.

### Entrada escalonada de listas y rejillas

**`--escalonado`, que vale 40 ms**, con **tope de 8**. La banda es 30–80 y el
tope es la parte importante, no el paso: a partir de ahí el último llega tarde y
se percibe como lentitud, no como elegancia. El paso **sale del token**, no se
escribe a mano: estaba escrito siete veces en `layout.module.css` y otra vez,
distinto (22 ms), en el menú.

Ya resuelto y listo para usar: prop `escalonado` en `Stack` y `Grid`, y por
filas en `DataList` (`PASO_MS` / `MAX_ESCALONADAS`). Úsalo en la **primera
pintura** de una rejilla, no en cada actualización: escalonar una lista que el
usuario ya tenía delante le hace esperar otra vez por algo que ya había leído.

### Transiciones de elemento compartido — la excepción a «no animes la caja»

Aquí arriba está escrito que animar `width`, `height`, `top`, `left` o `margin`
es un bug. Una View Transition interpola exactamente eso: el navegador lleva la
caja del elemento de su geometría vieja a la nueva. **Es la única excepción, y
está acotada.**

Por qué no es la misma factura: lo que se interpola no es el elemento, es una
**instantánea** suya. El navegador saca una foto del estado viejo y otra del
nuevo, las coloca en una capa propia fuera del árbol de layout y las anima en el
compositor, sin recalcular nada en el hilo principal en ningún fotograma. Animar
`width` a mano, en cambio, obliga al motor a rehacer layout y pintado sesenta
veces por segundo, arrastrando a los hermanos. **Sigue prohibido a mano.**

**Dónde SÍ se usan, y hoy es un solo sitio:** rejilla del catálogo de miembros ↔
ficha del comercio. La placa del logotipo y el bloque nombre+marca son el mismo
objeto en las dos pantallas, con la misma disposición —placa a la izquierda,
texto a la derecha—, y solo cambian de tamaño y de posición.

**Dónde NO**, y no es una lista provisional:

- **Catálogo → carnet** y **ficha → carnet**. No hay ningún objeto en común: el
  carnet es el documento del socio, no el comercio. Ver volar la placa de un
  aliado hacia el carnet inventaría un parentesco que no existe.
- **Carrusel de portada → ficha** y **estanterías (`ComercioCardCompacta`) →
  ficha**. Un comercio puede salir a la vez en la portada, en una estantería y
  en la rejilla, y **dos elementos con el mismo `view-transition-name` vivos en
  el mismo documento anulan la transición entera, en silencio**. El nombre lo
  lleva solo la rejilla, que es la única lista exhaustiva.
- **Filtrar o cambiar de categoría dentro del catálogo** como elemento
  compartido: morfar tarjetas que se reordenan produce vuelos cruzados. Las
  TARJETAS no llevan nombre al filtrar. ⚠️ Lo que SÍ hay desde el 20/10/2026
  («quiero animación para las subcategorías y que se sienta más fluido»): al
  poner o quitar una categoría o subcategoría, `DirectorioInteractivo` envuelve
  el cambio en una View Transition propia, con reglas que solo valen bajo
  `html[data-filtrando]` (`globals.css` §4c): cada grupo de subcategorías
  (`subcategorias-<id>`) entra y sale, la rejilla entera
  (`directorio-resultados`) se desliza como UNA pieza y funde su contenido,
  todo en `--dur-base`, y la capa de la transición deja pasar los toques
  (`pointer-events: none`). No es un par de elemento compartido: es la misma
  pantalla reacomodándose sin animar alturas. Los filtros que se pintan viven
  en estado del componente (`vista`) y la URL se escribe a la vez: el toque
  ya no espera a que Next sincronice `useSearchParams`.
- **Cualquier cruce de la frontera de sesión** (acceso → portal).

La regla que decide: **continuidad de objeto real**. El mismo objeto persiste y
se transforma. Un cambio de pantalla no basta. Una transición de elemento
compartido donde no hay continuidad se lee como un error de la aplicación, y eso
es peor que no tener ninguna.

**El mecanismo es nuestro, no del framework.** `experimental.viewTransition`
**no se consume en ninguna parte de Next 16.2.11**: existe en `config-schema.js`
y en el default, y ningún módulo del router lo lee. `<ViewTransition>` de React
—que el canary vendorizado sí exporta— se monta y no dispara nada: compila,
tipa, pasa lint y build, y `document.startViewTransition` no se llama ni una vez.
Es el mismo fallo mudo que `animate(callback, [desde, hasta])` en motion 12.

Por eso el nombre lo escriben los propios elementos con `style`
(`transicionComercio()` genera el valor desde el `id`, nunca desde el índice de
la lista, que cambia al filtrar) y quien llama a `document.startViewTransition`
es `TransicionesDeRuta`: **un solo componente de cliente por portal, con un
escuchador delegado**. Envolver cada tarjeta habría hidratado cien raíces en el
catálogo.

Detalle que no es obvio: `router.push` no espera a que React pinte, así que el
callback devuelve una promesa que solo se resuelve cuando `usePathname` cambia —
y con un plazo máximo, porque sin él una navegación fallida dejaría la página
congelada bajo la instantánea vieja.

**No se puede verificar desde la automatización de esta máquina.** Su Chrome
reporta `document.visibilityState === 'hidden'` incluso con foco, y la
especificación aborta toda View Transition en ese estado
(`Transition was aborted because of invalid state`). Es la misma causa de fondo
que la nota de «Antes de dar algo por hecho» sobre medir transiciones aquí. Se
comprueba en un navegador de verdad, mirando.

**Cómo se escriben.** Nunca un `view-transition-name` suelto en un
`.module.css`: en navegación de cliente, quien llama a
`document.startViewTransition` es React, y solo si hay un `<ViewTransition>` en
el árbol que cambia. Un nombre suelto compila, pasa el lint y no anima jamás
—y además el hash del módulo CSS lo renombraría—. La puerta única es
`<TransicionCompartida>` (`src/components/ui/transicion-compartida.tsx`), y el
nombre se deriva del **`id` del dato**, nunca del índice de la lista: el índice
cambia al filtrar y el par deja de casar justo cuando el usuario ha filtrado.

**Movimiento reducido**: resuelto en `globals.css` §4c y §5, no en el
componente. El morfo de la caja se anula y queda un fundido cruzado — equivalente
no vestibular, nunca ausencia de feedback. No puede resolverse en el componente
porque estas pantallas son Server Components y detectarlo exigiría hidratar cien
tarjetas para escribir un atributo.

**Ojo**: la red de seguridad de `prefers-reduced-motion` de `globals.css` §5 usa
`*`, que **no casa con un pseudoelemento** `::view-transition-*`. Cualquier
transición nueva necesita su tratamiento accesible escrito a mano; no lo hereda.

---

## Formularios: overlay, no página

Un formulario **no navega**. Se abre por encima. **Sin excepciones**: también
cambiar la contraseña, que durante un tiempo tuvo página propia porque "no era
un formulario de una lista". Sí lo era.

Corolario: si una acción se hace y se cierra, **no merece un sitio fijo en la
barra lateral**. La barra es para los lugares donde se trabaja. "Mi contraseña"
ocupaba un grupo entero, con encabezado, para algo que se hace una vez cada
muchos meses — y encima ya estaba en el menú del avatar: la misma acción listada
dos veces en la misma pantalla.

Al sacar algo de la barra de opciones, **comprueba el móvil**: allí no hay menú
de la cuenta (en el teléfono no se pinta), así que la hoja "Más" es la única
puerta. Si el destino salía de `navegacionPara`, hay que listarlo a mano en esa
hoja o desaparece del teléfono.

Los dos modos:

- **Escritorio** → diálogo centrado
- **Móvil** → hoja inferior con detents (`medium` si el contenido cabe y conviene
  ver el fondo; `large` si solo sirve a pantalla completa)

Ambos salen del mismo componente: `<Overlay>`.

⚠️ **En React, `cancel` y `close` BURBUJEAN** (en el DOM no). Llegan al
`<dialog>` de fuera el `cancel` de un `<input type="file">` cuyo selector se
cerró sin elegir (Chrome 113+) y el `cancel`/`close` de un diálogo anidado
(la confirmación de «Quitar», el visor de fotos dentro de la ficha). Hasta el
04/10/2026 eso cerraba la ventana entera. `Modal`, `Sheet` y la paleta solo
atienden los suyos (`e.target === e.currentTarget`); **un `<dialog>` nuevo
hace lo mismo**.

Se montan como **rutas interceptadas** (`@modal/(.)ruta`). Eso da gratis: el botón
atrás cierra, un enlace directo abre a pantalla completa, y la lista de detrás
conserva scroll y estado.

### La ranura `@modal` vive en `app/admin/layout.tsx`. Solo ahí.

Una ruta interceptada **solo intercepta si el layout que declara su ranura ya está
montado**. Cuando cada sección tenía la suya, el mismo formulario se comportaba de
dos maneras según de dónde vinieras: desde `/admin/miembros` se abría encima, pero
desde el panel de inicio —o la pestaña "Vender" del móvil— navegaba a la página
completa, porque `miembros/layout.tsx` todavía no existía en el árbol.

Por eso hay **una sola ranura**, en el layout del panel, y todos los formularios
cuelgan de ella:

```
app/admin/@modal/(.)miembros/nuevo/page.tsx
app/admin/@modal/(.)comercios/[id]/sucursales/nueva/page.tsx
```

Al añadir un formulario nuevo: crea la página real **y** su gemela bajo `@modal`.
Importa el formulario con el alias `@/app/admin/...`, nunca con `../../../..`:
esas páginas están cuatro niveles por debajo de la sección que las usa.

**Compruébalo en el navegador desde DOS orígenes** —su propia lista y el panel de
inicio—. La firma de que intercepta es `document.querySelector('dialog[open]')` con
el contenido anterior todavía montado detrás.

La ranura necesita **su propio `loading.tsx`**. Sin él, Next cae al `loading.tsx` de
la sección y dibuja el esqueleto de la tabla dentro del hueco del modal.

⚠️ **Y en la RAÍZ de la ranura ese `loading.tsx` no pinta nada** (`return null`);
la ventana de carga va en cada grupo interceptado (`@modal/(.)miembros/loading.tsx`,
`(.)comercios/…`). Hasta el 04/10/2026 la raíz del panel pintaba la ventana, y
como el comodín `[...resto]` vacía la ranura en cada navegación, **cualquier
clic a una sección enseñaba un instante una ventana cargando**. Solo pasa en
producción: allí `<Link>` precarga hasta la primera carga de cada ranura y la
pinta al pulsar; en desarrollo no se precarga y no se ve. Miembros y el
Público ya seguían este reparto.

⚠️ **La ventana de carga y la del formulario son LA MISMA ventana** (21/10/2026:
«lo abre, hace como si cargara, se cierra y lo vuelve a abrir»). Son dos
`<dialog>` distintos —`OverlayCargando` es el `fallback` y `OverlayRuta` el
contenido— y React retira uno y monta el otro en el mismo `commit`: el
segundo repetía la entrada entera y el fondo se volvía a fundir.
`continuidad-ventana.ts` cuenta las ventanas de carga en pantalla; la que
llega a sustituirla lo pregunta al montarse (`Overlay continua` →
`Modal`/`Sheet sinEntrada`) y aparece ya abierta, sin entrada y con el fondo
quieto (`.sinEntrada`). El aviso vale hasta el primer cierre, no una pasada
del efecto (React lo repite). Una ventana de carga nueva se registra con
`registrarVentanaDeCarga()`. **Y el cambio de tamaño se suaviza** (mismo día):
la ventana de carga anota su caja (`anotarCajaDeCarga`, sobre el
`[data-superficie]`) y la del formulario hace FLIP desde ella —solo
`transform`, `SPRING_MOVE`— mientras su contenido entra con un fundido algo
después, para que no se vea deformado. En el teléfono la hoja mide siempre
lo mismo: solo el fundido del contenido.

Tras mover o añadir rutas paralelas, **reinicia el servidor de desarrollo**: el
manifiesto de rutas queda obsoleto y la interceptación falla en silencio, lo que
parece un bug de código y no lo es.

---

## Componentes: usa los que hay

Todo vive en `src/components/ui/`, en **kebab-case**. Antes de crear uno, mira si ya existe.

Lo que es de un DOMINIO en vez de una primitiva de interfaz, pero lo comparten varias
rutas o varios portales, vive en `src/components/<dominio>/` — mismo principio que
`src/lib/`, aplicado a componentes: `novedades/` (`AvisoNovedad` y `ListaNovedades`, portal público y de
miembros) y `comercios/` (`CategoriasDirectorio`, directorio público y catálogo de
miembros: nació en `(publico)/explorar` y se movió aquí cuando el catálogo de
miembros dejó de tener su propia fila de chips para usar el mismo componente).
Si algo bajo la `_components/` de una ruta empieza a importarlo una segunda ruta,
esa es la señal de moverlo aquí — nunca duplicarlo.
`pie/` (`PieSitio`) es el pie de las puertas de socio y comercio (la de administración se retiró el 29/09/2026: el pie es público y no anuncia el panel): lo montan el Portal Público y,
desde el rediseño del 27/09/2026, el Portal de Miembros. Las clases de revelado al
desplazar (`REVELAR`, `revelarEscalonado`…) viven en `src/lib/shared/revelado.ts`
por la misma razón.

**Las categorías del directorio van A LA VISTA, en dos filas** (09/10/2026,
encargo del propietario; antes eran un botón «Categorías: Todas» que abría
una ventana). `CategoriasDirectorio` pinta dentro del panel de filtros,
DEBAJO del recuento y los filtros y separada de ellos por una línea fina
(`--border-subtle`; pedido así el mismo día), una tira de los círculos de siempre en DOS FILAS —una
sola lista en orden de lectura, con `--columnas` calculado— que se desplaza
de lado con desplazamiento nativo (dedo, rueda, panel táctil) y, con ratón,
con dos flechas en los cantos. La última ficha es «Ver más» («Ver todas»
mientras quepan): abre la ventana con TODAS y un campo para buscar por
nombre, sin tildes ni mayúsculas. La tira enseña hasta `LIMITE_TIRA` (24,
`lib/comercios/tira-categorias.ts`, probado), más cualquier ELEGIDA que caiga
después del corte. Favoritos, Ciudad y Ordenar siguen siendo píldoras, arriba.
No vuelvas al botón que las escondía.

**Las SUBCATEGORÍAS afinan la categoría elegida** (20/10/2026: «se
agregaron más, son categorías y subcategorías; ajusta el diseño»). No van en
la tira de círculos: al elegir una categoría que tiene subcategorías aparece
DEBAJO una fila de píldoras (`SubcategoriasDirectorio`) con «Todo» y cada
subcategoría con su icono; en el teléfono la fila se desliza de lado. En la
URL van en `subcategoria_id` (lista con comas, como las categorías) y la
lógica es pura y probada (`lib/publico/directorio.ts`): una subcategoría
elegida restringe SOLO su categoría —con «Gastronomía» y «Belleza» y
«Pizzerías» elegida, Belleza se ve entera—; apagar una categoría se lleva sus
subcategorías (`quitarSubcategoriasDe`). Solo salen las subcategorías con
algún comercio activo (`CatalogoPublico.categorias[].subcategorias`), y el
buscador de «Ver todas» encuentra la categoría por el nombre de una
subcategoría.

**Un comercio tiene de 1 a 3 categorías, cada una con su subcategoría
opcional** (21/10/2026; antes era una sola). La fuente de verdad es la tabla
`comercio_categorias` (`supabase/migrations/20261021130000_comercio_categorias.sql`;
comprobación en `supabase/verificacion/comercio_categorias_verificacion.sql`).
La base garantiza el tope de 3 y que la subcategoría sea de su categoría; el
mínimo de 1 lo exigen las server actions (`lib/comercios/categorias-comercio.ts`,
puro y probado). Se escribe SOLO con la función `reemplazar_categorias_comercio`
(transacción única, `service_role`): borra y reinserta las filas y copia la
primera (`orden = 0`) a `comercios.categoria_id`/`subcategoria_id`, que ya
nadie lee y se conservan para poder volver atrás. `authenticated` solo lee las
filas de comercios activos (la ficha del socio lee con su sesión). En el
directorio un comercio sale bajo CADA una de sus categorías, una sola vez, y
una subcategoría afina únicamente SU categoría: mirando fila a fila, afinar
«Gastronomía» no esconde lo que el comercio es en «Belleza»
(`filtrarDirectorio`, `ComercioFiltrable.categorias`). Tarjetas y fichas
muestran todas en una línea (`detalleComercio`: «Gastronomía (Pizzerías),
Belleza · Bogotá»). El formulario del panel es `CamposCategoria`: hasta 3
filas categoría + subcategoría.

**Cada categoría y subcategoría tiene SU icono, sin repetir** (mismo día:
«quiero que cada icono sea alusivo, no quiero nada repetido»). Las de hoy van
por nombre exacto en `EXACTOS` (`lib/comercios/iconos-categoria.ts`) y la
prueba falla si dos comparten clave; ningún glifo de `GLIFOS`
(`components/ui/icono-categoria.tsx`) se usa dos veces. Las palabras clave
quedan para las que se creen después. **Al crear una categoría o
subcategoría nueva en la base, añádela a `EXACTOS` con un glifo libre.**

**El horario de atención es de CADA sucursal** (24/10/2026; la dirección sigue
siendo opcional, no se hizo obligatoria). Vive en `sucursal_horarios`
(`supabase/migrations/20261024120000_sucursal_horarios.sql`; comprobación en
`supabase/verificacion/sucursal_horarios_verificacion.sql`): una fila por
sucursal y «día», 1 = lunes … 7 = domingo y **8 = festivos** (UNA regla para
todos los festivos; sin fechas sueltas). `abre` nulo = cerrado; **sin filas =
«sin horario cargado» y las fichas no dicen nada** (no «Cerrado»). Un `cierra`
menor o igual a `abre` es pasada la medianoche. El almuerzo es opcional y cae
dentro de la jornada. NADIE escribe con la sesión del navegador: solo la
función `reemplazar_horario_sucursal` (`service_role`), que además toca
`sucursales.updated_by` para que la bitácora anote la edición.

- **Lógica pura y probada** en `src/lib/comercios/`: `horario.ts` (validar,
  `estadoAhora`, `textoEstado`, `resumenHorario`), `festivos-colombia.ts`
  (Ley Emiliani + Pascua, calculados: no hay tabla de festivos que mantener),
  `horario-formulario.ts` y `horario-datos.ts` (lectura tolerante: sin la
  tabla devuelve vacío, nunca lanza). **TODO es hora de Colombia**
  (`ahoraEnBogota`), nunca la del navegador ni la del servidor. Un festivo usa
  la fila 8; sin esa fila, se rige por su día de la semana.
- **Se edita solo en el panel** (`EditorHorario`, dentro de `SucursalForm`, que
  manda el JSON en el campo oculto `horario`). El comercio NO lo edita desde
  «Mi negocio» (decisión del propietario; posible fase posterior). El editor
  ofrece UNA franja de almuerzo para todos los días abiertos.
- **Se ve en la ficha** (`HorarioSede`, de CLIENTE): las fichas salen de caché
  (`updateTag('publico')`) y un «abierto ahora» calculado en el servidor se
  quedaría viejo. `useInstanteAlMinuto` (`components/comercios/use-minuto.ts`,
  `useSyncExternalStore` con `getServerSnapshot` en `null`): el servidor
  pinta la semana y el navegador añade el estado y el día de hoy. Punto
  lleno/hueco **y** texto, nunca color solo. **Cuarta versión, 29/10/2026,
  MINIMALISTA** («todo muy exagerado, con tanta negrita, y ese círculo rojo
  se ve muy feo; algo minimalista que se entienda a la primera»). Es una
  fila más de la sede, como la dirección y el teléfono: el reloj dorado y
  una frase, «Cerrado ahora · abre hoy a las 6:00 p. m.», donde SOLO la
  palabra del estado lleva color (de texto: verde, ámbar o rojo, los tres
  AA sobre blanco) y peso 600; debajo, la semana en dos columnas, todo en
  peso normal. Con varias filas, la de hoy en tinta plena con «· hoy»
  discreto y el resto un paso más claro; con una sola, nada. **No vuelvas
  a la píldora con punto, al «HOY» negro, al título en versales, al
  recuadro hundido ni a la negrita.** De la tercera se conserva: los días
  con su nombre completo (`nombreDias`), las horas completas, un turno por
  renglón (`jornadaLegible`, `rangoCompleto`) y el almuerzo dicho con
  palabras. Todo texto con horas se pinta con
  `sinCortarHoras` (no parte «a. m.» ni un rango).
- **La sede, una fila por dato** (28/10/2026): dirección, teléfono y horario,
  cada uno con su icono DORADO a la izquierda y el texto en TINTA. **El
  teléfono va como la dirección** —enlace en tinta con el subrayado fino,
  agrupado con `telefonoLegible` («300 132 5756»)—, no en oro y negrita (el
  cliente no lo quiso así). Con varias sedes, su nombre encima y un filo
  fino entre ellas.
- Vista previa con datos falsos, solo fuera de producción: `/dev/horarios`
  (`?caso=vacio`, `?caso=noche`).

**Una promoción puede valer SOLO EN CIERTAS HORAS** (28/10/2026: «si los
descuentos aplican únicamente en horarios fijos, que también se pueda poner»).
Columna `promociones.franjas_horarias` (jsonb,
`supabase/migrations/20261028120000_promociones_franjas_horarias.sql`, SE
APLICA A MANO): `null` = todo el día, como antes; si no, franjas
`{dias, desde, hasta}`, CADA UNA CON SUS DÍAS («martes y miércoles de 8:00 a
9:30 y de 6:00 a 7:00 p. m.; sábado y domingo de 8:00 a 9:00» son cuatro
franjas), hora de Colombia, `desde < hasta` (no cruza la medianoche; «hasta
el cierre» es 23:59), hasta `MAX_FRANJAS` (6) y sin cruzarse el mismo día.

- **Lógica pura y probada** (`lib/comercios/franjas-promocion.ts`):
  `normalizarFranjas` (lee lo que venga, incluido `undefined` sin la
  migración), `validarFranjas`, `estadoPromocion`/`aplicaAhora` («Aplica
  ahora · hasta las 9:30 a. m.», «Hoy aplica desde las 6:00 p. m.», «Hoy no
  aplica»), `lineasFranjas` y `cuandoAplica`. Con franjas, `dias_semana` se
  guarda como la UNIÓN de sus días: lo que ya sabía de días sigue diciendo la
  verdad.
- **Se edita en el panel** (`EditorFranjas`, en `PromocionForm`, bloque
  «¿Cuándo se puede usar?», segunda versión del 29/10/2026: la primera
  escondía los días tras un interruptor y hablaba de «franjas», y no se
  entendía). Dos opciones: «Todos los días, a cualquier hora» o «Solo
  algunos días u horas». En la segunda, GRUPOS: unos días (píldoras) con
  «Todo el día» o «Solo en estas horas» («De [08:00] a [09:30]», «Añadir
  otra hora para estos días»), y «Añadir otros días con otro horario».
  Debajo, «Así lo verá el socio». Lo que viaja: nada (siempre); solo días →
  las casillas `dias_semana`; con horas → el JSON `franjas_horarias`, donde
  un grupo «todo el día» va como 00:00–23:59 (`esTodoElDia`, que todas las
  vistas leen como «Todo el día»). Los `name` de sus radios salen de
  `useId()`: con las `clave` de las filas, el HTML del servidor y el del
  navegador no coincidían.
- **Se cumple tres veces**: la caja apaga la promoción que no toca AHORA y
  dice por qué (`ahoraTexto`), la acción de la venta la rechaza
  (`aplicaAhora`) y `fn_validar_venta` también (la migración lo añade).
- ⚠️ **El código aguanta la base sin la migración**: las lecturas de
  `promociones` van con `select('*')` (trae la columna si existe, no falla si
  no) y la escritura (`escribirConFranjas`) reintenta sin ella; solo si la
  promoción LLEVA franjas avisa de que falta aplicarla.

**Los beneficios en la ficha del socio** (`BeneficiosSocio`; versión
MINIMALISTA del 29/10/2026: «mucha negrita, se ve muy cargado; que se
entienda a la primera»). El recuadro del beneficio (`.beneficio`) es una
TARJETA BLANCA con su sombra (nunca el crema) con el rótulo «Tus beneficios
ORUM» y la estrella. Cada beneficio: su icono por tipo en un aro FINO
dorado; el TITULAR (`asuntoDelTitulo`, `lib/comercios/titulo-beneficio.ts`:
el valor y, tras «·», en qué) en peso normal con el valor en 600 y
SUBRAYADO con un trazo fino dorado (el cliente pidió subrayado el 28/10; el
marcador grueso se retiró); la descripción en gris; CUÁNDO, con la misma
lectura que el horario de la sede: el calendario dorado, una frase de
estado donde solo la PALABRA lleva su color (`partesDisponibilidad`:
«Disponible ahora · hasta las 9:30 a. m.», «Disponible hoy», «Hoy desde
las 6:00 p. m.», «Hoy no disponible»; de cliente, `useInstanteAlMinuto`) y
debajo los días con sus horas (`cuandoUsarlo`), en peso normal; y
«Condiciones: …» pequeño y gris. **No vuelvas al recuadro hundido, al
rótulo «CUÁNDO PUEDES USARLO» en versales, a la píldora con punto ni a la
negrita.** La caja del comercio sigue con el texto corto del cajero
(`textoEstadoPromocion`). Entre beneficios, un filo fino. El título de una
promoción se escribe CORTO («Brunch»): lo pide la ayuda del formulario.
Vista previa con datos falsos (Coraje, el caso que lo pidió) y el editor de
franjas: `/dev/beneficios`.

`Button` `Spinner` · `Field` `Input` `Select` `SelectMenu` `Textarea` `Switch` `Checkbox` `Radio`
`SegmentedControl` · `Card` `FormCard` `Stack` `Grid` `Section` `PageHeader` `Divider` ·
`Badge` `StatusBadge` `VenceEn` `Avatar` `Cifra` `CifraAnimada` · `Alert` `Toast` · `Modal` `Sheet`
`Overlay` `DropdownMenu` `MenuItem` · `Skeleton` `ProgressBar` `EmptyState` `ErrorState` ·
`DataList` `AccionEstado` `Copiar` · `PantallaAuth` `ComercioLogo` `QrCode` `WhatsAppButton`
· `Agitar`

**`SelectMenu`** (04/10/2026) es un desplegable CON DISEÑO: el campo se ve
como un `Input` y la lista que abre es el `DropdownMenu` del sitio, no la del
sistema (en Windows, un recuadro gris que el CSS no puede vestir). Nació para
la sucursal de la venta en la caja («ponle diseño a la lista desplegable»).
Va dentro de un `Field` y el valor viaja en un campo oculto con su `name`.
**No valida solo** —un campo oculto no admite `required`—: quien lo usa
comprueba el valor al enviar y le pasa el error al `Field`. ⚠️ **Desde el
15/10/2026 SÍ sustituye a `Select` en los formularios del panel** (encargo:
«las listas desplegables no tienen diseño»; antes esta línea decía lo
contrario). Sin `value` guarda su propio estado desde `defaultValue`, como un
`<select>`, y al cambiar su campo oculto avisa con un `input` que burbujea:
así lo oye `useValidacion`. `DropdownMenu` ganó para esto la prop
`igualarAncho` (la lista mide lo que su campo).

**`Agitar`** envuelve un icono y lo agita **una vez** cuando su prop `activo`
pasa de `false` a `true` — el acento de «seleccionado» en un filtro. Se le pasa
el mismo booleano que ya pinta el estado; no hay que disparar nada. No se agita
al montar ni al apagarse. Lee su cabecera antes de usarlo: una agitación
significa «error» en casi todas las interfaces, y lo que la convierte aquí en
«seleccionado» es que sea corta, pequeña y **sin repetición**. Y **nunca es el
único portador**: `prefers-reduced-motion` la retira entera, así que el estado
tiene que verse igual con color, texto y `aria-pressed`.

**Las reseñas de comercios** (20/10/2026). El socio puntúa de 1 a 5 estrellas
enteras, con mensaje opcional (≤500 caracteres, sin enlaces ni marcado): una por
socio y comercio, que él edita o borra. Solo reseña quien tiene una venta en
ese comercio y una membresía vigente (crear y editar; borrar no exige
vigencia). Cada reseña admite una respuesta del comercio y una de ORUM (columnas
en la misma fila); la del admin se muestra como «ORUM».

- **Tabla `resenas`** (`supabase/migrations/20261020150000_resenas.sql`;
  comprobación en `supabase/verificacion/resenas_verificacion.sql`). NADIE
  escribe con la sesión del navegador: `anon`/`authenticated` no tienen
  privilegios. Las server actions escriben con `service_role` tomando socio y
  comercio de la SESIÓN, y el trigger `trg_resenas_validar` es la barrera
  real. Los socios leen con `resenas_resumen`, `resenas_de_comercio` y
  `puedo_resenar` (autor «María G.»); comercio y admin, con el cliente de
  administración filtrado (el comercio de la sesión / un id validado tras
  `requireRol('super_admin')`).
- **Dónde viven**: reglas puras en `src/lib/resenas/` (`resenas.ts`, `mapeo.ts`,
  `datos.ts`), estrellas en `components/ui/estrellas*.tsx`, el resto en
  `components/resenas/`. Acciones del socio
  (`miembros/(portal)/comercios/resenas-actions.ts`), del comercio
  (`comercios/(portal)/resenas-actions.ts`) y del panel
  (`admin/comercios/resenas-actions.ts`: pestaña «Reseñas» de la ficha, de a 25,
  solo `super_admin`). Eliminar y responder del admin se anotan en
  `bitacora_actividad` (entidad `resena`, sin el texto de la reseña).
- Vistas previas con datos falsos, solo fuera de producción: `/dev/resenas`,
  `/dev/resenas-comercio`, `/dev/resenas-admin`.
- **El diseño, unificado** (29/10/2026: «se implementó la funcionalidad pero
  no se detalló el diseño»). Los tres portales pintan con las MISMAS piezas
  de `components/resenas/` y UNA hoja (`resenas.module.css`; las dos copias
  de la caja y del panel se borraron): `ResumenResenas` (el título con
  `TituloSeccion` de bloque y el promedio en el serif de la marca con sus
  estrellas), `TarjetaResena` (avatar con iniciales, decorativo; nombre y
  fecha; las estrellas con lo que significan —`etiquetaEstrellas`: Malo ·
  Regular · Bueno · Muy bueno · Excelente—; las respuestas colgando de un
  filo fino, la del comercio con su tienda y la de ORUM con la estrella),
  `ZonaAviso` (el `role="status"` y el error) y `FormularioRespuesta` (el
  comercio y ORUM responden con el mismo; cada portal pasa su acción). Peso
  normal en casi todo; **nada en crema**: la reseña propia y la invitación
  son tarjetas BLANCAS con su sombra, y la cita de la ventana de responder
  es un filo dorado de 1px.
- **Calificar es tocar una estrella**: el socio que puede reseñar ve «¿Cómo
  te fue en X?» con las cinco estrellas A LA VISTA (`EstrellasAccion`,
  botones, no radios: elegir abre una ventana), y la ventana abre con esa
  nota puesta. Su reseña lleva «Editar» y «Borrar» en la cabecera. Quien no
  puede reseñar lee una línea que dice cuándo podrá.
- **El movimiento**: en el selector las estrellas se llenan de la primera a
  la elegida (30 ms entre una y otra), la elegida da un salto corto SOLO al
  tocarla (no al montar), y el significado cambia con un fundido; la lista
  entra escalonada en la primera pintura (`--escalonado`, tope de 8); el
  aviso y la tarjeta propia aparecen con un fundido y un desliz de 6px. Todo
  `transform`/`opacity`, y fuera con movimiento reducido.

**`ComercioLogo` pinta un CÍRCULO** en sus tres variantes (`tarjeta` 72px,
`hero` 144px, `portada` responsiva). `object-fit` se queda en **`contain`**: un
logotipo apaisado deja aire arriba y abajo, y eso es preferible a recortar la
marca. Si alguien propone `cover` «para llenar el círculo», el porqué de que no
está escrito en `comercio-logo.module.css`.

**`DataList` sustituye a toda tabla.** Es una tabla semántica que CSS convierte en
tarjetas bajo 768px. Nunca scroll horizontal en móvil.

**`<Card principal>`** sube un escalón de sombra (de `--shadow-card` a
`--shadow-raised`). Una por pantalla, y solo la que de verdad es el elemento
principal. No lo pongas «porque queda bien»: si dos tarjetas lo llevan, ninguna
lo lleva. Ya no es un trazo de 2px — ese lenguaje se retiró con la v3.

**`<Card sunk>`** se hunde con `--shadow-hundida` (una sombra `inset`) más un
hairline. No se tiñe: `--surface-sunk` es el mismo papel que todo lo demás.

**`escalonado` en `Stack` y `Grid`** da la entrada escalonada sin plumbing:
`--escalonado` de paso y tope de 8, resuelto con `nth-child`, así que funciona
con cualquier hijo sin clonar elementos.

**`Cifra`** para todo número de negocio (etiqueta + valor tabular + nota). No la
reimplementes en la página: el panel de inicio ya lo hizo y hubo que extraerla.
`size="display"` la pone en el peldaño ceremonial a 36–52px (peso 700).

**`<Section tono>`** es la herramienta tonal: `crema`, `honda` o `negro`. ⚠️ `crema` y
`honda` son nombres heredados de la v4 y ya no describen su color:
`crema` = gris claro, `honda` = gris hondo, `negro` = **negro** (antes `cacao`).
Es lo que da estructura a una pantalla ancha sin dibujar una línea. La franja `negro` remapea
sus tokens de texto hacia dentro y es el único sitio del sistema donde el oro
brillante (`--gold-400`, `--gold-300`) es legal.

**`<PageHeader display>`** pone el `h1` en el peldaño `hero` a 44–72px (peso
800). Ya no es una cuestión de familia: es una cuestión de que 72px de titular en
una pantalla de caja es espacio robado a la tabla.

**`MenuItem submit`** cuando la acción del menú es una server action: renderiza un
`<button type="submit">` dentro del `<form>` que envuelve al menú, así funciona sin
JavaScript. `MenuItem href` renderiza un `<Link>` — nunca un `<a>` dentro de un `<button>`.

**`PantallaAcceso`** (`src/components/ui/pantalla-acceso.tsx`) es la envoltura de
TODA pantalla de acceso: socios, comercios, administración, recuperar contraseña y
activar cuenta. Tiene el estilo del Portal Público (encargo del propietario,
03/10/2026: primero la puerta del socio, y el mismo día «el mismo estilo a todos
los logins, pero que cada uno tenga un mensaje diferente»): la foto de marca del
héroe con el logotipo en plata a un lado y el formulario sobre blanco al otro,
siempre en claro (`data-theme="light"`), con `TituloSeccion` y el botón en píldora
en el oro de marca (`--gold-500` como RELLENO, con texto en tinta). Son puertas al
mismo club y cambian siempre a la vez; lo que las distingue es la prop **`puerta`**
(`socio` · `comercio` · `admin` · `activar` · `recuperar`), que elige el mensaje
sobre la foto (`MENSAJES`, en el propio componente), más el titular, el apoyo y
los campos. La pantalla mide lo que la ventana y no desplaza: se adapta por alto
y ancho con `@media` (no hay contenedor `contenido` fuera de los portales).

La antigua **`PantallaAuth`** (tarjeta oscura con halo) se retiró ese día. De su
módulo queda `estilosAuth` (`pantalla-auth.tsx`), de donde los formularios siguen
tomando sus clases — la sacudida al fallar usa `:has(.alerta)` y ambas clases
deben salir del mismo módulo CSS.

**El Panel de Administración** (`AppShell`, `src/components/shell/`,
tercer rediseño, 15/10/2026). El propietario rechazó la barra de opciones
negra y la paleta de comandos («los atajos, el diseño y en general todo no
me gusta; quiero algo muy profesional, agradable a la vista y sencillo»).
La propuesta aprobada es el artifact «ORUM — Rediseño Panel de
Administración». No vuelvas a la barra de opciones horizontal ni a la
paleta:

- **La barra lateral, negra, a la izquierda** (≥768 px): logotipo en
  plata, las secciones en grupos (sin título, «Análisis», «El club») y la
  cuenta al pie (círculo PLATEADO con las iniciales y su menú). La sección
  activa la dice un **filo PLATEADO muy sutil** con un brillo apenas
  visible, el texto blanco y el icono en plata — nunca oro, nunca relleno
  (pedido así: «un borde muy sutil y que sea plateado»; el oro y el punto se
  probaron y no gustaron). Al pasar, el texto se aclara y el icono se
  desliza. **El plateado es el acento del cromo negro** («juega mucho más
  con el plateado»); el oro queda para la acción principal.
- **La barra de arriba, blanca y pegada**: «Panel / sección», el
  **buscador** y «Registrar miembro» en oro. En el teléfono, el logotipo en
  oro a la izquierda y la barra inferior negra con la hoja «Más» (la activa,
  en plata).
- **El buscador (`BuscadorPanel`) sustituye a la paleta**: un campo normal
  que, al escribir, despliega debajo los miembros (con su estado y
  «Renovar» al lado si está vencido o por vencer) y las acciones que casan
  (`acciones-panel.ts`). **No se enseña ningún atajo** («no quiero que
  aparezcan comandos»): Ctrl/⌘+K y «/» siguen llevando al campo, en
  silencio. `enfocarBuscador()` (un evento) lo pide desde fuera — lo usa la
  pestaña «Buscar» del teléfono.
- **Los botones secundarios del panel no tienen borde**: píldora blanca con
  sombra que sube al pasar y se hunde al pulsar. Los ganchos
  `--boton-secundario-*` de `button.module.css` los pone el shell; fuera
  del panel no cambia nada. Los **campos donde se escribe sí conservan su
  filo** (accesibilidad).
- **La portada** (`admin/_components/inicio-panel.tsx`; `page.tsx` solo
  consulta): saludo con el nombre del empleado, cuatro cifras centradas,
  «Vencen esta semana» con «Renovar» y el vencimiento **con color según la
  urgencia** (rojo hoy, naranja mañana, ámbar ≤3 días, azul el resto;
  siempre con texto), los botones de «Crear» sueltos (sin panel ni título)
  cada uno con su icono y color, y la actividad reciente de la bitácora.
- **Las listas del panel** llevan `Pestanas` (`components/ui/pestanas.tsx`:
  franja gris suave, la elegida en píldora blanca con sombra, punto de color
  y recuento; son enlaces; la píldora SE DESLIZA a la pulsada en el acto
  —FLIP con `element.animate`, solo `transform`, `--dur-slow`/`--ease-out`—
  sin esperar a la página), herramientas (buscador GET, filtros como
  `DropdownMenu` con `MenuItem href`, orden) y `Paginacion` (25 por página,
  `lib/shared/paginacion.ts`). Todo en la URL. La primera es Miembros
  (`ListaMiembros`; pestañas Todos / Vigentes / Vencidas —la membresía
  tiene DOS estados; «Vencen pronto» se quitó porque se leía como un
  tercero, y «Sin membresía» solo sale si hay alguno—; la lógica pura en `lib/miembros/listado.ts`, la carga en
  `cargar-listado.ts`, que pide las tablas por páginas de 1000 porque
  PostgREST corta ahí). Las tablas (`DataList`) toman en el panel la
  cabecera en banda gris y títulos en minúscula por los ganchos
  `--tabla-*` que pone el shell.
  Comercios sigue el mismo patrón (`lib/comercios/listado-admin.ts`, puro y
  probado): pestañas Todos / Activos / **Sin promociones** / Inactivos,
  buscador sin tildes, categoría, y en cada fila el logotipo y cuántas
  sucursales y promociones ACTIVAS tiene. Las hojas de las listas son una
  sola, `src/styles/lista-panel.module.css` (antes vivía dentro de
  miembros y Comercios se quedó sin estilo al rehacerla). Usuarios lleva
  pestañas Todos / Administradores / Empleados / Sin acceso (`?ver=`), y la
  Bitácora filtra la acción con pestañas (Todas / Altas / Ediciones /
  Renovaciones) en vez del desplegable del sistema.
- **La ficha del comercio es UNA página con pestañas** (`?pestana=`
  datos · sucursales · promociones · imagenes, con recuento): cabecera con
  su logotipo y su estado, y cada parte debajo. «Datos» se edita AHÍ MISMO
  (`EditarComercioForm enPagina`), con un pie pegado que dice «Tienes
  cambios sin guardar» (lo calcula `useValidacion`: `sinGuardar`) y
  «Descartar»; a la derecha, las dos decisiones de estado (visible para los
  socios / acceso a su herramienta), cada una en su tarjeta. Las acciones de
  sucursales y promociones vuelven a SU pestaña, y todas las del comercio
  sueltan la caché `publico`. Nuevo/editar sucursal o promoción siguen
  abriéndose encima. WhatsApp e Instagram del boceto NO están: la tabla
  `comercios` no tiene esas columnas.
- **Los formularios del panel VALIDAN campo a campo** (15/10/2026: «sus
  formularios no tienen excepciones»). Las reglas son puras y probadas
  (`lib/validacion/reglas.ts`: obligatorio, largo, nombre de persona, cédula,
  teléfono y correo —los mismos de «Quiero ser aliado»—, entero, precio,
  porcentaje, fecha, «no antes de», contraseña…), y cada formulario declara
  las suyas en un `REGLAS` arriba. `useValidacion(REGLAS)`
  (`components/ui/validacion.tsx`) se extiende sobre el `<form>`: al enviar
  revisa todo, NO envía si algo falla, marca cada `Field` con su `error` y
  lleva el foco al primero; al salir de un campo escrito lo revisa ya; al
  corregir, el aviso se va (y se revisan otra vez todos los avisados, porque
  hay reglas que dependen de otro campo). `ResumenErrores` pone arriba
  «Revisa N campos» con un botón a cada uno. El servidor sigue validando: es
  quien decide. Los importes se escriben como la gente los escribe
  («$ 120.000») y el servidor los lee con `leerPesos`, nunca `Number()`.
  Un formulario nuevo del panel lleva sus `REGLAS`; nada de `type="number"`
  para dinero (en Chrome rechaza los puntos de miles en silencio).
- `/dev/shell` la enseña con datos falsos (rol, sección simulada, portada y
  la lista de miembros).

**La Herramienta de Comercios** (`src/app/comercios/(portal)/`, rediseño del
04/10/2026) es la tercera cara de la fachada. El layout pone la cabecera del
Portal de Miembros (importada, no copiada), **el banner** —la foto de marca
con el logotipo y el nombre del comercio, que es el `h1`: dice quién opera la
caja— y el pie del sitio. El banner vive en el layout y no en la página
porque el portal tiene UN destino: así el esqueleto de carga y la frontera de
error se pintan debajo de él y nada salta. La página monta sus tarjetas
SOBRE el canto del banner (`--monta`): a la izquierda la tarjeta de buscar
(escanear o teclear el número) y a la derecha las promociones vigentes y la
ayuda por WhatsApp; en el teléfono, una sola columna. Sus superficies son
`.tarjeta` de `verificar.module.css` (radio `--radius-lg`, como los paneles
de la fachada), no `Card`. `obtenerMiComercio` (`lib/comercios/comercio-sesion.ts`)
es el comercio de la sesión, con `cache`: lo piden el layout y la página.

**El resultado de buscar llega en una VENTANA encima, no debajo** (encargo del
04/10/2026: «quiero que sea una ventana encima; no quiero que vaya debajo»).
`VentanaVeredicto` es un `Modal desnudo` —la ventana ES la tarjeta, como el
carnet—: su cabeza es la franja del veredicto (color sólido, punto lleno /
hueco, pegada arriba al desplazar), debajo el socio —con **su foto del
carnet** para cotejar la cara (05/10/2026; sin foto, las iniciales): la
función `buscar_miembro_comercio` no la trae, así que `buscarMiembro` la pide
aparte con la `service_role`, solo esa columna y solo del miembro ya
resuelto—, y si la membresía vale,
el formulario de venta; al registrar, la ventana entera pasa a ser el acuse.
Tres cosas que no son obvias:

- **El estado de la búsqueda vive en `VerificacionTool`, no en la tarjeta de
  buscar.** La tarjeta se remonta al cerrar la ventana (para volver al
  reposo) y la ventana tiene que seguir pintando al socio mientras se anima
  su salida. Cerrar no borra el resultado: lo marca como descartado por su
  `consultaId`, que el servidor renueva en cada búsqueda.
- **No se cierra al pulsar fuera** (`Modal cerrarAlPulsarFuera={false}`): hay
  un importe a medio teclear. La cierran su X, Escape y «Verificar otro socio».
- **El foco inicial va a la X por el atributo `autofocus`**, puesto con un
  `ref`. La ventana desplaza por dentro, Chrome hace enfocables los
  contenedores con desplazamiento, y `showModal()` le daba el foco a la
  tarjeta entera. La prop `autoFocus` de React no sirve aquí: enfoca al
  montar, con el diálogo todavía cerrado.

**El acuse de la venta es un RECIBO** (`acuse-venta.tsx`, 04/10/2026). Es la
tercera versión, y las dos primeras están descartadas por el propietario: el
acuse negro y oro con estallido de estrellas («no me gusta que sea de color
negro») y el mismo sobre blanco («no me gusta el diseño ni la animación;
busca referencias de 2026; debe ser elegante»). **No vuelvas a ninguna de las
dos**: ni fondo negro, ni disco de oro macizo, ni estallido, ni olas de color.
Lo que hay, y viene de las referencias de pantallas de pago (contención antes
que adorno; marca ligera, monto grande, a quién y cuándo):

- Una tarjeta **blanca, entera**. Arriba, el logotipo de ORUM en oro (pequeño,
  como membrete), la marca y el monto. Abajo, los renglones —socio, membresía,
  compra y descuento si lo hubo, hora— bajo una línea de corte discontinua.
  **El talón NO va en crema**: se probó y el propietario no quiso ese color.
- **Cabe en la ventana, sin desplazar** («que no me tenga que desplazar para
  abajo, que se vea todo»). Las medidas verticales son `clamp()` contra el
  alto de la ventana (`dvh`): a 1366 × 635 con descuento mide 557 px. Si
  añades un renglón o subes un relleno, vuelve a medirlo a esa altura.
- **La marca es de LÍNEA**: un anillo fino que se cierra y la ✓ que se dibuja
  dentro. Un solo oro (`--brand` / `--brand-edge`), nada relleno salvo el botón.
- **Las estrellas de ORUM** (`EstrellaOrum`, la imagen del cliente) van como
  una constelación a los lados de la marca: salen del centro cuando el anillo
  se cierra y se quedan titilando, cada una a su ritmo. Pedidas expresamente
  («añade las estrellas de ORUM y anímalas para que tenga más dinamismo»). No
  son el estallido descartado: son pocas, a los lados, y no tapan nada.
- **El monto RUEDA** dígito a dígito, como un odómetro, en el serif de display
  y en tinta. No cuenta de cero al total.
- Dura algo más de un segundo. Es **solo `transform` y `opacity`** (el anillo
  son dos medias lunas que giran; la ✓, dos traslaciones opuestas), **no hace
  esperar** («Verificar otro socio» está enfocado y pulsable desde el primer
  fotograma) y con **movimiento reducido** cada pieza queda en su estado
  final. En su CSS el estado BASE es el final y los `@keyframes` solo dicen de
  dónde viene cada pieza; las duraciones salen de los tokens.

El monto, la compra y el descuento del recibo los dice el servidor
(`RegistrarVentaState`), no lo que había tecleado el cajero.

El formulario de venta: la promoción y la sucursal son dos `SelectMenu` que
arrancan vacíos a propósito —preelegir una sucursal atribuiría la venta a una
sede que nadie eligió— y se comprueban al enviar. **No existe «Sin
promoción»** (propietario, 05/10/2026; antes eran radios de un toque con esa
opción marcada): con promociones vigentes hay que elegir una, y solo un
comercio sin ninguna registra la venta sin promoción. El importe tampoco
lleva `required`: los tres campos se comprueban en `alEnviar` y se marcan a
la vez con el mismo aviso del sitio (el globo del navegador cortaba el envío
antes de marcar los otros dos). El total
con el botón de cobrar van en un pie pegado abajo, siempre a la vista. El
monto del acuse lo dice el servidor (`valorFinal`), no lo tecleado.

**El comercio cambia su logotipo y sus fotos** («Mi negocio», 04/10/2026,
`_components/mi-negocio.tsx`). Un botón en la cabecera abre una ventana
encima —no una página— con el logotipo y las fotos del negocio, y cada
imagen se AJUSTA antes de subirla, como la foto del socio:

- **Ocho fotos como máximo, contando la portada** (`portada_url` + filas de
  `comercio_imagenes`). La primera es la portada. El tope vive en
  `lib/comercios/fotos-negocio.ts` y lo comprueban la interfaz y el servidor.
- **El editor es `EditorEncuadre`** (`components/imagenes/`): arrastrar,
  acercar (barra, rueda, pellizco), girar y restablecer, para cualquier marco.
  Su geometría es `lib/imagenes/marco.ts` (probada aparte); el editor del
  socio y su `encuadre.ts` NO se tocaron. Las fotos van a 16:9 (la portada de
  la ficha); el logotipo, a un círculo en el que puede verse ENTERO —cabe su
  diagonal, no solo el cuadrado— sobre blanco, que es como lo pinta la placa.
- **Las acciones** (`comercios/(portal)/imagenes-actions.ts`) toman el
  comercio de la SESIÓN, nunca del formulario, y buscan cada foto con
  `comercio_id = el mío`: usan la `service_role`, así que esa comprobación es
  la política. Al guardar sueltan la caché pública con `updateTag('publico')`
  para que la ficha enseñe la imagen nueva al momento.
- Las imágenes de un comercio quedan fuera de la declaración de derechos del
  socio (spec de derechos de imagen, §3): no se pide aquí.
- **Las FOTOS se pueden poner ENTERAS** (23/10/2026, petición del
  cliente: «que las imágenes que suben los comercios y el administrador no
  se corten automáticamente; tener la opción de ponerla completa»). Los
  marcos rectangulares —fotos del negocio en «Mi negocio» y en el panel,
  publicidad de la portada e imagen de una novedad— llevan `completa: true`
  (`Marco`, `lib/imagenes/marco.ts`, probado): un archivo nuevo ARRANCA
  entero y un selector «Imagen completa / Llenar el marco» cambia entre los
  dos (solo sale si la foto no tiene ya la proporción del marco,
  `mismaProporcion`). **Entera, el marco es el de la PROPIA foto**
  (`marcoDeLaImagen`): se ve y se guarda tal cual, con su proporción y SIN
  BORDES —el lado largo mide `anchoSalida`, `medidaDeSalida`—, y no se
  acerca ni se arrastra (girarla la deja entera). ⚠️ Primero se rellenó el
  hueco con la misma foto difuminada y el cliente no lo quiso («que se vea
  completa y ya, sin esos bordes»): **no lo vuelvas a poner**. Una foto ya
  publicada se abre como se guardó (si tiene la proporción del marco,
  llenándolo; si no, entera). El logotipo no cambia: ya podía verse entero.
  ⚠️ **Al MOSTRARLAS, las fotos LLENAN su caja (`cover`)** y solo se ven
  enteras al tocarlas, en el visor (propietario, 23/10/2026: «me gusta
  mejor que rellenen el espacio faltante; que se vean completas si le doy
  clic, como antes; pero cuando se suba la imagen, que se vea completa»).
  Se probó pintarlas enteras en todas partes (tarjetas del directorio y de
  destacados, galería, carrusel, novedades) con la foto difuminada de
  relleno, y no gustó: **no lo vuelvas a poner**. Lo entero vive en el
  EDITOR, al subirla, y en el visor.
- **«Editar» abre la imagen que YA está**, no el selector de archivos
  (`useImagenElegida().abrirActual`: la descarga como datos, porque pintarla
  desde su URL contaminaría el `canvas`). Desde el editor, «Elegir otra» la
  reemplaza. Una imagen ya publicada arranca **como se ve**
  (`encuadreInicialEnMarco(…, comoSeVe)`): abrir y guardar sin tocar no la
  encoge. Si no se puede descargar, el aviso ofrece elegir un archivo.
- **El ajuste es un paso, no la ventana**: su X, «Cancelar» y Escape
  (`Modal onAtras`) vuelven a la rejilla sin guardar. Lo mismo en «Mi foto»
  del socio. Un editor de imagen nuevo sigue esta regla.

**El socio cambia su foto UNA VEZ AL MES** (29/10/2026, encargo del
cliente: «subir o cambiar su foto una vez al mes, y eliminarla cuando
quiera; pero si la puso y la eliminó en el mismo mes, no puede volver a
subirla»). Mes del CALENDARIO en hora de Colombia
(`lib/miembros/foto-mensual.ts`, puro y probado): quien la cambió el 30 de
octubre vuelve a poder el 1 de noviembre. Lo que gasta el cambio es SUBIR;
«Quitar mi foto» (nuevo, `quitarMiFoto`, con confirmación en la misma
tarjeta) se puede siempre y no lo devuelve. **No hay columna nueva**: la
fuente es la bitácora, donde cada foto que sube el socio ya quedaba anotada
(`entidad 'miembro'`, `datos_nuevos.origen = 'portal_miembro'`, `foto_url`
no nulo; `fotoDelMes`, `lib/miembros/foto-socio.ts`). Si la bitácora no se
puede leer, no se bloquea a nadie. Los cambios del panel (administrador y
empleados) llevan otro origen y NO cuentan: la regla es solo del socio. La
acción `guardarMiFoto` es quien decide; el editor lo dice antes (foto
quieta y «Podrás cambiarla de nuevo el 1 de …»). Vista previa con datos
falsos: `/dev/foto` (`?caso=bloqueada`, `?caso=sinfoto`).

**El panel edita las imágenes de un comercio igual que el comercio**
(13/10/2026; `admin/comercios/[id]/imagenes`, `GestorImagenes`). Antes eran
tres subidas de archivo y una lista con «orden» numérico: no se podía
encuadrar ni quitar el logotipo o la portada. Ahora es la rejilla de «Mi
negocio» con lo que añade el administrador: el logotipo en su círculo
(«Editar», «Quitar»); la portada primero y la galería detrás, cada foto con
sus acciones DEBAJO (mover con flechas, editar, quitar); y el ajuste en una
ventana encima con `EditorEncuadre` (y la descripción, en las de galería).
Las opciones del marco son LAS MISMAS que en «Mi negocio» (círculo que deja
ver el logotipo entero; fotos a 16:9): las dos puertas producen la misma
imagen. Respeta el mismo tope de ocho fotos, y sus acciones
(`admin/comercios/imagenes-actions.ts`) sueltan la caché `publico`.
`ordenTrasMover` (`lib/shared/orden.ts`) es el de la publicidad.
**Cualquier foto de la galería puede ser la portada** (la estrella;
`usarFotoComoPortada`): es un INTERCAMBIO, la portada que había ocupa el
puesto de la elegida. ⚠️ La portada subida vive en una ruta de nombre fijo
(`portada.ext`) que la siguiente subida pisa: antes de bajarla a la galería
el archivo se MUEVE a una ruta de galería. Y por lo mismo, al subir una
portada nueva se borra la anterior si vivía en otra ruta (también en las
acciones del comercio).

**TRES aplicaciones instalables, una por portal con sesión** (29/10/2026,
encargo del propietario: «descargar la aplicación en todos los portales
excepto el inicial; comercios, usuarios y administrador, cada uno con su
logo»). Todas llevan la «O» con la estrella del cliente, cada una en su
color: **socio** dorada sobre BLANCO (abre en `/miembros`, `scope: '/'`),
**comercio** dorada sobre NEGRO (`/comercios`) y **panel** plateada sobre
NEGRO (`/admin`, la de antes abría en `/miembros`). Cada una tiene su
manifiesto (`manifest-miembros|comercios|admin.webmanifest`, Route
Handlers que salen de `lib/shared/manifiesto-app.ts`: nombres, colores,
iconos, atajos) y su `id`, así que son aplicaciones distintas en el
teléfono. Las enlaza el layout de cada portal y de su acceso
(`miembros/layout.tsx` y `comercios/layout.tsx`, que no pintan nada;
`admin/layout.tsx`; `login/page.tsx`), con su `apple-icon.png` en la misma
carpeta (iOS). ⚠️ **Ya no existe `app/manifest.ts`**: lo enlazaba TODO el
sitio, también la portada pública, que NO se instala; no lo vuelvas a
crear. El socio conserva su `id` (`/miembros`): las instaladas siguen
siendo la misma app. Los iconos (`public/icons/{socio,comercio,admin}-*`)
son PNG opacos generados desde `marca/monograma.png` y
`monograma-plata.png`; si cambia el monograma, se regeneran. Los botones:
`AvisoInstalar` y el icono del pie en miembros y comercios; en el panel,
el menú de la cuenta (escritorio) y la hoja «Más» (teléfono). Los
`public/icons/orum-*` viejos ya no los usa ningún manifiesto.

**La marca del cliente son imágenes, no texto.** Logotipo «ORUM» (plata,
dorado, blanco, negro), monograma y estrella viven recortados en
`src/components/ui/marca/` y se usan con `LogoOrum`, `MonogramaOrum`,
`EstrellaOrum` y `AdornoEstrella` (`marca.tsx`), que solo piden el ALTO por
clase. Vive en `components/ui` y no bajo `(publico)` porque ya la consumen
los cuatro portales, no solo la fachada. No se vuelve a escribir «✦ ORUM» con
la tipografía: los originales de Supabase (`recursos-sitio/`) traen lienzos
de 1280×720 casi vacíos, por eso se recortaron. **Sobre negro, plata; sobre
blanco, oro** (propietario, 26/09/2026): el dorado del cliente casi no se
veía sobre la banda negra, así que cabecera, pie, cierre y héroe del público
y las seis pantallas de acceso usan las piezas `-plata`
(`tono="plata"`/`variante="plata"`). El carnet volvió a `dorado` con la Z2
(ver «El carnet, Z2» más abajo): su fondo ya no es negro. La estrella se repite como acento con
`AdornoEstrella` AL LADO de los títulos de sección (dentro del `<h2>`, nunca
encima); siempre decorativa (`aria-hidden`). La imagen para compartir en
redes es `(publico)/opengraph-image.jpg` (logo dorado sobre negro, el JPG con
fondo incrustado: solo ahí).

**La foto de marca es UN archivo** (`src/components/ui/marca/foto-hero.webp`,
1672×940) y la usan cuatro sitios: el héroe de la portada, el banner del
directorio (público y miembros), el banner de comercios y las pantallas de
acceso. Desde el 04/10/2026 es una **familia en el café** que ocupa todo el
ancho (antes, una socia sola a la derecha): al cambiarla hay que revisar el
`object-position` de los cuatro, no solo el archivo. Hoy: héroe `72%` en el
teléfono y centrada en escritorio (el velo izquierdo sostiene el titular
sobre el padre y el hijo); banners `60%` en el teléfono y `center 8%` en
escritorio (las caras están en el tercio superior: con `35%` quedaban tras
la cabecera); acceso `86%` (más al centro, el padre sale cortado por la
mitad).

**El carrusel de la portada es PUBLICIDAD del administrador** (13/10/2026;
antes eran las portadas de los comercios y nadie podía cambiarlas). Vive en
la tabla `publicidad` (`supabase/migrations/20261013120000_publicidad.sql`)
y se gestiona en `/admin/publicidad` (solo super administrador, en la barra
junto a Novedades): `GestorPublicidad` es una rejilla con cada imagen en su
puesto y sus acciones debajo —mover antes/después (botones, no arrastre),
ocultar sin borrar, editar y quitar— y el ajuste en una ventana encima con
`EditorEncuadre` y la descripción (su texto alternativo). Cuatro cosas:

- **El marco es 4:3, y el carrusel también, en todos los anchos**
  (`que-es-orum.module.css`): lo que se encuadra es lo que se ve. Si cambia
  una proporción, cambia la otra.
- **Tope de 10** (`lib/publicidad/publicidad.ts`, puro y probado), que
  comprueban la interfaz y el servidor. Las imágenes van al bucket
  `imagenes-anuncios`, carpeta `portada/`, con clave nueva en cada subida.
- ⚠️ **Nada que llegue al navegador se llama «publicidad», «ads», «banner»
  ni «anuncio»** (esta última, desde el 21/10/2026: el aviso de novedades se
  llamaba `anuncio-banner` y su enlace no respondía en el navegador del
  propietario; ahora es `aviso-novedad`, y la hoja del formulario,
  `novedad-form`): ni la carpeta de Storage ni un módulo CSS (su nombre acaba en
  las clases). Los bloqueadores de anuncios ocultan esas direcciones y
  clases: el primer día la carpeta se llamó `publicidad/` y la imagen no se
  veía en el navegador del propietario, ni en el panel ni en la portada. Por
  eso el componente vive en `gestor-portada.tsx`. La ruta del panel y la
  tabla sí pueden llamarse así.
- **`obtenerPublicidadPublica` devuelve `null` si la tabla no existe** y la
  portada cae a las portadas de los comercios: el esquema se aplica a mano y
  el código puede llegar antes. Con la tabla creada manda solo lo que ponga
  el administrador; vacía = sin carrusel.
- Las acciones sueltan la caché con `updateTag('publico')`: el cambio se ve
  al momento, no al minuto.

**Las NOVEDADES, rediseñadas** (21/10/2026: «el fondo negro no me agrada;
"Ver más" se ve muy vacío; editar novedad está feo y complicado, y no me deja
borrar la imagen»). Tres piezas:

- **El aviso de la portada** (`AvisoNovedad`) es una TARJETA BLANCA con su
  sombra —no la franja negra de antes, ni degradado o resplandor: blanca y
  sus sombras—, **SIN imagen** y **COMPACTA en todos los tamaños**
  («al fin y al cabo es un anuncio», 21/10/2026; una versión anterior era
  grande y se pasó de presencia): una franja baja (~112px en escritorio)
  con el megáfono en su aro dorado, «Novedad» y la fecha en una línea, el
  título en el serif de la marca con la estrella de ORUM AL LADO
  (`AdornoEstrella`, como los títulos de sección), UNA línea del texto y
  una flecha en un círculo dorado. No lo vuelvas a agrandar. **Al
  apuntarlo NO sale el filo dorado** («se ve feo y cortado», 21/10/2026):
  sube 3px con la sombra flotante, el megáfono se inclina, la estrella gira
  y la flecha avanza — transiciones de `transform`, nada de `@keyframes`. **La tarjeta ENTERA es el `<a>`** a `/novedades`, que
  abre ARRIBA con su titular (no al ancla: «que aparezca desde el inicio»).
  Sin «Ver más» ni enlace estirado (el clic no llegaba en el navegador del
  propietario). **Se puede quitar, pero solo por ahora**: una X ENCIMA de la
  tarjeta (`CerrarAviso`, no dentro: un botón dentro de un enlace no vale)
  lo oculta mientras la página siga abierta; al recargar vuelve. Se recuerda
  en el estado del componente y en NINGÚN otro sitio —nada de
  `localStorage`, que lo dejaba quitado para siempre y no se quería—. La
  tarjeta se pinta en el servidor; solo la X es de cliente. No vuelvas al
  fondo negro ni a la miniatura.
  **En el teléfono** («la distribución está mal, ocupa demasiado
  espacio», 21/10/2026): megáfono de 40px a la izquierda, sin flecha,
  «Novedad» y la fecha CORTA («26 sept 2026», `formatearFechaNovedadCorta`)
  en UNA línea, título y dos líneas de texto; mide ~124px. Y en la portada
  no suma margen propio (`--aviso-margen: 0`, que pone
  `publico.module.css`): las franjas de alrededor ya traen su relleno. En
  el Inicio del socio conserva su margen.
- **Y TAMBIÉN EN EL PORTAL DE MIEMBROS** (21/10/2026: «no lo veo en el
  portal de miembros»; desde el 29/09 el Inicio del socio no enseñaba
  ninguna novedad). El Inicio pasa el mismo `AvisoNovedad` al directorio
  (`DirectorioComercios aviso`, entre el banner y los filtros), con las
  novedades marcadas para miembros, y lleva a **`/miembros/novedades`**, que
  vuelve: la misma página que la pública (`ListaNovedades`, la hoja
  compartida `components/novedades/pagina-novedades.module.css`) pero con
  las del socio, leídas con su sesión. Se retiró la redirección vieja a
  `/miembros#novedades` de `next.config.ts`.
- **`/novedades`** va a lo ancho de la fachada: cabecera con
  `TituloSeccion`, la más reciente EN GRANDE (imagen y texto lado a lado),
  las anteriores en rejilla, y al final dos accesos (comercios y
  membresías). Sin imagen sale una lámina con la estrella de ORUM, no un
  hueco. La que señala el ancla lleva el filo dorado (`:target`).
- **El formulario del panel es UNO** (`AnuncioForm`): la imagen arriba, como
  se verá (16:9) —vacía, un recuadro donde soltarla o elegirla; con imagen,
  «Ajustar», «Cambiar» y «Quitar» (que se puede deshacer)—; el ajuste es un
  PASO con `EditorEncuadre` (Escape vuelve al formulario); los textos con su
  recuento; dónde se muestra con dos interruptores; y UN «Guardar» que lleva
  todo. La imagen viaja en un `<input type="file" name="archivo">` oculto
  (asignado con `DataTransfer`) y la acción la sube DESPUÉS de guardar los
  textos; `quitar_imagen=1` la borra (fila y archivo). Ya no existe
  `imagen-actions.ts` ni el segundo formulario con «Subir imagen». Las
  acciones sueltan la caché `publico` (antes la portada tardaba hasta un
  minuto en enterarse).
- **Una novedad se puede PROGRAMAR** (21/10/2026: «un rango de fechas con
  una hora de salida y una de finalización»). Columnas `publicar_desde` y
  `publicar_hasta` (`20261021120000_anuncios_programados.sql`), las dos
  opcionales: sin la primera sale al guardar; sin la segunda, se ve hasta
  retirarla. En el formulario, cada extremo tiene su interruptor con día y
  hora, y una línea dice en palabras qué va a pasar. **La hora es SIEMPRE la
  de Colombia** (`instanteBogota`, `partesBogota`; la del navegador no
  cuenta). La lógica es pura y probada (`lib/anuncios/programacion.ts`):
  `estadoNovedad` (publicada · programada · finalizada · retirada) da el
  estado y las pestañas de la lista del panel, y `vigentesAhora` decide qué
  ven los portales —ordenadas por cuándo SALIERON—. La política de lectura
  pública también filtra por la ventana: una programada no se lee por
  adelantado. Por la caché de la fachada, una novedad puede tardar hasta un
  minuto en aparecer o irse tras su hora. ⚠️ **El código aguanta la base sin
  la migración** (`faltanColumnasDeProgramacion`): lee sin fechas y guarda
  sin ellas si no se programó nada; si se programa, avisa de que falta
  aplicarla.

**Una contraseña NUEVA tiene que ser segura** (27/10/2026: «que el
usuario no pueda poner una contraseña insegura»; con las fuentes oficiales:
NIST SP 800-63B-4 §3.1.1.2 y el Authentication Cheat Sheet de OWASP). Hay
DOS puertas por las que se crea una, y las dos usan lo mismo: activar la
cuenta o restablecerla (`/activar-cuenta`, socios, comercios y personal) y
«Cambiar contraseña» del panel.

- **La política es pura y probada** (`lib/auth/contrasena-segura.ts`):
  **12 caracteres o más** (NIST pide 15 sin segundo factor; el propietario
  ELIGIÓ 12 el 27/10/2026, con esa diferencia sobre la mesa: no lo subas sin
  que lo pida; subirlo es cambiar `LONGITUD_MINIMA`), contados como los cuenta una persona; **SIN
  reglas de mezcla** —nada de «una mayúscula, un número y un símbolo»: NIST
  prohíbe exigirlas—; acepta espacios, tildes y emojis; tope de **72 bytes**
  porque bcrypt (Supabase) trunca en silencio a partir de ahí; y rechaza,
  DICIENDO POR QUÉ, las repeticiones («abcabc…»), las series del teclado o
  del alfabeto, las comunes y las palabras del servicio aunque las decoren
  («Colombia2024!», «ClubOrum2026») y las que salen de los datos de la
  persona (correo, nombres, cédula: `palabrasDeContexto`). Una frase que
  solo MENCIONA una de esas palabras pasa.
- **Las filtradas, contra Pwned Passwords** (`contrasena-filtrada.ts`,
  servidor): se manda solo el prefijo de 5 del SHA-1 (anonimato k), con
  `Add-Padding`. **Si el servicio no responde en 2,5 s, no se bloquea a
  nadie**: pasa con las demás reglas.
- **Decide el servidor** (`lib/auth/contrasena-nueva.ts`:
  `contextoDeLaCuenta` + `motivoParaRechazar`). Al activar, la contraseña
  se revisa ANTES de canjear el enlace (`revisarAntesDeCanjear`: un rechazo
  no lo quema) y se guarda DESPUÉS con la sesión del enlace
  (`guardarContrasenaNueva`), ya con el nombre y la cédula de la cuenta; si
  ese segundo paso la rechaza, el reintento no vuelve a canjear. Antes el
  navegador la guardaba directamente con `updateUser` y solo miraba 8
  caracteres. ⚠️ `guardarContrasenaNueva` cambia la contraseña SIN pedir la
  actual, así que solo acepta una sesión abierta por el ENLACE hace menos de
  15 minutos (`amr` del token, `vieneDeUnEnlace`): si no, sería una puerta
  para quien se llevara una cookie. Y si el servidor no reconoce la sesión
  recién canjeada, el navegador la guarda como antes (respaldo: no se puede
  probar aquí sin un enlace real, y dejar a alguien sin activar su cuenta
  sería peor). **Pendiente de verificar con una invitación y una
  recuperación reales.**
- **El campo es UNO** (`components/auth/campo-contrasena-nueva.tsx`): debajo,
  siempre a la vista, cuatro segmentos que se llenan (solo `transform`) con
  su nombre —Insegura · Aceptable · Buena · Excelente, en colores
  SEMÁNTICOS, no oro— y los tres requisitos con su marca. El medidor premia
  el LARGO y las frases, no la mezcla; si el servidor la rechaza, marca
  «Insegura» y el motivo va en el campo. Se puede pegar y lo rellenan los
  gestores (`autoComplete="new-password"`). La regla `contrasena` de
  `lib/validacion/reglas.ts` es esta misma política. Un formulario nuevo
  que cree una contraseña usa este campo y `motivoParaRechazar`.

**El formulario «Quiero ser aliado» valida con EXIGENCIA** (05/10/2026: «es
el portal público; no quiero que pongan datos que no son»). Las reglas viven
en `lib/aliados/solicitud-aliado.ts` (puro, probado; el servidor es quien
decide) y cada campo tiene su `revisar…`, que devuelve el mensaje de lo que
falla: nombre y apellido solo con letras; teléfono COLOMBIANO de 10 dígitos
(celular 3…, fijo 60X…; se rechazan repetidos y escaleras); correo con forma
entregable, sin dominios desechables ni mal escritos; dirección con número;
descripción de 20–280 caracteres, sin enlaces ni marcado; enlace solo web
pública; y en todos, sin relleno (carácter repetido, teclas al azar). Comprueba
que el dato sea VEROSÍMIL, no que sea verdadero. Si se añade un campo, lleva
su `revisar…` y sus pruebas.

**El menú de móvil del Portal Público** (`menu-movil-publico.tsx`,
rediseñado el 05/10/2026) va en tres bloques: «En esta página» (las anclas,
con icono), el directorio en una tarjeta BLANCA aparte (negra se probó y el
propietario no la quiso) y las acciones como botones —«Únete a ORUM» en
`--gold-500`, no en el `--gold-600` de serie, que se veía «muy oscuro»—.
«Alíate con ORUM» abre el formulario ENCIMA, igual que el botón de la página:
se lo pide por evento al disparador (`pedirFormularioAliados()`), y si la
página no tiene ninguno, navega a `/aliados`.

**Las anclas de la fachada VIAJAN hasta su sección** (`DesplazamientoSuave`,
un escuchador delegado en el layout público, 05/10/2026). En fase de CAPTURA:
`<Link>` decide si navega mirando `defaultPrevented` en su `onClick`, que
corre después. Solo actúa si el destino está en la página actual; con
movimiento reducido, salta como antes.

**Los formularios enseñan su barra de desplazamiento, CON DISEÑO**
(`[data-barra]`, en `globals.css`, 09/10/2026: «que tengan la barra para
desplazar, pero con diseño»). Los portales siguen escondiendo toda barra
interior SALVO la de lo que lleva `data-barra`: el cuerpo de `Modal` y de
`Sheet` (todos los formularios en overlay), las ventanas desnudas (veredicto,
«Mi negocio», «Mi foto»), la lista de `SelectMenu` y la de la paleta. Es un
pulgar fino en píldora, GRIS y tenue, que se oscurece un poco al apuntarlo. Un contenedor nuevo que desplace un formulario pone `data-barra`.
**La barra de la PÁGINA también** (regla sobre `html`, mismo día, «en todos
los portales»): GRIS Y DISCRETA —carril blanco, pulgar gris claro, barra
fina—. Las dos barras se probaron en oro (y la de la página en negro y oro)
y el propietario volvió al gris: «algo simple y discreto, que no se note
tanto». **No las vistas de marca otra vez.** Usa tokens CRUDOS porque el
`<html>` sigue el tema del sistema. **Solo en equipos con ratón** (`hover: hover` y
`pointer: fine`); en táctil la página NO enseña barra («los móviles no deben
tenerla»), y la de los formularios sí se queda. **Va con `scrollbar-color`,
no con `::-webkit-scrollbar`**: los pseudoelementos los pinta Chrome en el
hilo principal y el pulgar se quedaba atrás al desplazar rápido («trabada»);
con la propiedad estándar la barra sigue siendo la nativa, que mueve el
compositor. La forma la pone el sistema; no la cambies a costa de eso.
**Lo que desplaza se DESVANECE hacia sus bordes con una máscara**
(`[data-desvanece]`, en `globals.css`; cuarta y última versión, 09/10/2026).
Las tres anteriores ponían una CAPA encima del contenido —un degradado
negro, luego uno del color de la ventana— y una capa siempre tiene un canto
en algún sitio (la esquina redondeada, la columna de la barra, la sombra de
un botón tapada a medias); el propietario fue encontrando cada costura. La
máscara no pone nada encima: el contenido se vuelve transparente hacia el
borde y se ve el fondo real. Dos animaciones ligadas al desplazamiento
mueven `--desvanece-arriba/abajo` (registradas con `@property`): arriba se
funde tras bajar 24px, abajo deja de fundirse al llegar al final. Lo llevan
el cuerpo de `Modal` y de `Sheet`, la lista de `SelectMenu` y la de la
paleta. **No en una ventana que desplaza entera** (se fundiría su fondo)
**ni con algo `sticky` abajo.** No vuelvas a un degradado superpuesto.

**La X de los buscadores es la del navegador, VESTIDA** (`globals.css`,
«La X de los buscadores», 29/10/2026: «no me gusta la X de color azul; un
gris oscuro o un negro, que se vea mejor y con animación»). Todo
`<input type="search">` del sitio la lleva: una X de trazo grueso pintada
con una máscara en `--tinta-2` (tinta CRUDA, no `--text-2`: el campo es
blanco aunque viva en el banner oscuro del directorio, que aclara los
textos); aparece girando y creciendo, al apuntarla se oscurece a `--tinta-1`
y gira un cuarto, y se encoge al pulsarla. Sigue borrando el campo sin
JavaScript. Quien tenga su propia X la esconde con `display: none` (el
buscador del panel). Firefox no tiene esta X. No vuelvas a la azul.

**`.marcoCuerpo` (Modal) RECORTA a la forma de la ventana** (`overflow:
clip` con el radio interior, abajo si no hay pie y arriba si no hay
cabecera). El `<dialog>` no puede recortar —perdería su sombra—, y sin esto
asomaban por la curva el borde de un campo o el final de la barra.
⚠️ **`clip`, nunca `hidden`, en lo que recorta una ventana** (21/10/2026:
«cuando activo una opción se daña la ventana»). `hidden` deja que el
navegador DESPLACE la caja: al tocar un interruptor, su `<input>` oculto
tomaba el foco, Chrome desplazaba el marco para enseñarlo y el formulario
se corría hacia arriba dejando media ventana en blanco. La hoja lo había
cerrado el 02/10; la ventana de escritorio seguía con `hidden`. Y la fila
de `Switch`/`Checkbox`/`Radio` es `position: relative`: su `<input>` oculto
vive dentro de ella, no contra un antepasado lejano.

**Una ventana con cabecera de color no desplaza ENTERA** (veredicto de
comercios): desplaza su cuerpo (`.ventanaCuerpo`, que lleva el `data-barra`).
Si desplaza la ventana, la barra le quita ancho a la franja y deja una tira
blanca a su derecha.

⚠️ **`scrollbar-color` SE HEREDA.** El del `<html>` bajaba hasta los
`[data-barra]` y les apagaba los pseudoelementos: salía la barra del sistema,
con flechas y fuera de la esquina redondeada. Por eso `[data-barra]` declara
`scrollbar-color: auto`. No lo quites.
⚠️ En Chrome, `scrollbar-width`/`scrollbar-color` APAGAN los
`::-webkit-scrollbar`: las propiedades estándar van solo bajo
`@supports not selector(::-webkit-scrollbar)`.

**`LogoOrumTema`** (hoy sin consumidores: la cabecera de miembros pasó a dos
variantes fijas, oro y plata, elegidas por `.cabeceraInicio` al fijarse el
portal en claro) es la excepción a «una variante por superficie fija»: monta
plata y oro superpuestos y CSS elige por `data-theme`, con el mismo selector
de tres ramas que `globals.css` usa para todo lo que sigue al tema (explícito
por atributo, o la preferencia del sistema mientras el script anti-flash no lo
haya estampado). Existe porque la cabecera del Portal de Miembros —a
diferencia de una franja fija— cambia de fondo con el tema del propio portal:
ahí ninguna variante única sirve a los dos casos. No la copies a una
superficie que no cambie de fondo con el tema — ahí una variante fija basta y
sobra.

**En Inicio (`/miembros`) la cabecera del portal va en NEGRO** (rediseño del
27/09/2026, `Miembros.dc.html`): `CabeceraPortal` le pone `data-theme="dark"`
solo en esa ruta, para que continúe el héroe negro del catálogo; en el resto del
portal sigue siendo el material claro. El logo es `LogoOrum` dorado + plata y
CSS enseña uno u otro según `.cabeceraInicio`. La navegación de escritorio ya **no marca
la ruta activa** (encargo: «que no se resalten ni se subrayen»); la dice
`aria-current`, y la barra inferior de móvil la sigue marcando.

**`QrCode` va en negro sobre blanco en los dos temas.** No es estética: invertirlo en
oscuro rompe el escaneo en algunos lectores, y el fallo ocurre en la caja del comercio
delante del cliente. Ese es el único sitio del sistema con colores literales.

---

## Arquitectura que no cambia

- Páginas = **Server Components** con `requireRol`. `'use client'` solo en hojas interactivas.
- Mutaciones = **server actions**, con verificación de rol al entrar.
- Estado externo (tema, preferencias, media queries) = `useSyncExternalStore`,
  **nunca** `useState` + `useEffect` (dispara renders en cascada y el linter lo marca).
- Pruebas automatizadas **solo de funciones puras**. El resto se verifica a mano.

### Dónde va cada cosa

`src/lib/` está organizado **por dominio**: `auth/` `miembros/` `comercios/` `metricas/`
`bitacora/` `shared/` `supabase/`. Nada suelto en la raíz de `lib`.

Los formularios de una ruta viven en su `_components/`. Los que comparten varias rutas
—`formulario.module.css`— viven en `src/styles/`: si una hoja compartida se guarda dentro
de una ruta, la primera reorganización rompe las otras ocho que la importaban.

### Adaptación al ancho: `@container`, no `@media`

`.main` del shell y el `<main>` del portal declaran `container-type: inline-size` con
`container-name: contenido`. Las páginas se adaptan preguntando por **ese** contenedor:

```css
@container contenido (max-width: 900px) { … }
```

El ancho útil del contenido no es el del viewport — cambia según la barra lateral esté
abierta o en rail. Un `@media` se equivoca en ~200px justo donde importa. Un `@container`
sin contenedor ancestro **nunca casa**: si escribes uno, comprueba que hay contenedor.

### Fechas

Dos casos distintos, y confundirlos desplaza un día:

- **`timestamptz` de la base** (`fecha_hora`): formatear en `America/Bogota`.
- **`'YYYY-MM-DD'` civil** (`fecha_fin`, rangos de filtro): construir con `Date.UTC(...)`
  y formatear en **`timeZone: 'UTC'`**. Leerla en Bogotá (UTC−5) la retrasa al día
  anterior; el carnet llegó a anunciar el vencimiento un día antes de tiempo.

Y al **consultar** un rango contra una columna `timestamptz`, nunca una cadena suelta:

```ts
.gte('fecha_hora', inicioDiaBogota(desde))   // NO `${desde} 00:00:00`
.lte('fecha_hora', finDiaBogota(hasta))      // src/lib/shared/fecha.ts
```

Sin offset explícito Postgres la interpreta en la zona de la sesión (UTC), y todo lo
ocurrido después de las **7pm hora Colombia** cae en el día siguiente y desaparece del
filtro. No falla ruidosamente: devuelve menos filas. Estuvo vivo en seis sitios.

---

## Accesibilidad: mínimos no negociables

- Contraste AA en todo texto (4.5:1; 3:1 en texto grande). Auditado: 0 fallos.
- `:focus-visible` visible en todo interactivo.
- Objetivos táctiles ≥44px. **Lo que se ve y lo que se toca son cosas distintas**: si
  el control debe verse pequeño (el ojo de la contraseña, el botón de copiar), amplía
  el área con un `::after` centrado de `var(--tap-min)` en vez de agrandar el botón.
  Para filas anchas —menús, interruptores— sube el `min-height` bajo
  `@media (pointer: coarse)`: en escritorio la densidad es una virtud.
- **Un botón dentro de un campo no debe robarle el foco.** `onPointerDown` con
  `preventDefault`. Sin eso, en un móvil el teclado se cierra al tocarlo y parece que
  el control está roto.
- **Nunca `tabIndex={-1}` en algo accionable.** No lo "mueve al final" del orden de
  tabulación: lo saca por completo. El ojo de la contraseña estuvo así, y con teclado
  no había forma de revelarla.
- Un `<h1>` por pantalla, sin saltos de nivel.
- Un avatar junto a un nombre visible va `decorativo` (si no, el lector lo repite).

---

## Antes de dar algo por hecho

```bash
pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm test && pnpm build
```

**`next lint` ya no existe en Next 16.** El comando es `pnpm exec eslint .` —el
script `lint` de `package.json` ya apunta a `eslint`, pero sin la ruta no
recorre el proyecto entero, así que el `.` no es opcional—.

Si `pnpm` no está en el `PATH` (es el caso en la máquina de desarrollo actual),
los cuatro binarios se invocan desde `node_modules`:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
.\node_modules\.bin\vitest.cmd run --reporter=dot
.\node_modules\.bin\next.cmd build
```

Y **míralo renderizado**. En esta sesión, medir con `getComputedStyle` durante una
transición dio tres diagnósticos falsos seguidos: en una pestaña que el navegador no
pinta, las transiciones no avanzan y siempre se lee el valor inicial. Una captura
fuerza el pintado; una medición, no.

## Configuración de herramientas

`.claude/settings.json` **se comparte con todo el equipo**, así que no puede contener
rutas de una máquina concreta. Los hooks invocan `graphify` por nombre, resolviéndolo
desde el `PATH`; antes apuntaban a `C:/Users/<usuario>/.local/bin/graphify.EXE`, que
solo existía en un portátil y fallaba en cualquier otro clon del repositorio.

Lo que sea propio de tu máquina va en **`.claude/settings.local.json`**, que está en
`.gitignore`. Es la convención de Claude Code: `settings.json` compartido,
`settings.local.json` personal.

---

## Requisitos de entorno

Node **≥22.13** (declarado en `.nvmrc` y `engines`). pnpm 11 usa `node:sqlite`, que no
existe antes. Con Node 20 el instalador falla con `No such built-in module`.

---

## Deuda conocida

1. ~~Las transiciones de elemento compartido entre lista y ficha están
   habilitadas pero sin aplicar.~~ **Cerrado (M5)**: el par rejilla ↔ ficha ya
   las lleva. Queda **sin verificar en navegador**: esta máquina no pinta.
   Y un dato incómodo de recordar: en Next 16.2.11 la bandera
   `experimental.viewTransition` **no hace nada** —solo existe en el esquema de
   configuración—. Lo que hace que funcione es que Next vendoriza un React
   canary que ya exporta `ViewTransition`. No la quites sin comprobarlo, pero
   tampoco cuentes con ella.
2. Sin pruebas automatizadas de interfaz.
3. Sin verificar en dispositivo real: vista móvil, gestos de la hoja, instalación
   de la PWA y Core Web Vitals. La automatización de navegador de esta máquina
   **no consigue redimensionar la ventana** — no lo intentes, ya falló cinco veces;
   pide al usuario una captura o usa un dispositivo real.
4. El Portal de Miembros solo se ha visto en su pantalla de acceso: el resto exige un
   miembro con membresía vigente y esas credenciales no están disponibles aquí.
   Lo mismo la **Herramienta de Comercios**: su rediseño del 04/10/2026 se miró
   en una vista previa local con datos de ejemplo (1366, 820 y 390 px), no con
   una sesión de comercio real. Falta verlo en producción y en la caja: el
   escaneo con cámara, una venta de punta a punta y un comercio con logotipo.
   Tampoco se ha guardado de verdad una imagen desde «Mi negocio»: la vista
   previa probó la rejilla, el editor y que al guardar se exporta y se llama
   a la acción, pero sin sesión de comercio la acción redirige al acceso.
   El **Panel de Administración** rediseñado (04/10/2026) tampoco se ha visto
   con sesión: se miró en `/dev/shell` (1366, 1024, 820, 768 y 390 px) con
   datos falsos. Las pantallas de cada sección heredan el cromo, los tokens y
   el titular nuevo, pero no se han recorrido una a una.
   Y **instalar la app del comercio en un teléfono real** (Android e iPhone):
   se comprobó que `/comercios` enlaza su manifiesto y que este se sirve bien,
   no que el sistema la instale y abra en `/comercios`.
5. **La v6 solo se ha visto en el Portal Público** (landing y `/explorar`,
   24/09/2026, en el navegador del panel, a 1280px y emulando 390px). El resto
   de portales sigue sin mirarse: entraron por tokens, `tsc`, `eslint`, las
   pruebas y `next build` pasan, y los pares de contraste están calculados con
   la fórmula WCAG 2.1 desde los hex. En esta máquina las capturas con la
   página desplazada salen corridas; se mide con `getBoundingClientRect` o se
   agranda el viewport para capturar sin desplazar. Lo que hay que juzgar a ojo de la v6 está
   listado en
   [`.claude/docs/log/v6-crema-oro.md`](.claude/docs/log/v6-crema-oro.md) §8;
   el historial de la v5 sigue en
   [`.claude/docs/log/v5-negro-oro.md`](.claude/docs/log/v5-negro-oro.md).
6. ~~Los tokens `--cacao-*` se llamaban así y eran NEGROS.~~ **Cerrado el
   16/10/2026**: los tres crudos son `--negro-900/800/700` y los semánticos
   `--franja-bg|surface|hover|fg|fg-2|fg-3|brand|edge|scheme`; la clase
   `.tonoCacao` es `.tonoNegro` y `<Section tono="cacao">` es `tono="negro"`.
   Renombrado mecánico, sin cambio de valor. Los registros históricos de
   `.claude/docs/log/` conservan el nombre viejo a propósito.
7. ~~En tema oscuro `--border` reprobaba WCAG 1.4.11 en el borde de los
   controles.~~ **Cerrado**: existe `--border-control`, separado de `--border`.
   En claro vale lo mismo; en oscuro sube a `--n-500` (3,19:1 sobre la tarjeta,
   3,58 sobre el fondo, 3,39 sobre la banda). Lo usan `Input`/`Select`/
   `Textarea`, `Checkbox`/`Radio`, `SegmentedControl` y `Button secondary`. Un
   control de entrada nuevo **pide `--border-control`, no `--border`**.
8. ~~Tres copias a mano de la paleta seguían en los colores de la v4.~~
   **Cerrado desde la v5, y verificado que sigue cerrado en la v6**:
   `manifest.ts` (hoy `lib/shared/manifiesto-app.ts`) fija su color a propósito al del TEMA OSCURO (es lo que se ve
   en la pantalla de arranque antes de resolver la preferencia real), que no
   cambió con la v6, así que no necesitó tocarse. Los iconos ya no son
   copias de la paleta: desde el 29/09/2026 son PNG del monograma DORADO del
   cliente, sin fondo (`src/app/icon.png`, `favicon.ico`, `apple-icon.png`,
   `public/icons/orum-*.png`), generados desde
   `src/components/ui/marca/monograma.png`. Si cambia el monograma, se
   regeneran desde ahí. Si la paleta vuelve
   a cambiar, revisar los tres a mano — ninguno puede leer una variable CSS.
9. ~~`--cacao-bg` en tema claro mapeaba a un marfil claro en vez de negro,
   contradiciendo `CLAUDE.md`.~~ **Cerrado en la v6**: era un bloque de
   `globals.css` con un comentario sin versión que citaba un encargo posterior
   nunca recogido aquí. Confirmado con el propietario, corregido. Detalle en
   `.claude/docs/log/v6-crema-oro.md` §3.
10. ~~Los comentarios de los módulos que consumen `--font-display` citaban
    «Fraunces».~~ **Cerrado**: ya no queda ninguna mención a Fraunces en
    `src/` salvo la histórica de `layout.tsx` («desde que la v5 retiró a
    Fraunces»), que es correcta.
11. **Falta una Content-Security-Policy completa.** `next.config.ts` solo
    manda `frame-ancestors 'none'` (anti-clickjacking); no limita qué
    scripts, imágenes o conexiones puede cargar la página, así que no frena
    un XSS si algún día se cuela. Se dejó fuera a propósito: Next inyecta
    scripts en línea y una CSP estricta rompe la aplicación en producción
    sin avisar en desarrollo (anotado el 13/10/2026 tras la auditoría de la
    publicidad). Cómo hacerla:
    - **Con nonces**, generados por petición en `proxy.ts`. Cuesta que las
      páginas pasen a dinámicas (se pierde caché estática), así que se mide
      antes y después.
    - **Empezar en `Content-Security-Policy-Report-Only`**: no bloquea nada,
      solo registra qué se habría bloqueado, y la lista se ajusta con tráfico
      real antes de activarla.
    - **Lo que tiene que permitir**: imágenes del bucket de Supabase **y**
      de dominios externos (la columna de logos admite URLs de la web del
      comercio), la cámara del escáner QR (`camera=(self)`), Cloudflare
      Turnstile en los logins y las fuentes de `next/font` (locales).
    - Se prueba **desplegada**, en los cuatro portales y en los logins, no
      solo en `pnpm dev`.
13. **Las columnas `comercios.categoria_id` / `subcategoria_id` están en
    desuso** desde el 21/10/2026 (varias categorías por comercio): solo
    guardan una copia de la primera fila. Se retiran en una migración aparte
    cuando todo esté probado en producción. Tampoco se han probado las
    categorías múltiples con sesiones reales (alta y edición desde el panel,
    ficha del socio con su sesión).
12. **Las reseñas no se han probado de punta a punta con sesiones reales.**
    Crear, editar y borrar del socio, responder del comercio y moderar del
    admin se verificaron con datos falsos (`/dev/resenas*`), el script SQL de
    verificación y lectura de código; falta recorrerlo con un socio, un
    comercio y un admin reales.
15. **Las franjas horarias de las promociones no se han probado con sesión
    real** (28/10/2026). Se miraron en `/dev/beneficios` (1024 y 375 px) con
    datos falsos; falta aplicar la migración `20261028120000`, guardar una
    promoción con franjas desde el panel, verla en la ficha del socio y
    cobrarla en la caja dentro y fuera de su franja.
14. **Los horarios de sucursal no se han probado con sesión real.** El editor
    y la ficha se miraron en `/dev/horarios` (~490 px) con datos falsos; falta
    guardar un horario de verdad desde el panel, verlo en la ficha pública y
    en la del socio, y mirarlo a 1366 y 820 px. La migración
    `20261024120000_sucursal_horarios.sql` se aplica a mano: hasta entonces
    el código se comporta como «sin horarios».
