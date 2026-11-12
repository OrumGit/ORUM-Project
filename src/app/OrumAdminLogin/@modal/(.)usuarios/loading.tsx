/**
 * Carga de los overlays de esta sección: la ventana ya abierta, con la
 * silueta de un formulario, mientras llegan sus datos.
 *
 * Vive AQUÍ y no en la raíz de `@modal`: allí aparecía en cada navegación a
 * una sección, no solo al abrir un formulario (ver `@modal/loading.tsx`).
 */
export { OverlayCargando as default } from '@/components/shell/overlay-cargando'
