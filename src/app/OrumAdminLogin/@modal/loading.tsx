/*
  La carga de la RAÍZ de la ranura `@modal`: no pinta nada (04/10/2026).

  La ranura necesita su propio `loading.tsx` —sin él Next cae al de la
  sección y dibuja el esqueleto de la tabla dentro del hueco del modal—, pero
  en la raíz NO puede pintar la ventana de carga. Lo hacía, y desde que el
  comodín `[...resto]` vacía la ranura en cada navegación, CUALQUIER clic a
  una sección («Comercios», «Métricas»…) enseñaba un instante una ventana
  cargando antes del apartado.

  Por qué solo en producción: allí `<Link>` precarga la ruta hasta la
  primera carga de cada ranura y, al pulsar, pinta esas cargas mientras
  llegan los datos — el esqueleto de la sección en `children` y ESTO en
  `@modal`. En desarrollo no se precarga y no se veía.

  La ventana de carga de los formularios vive ahora en cada grupo de rutas
  interceptadas (`(.)miembros/loading.tsx`, `(.)comercios/loading.tsx`…),
  que es lo único que de verdad abre una ventana. Es el mismo reparto que
  ya tenían el Portal de Miembros y el Público.
*/
export default function CargandoRanura() {
  return null
}
