/**
 * Estado por defecto de la ranura `@modal`: vacío.
 *
 * Next lo renderiza cuando la URL no casa con ninguna ruta interceptada, que
 * es la mayor parte del tiempo. Sin este archivo la ranura daría 404 al
 * navegar a la lista.
 */
export default function SinModal() {
  return null
}
