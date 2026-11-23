/*
  CIERRA LA RANURA al navegar a cualquier ruta que no sea un overlay.

  En una navegación del cliente, una ranura paralela que no casa con la ruta
  nueva CONSERVA lo que estaba mostrando: Next no la vacía. Así que al pulsar
  «Mostrar mi carnet» dentro de la ficha abierta como overlay, la página del
  carnet cargaba detrás y la ficha seguía encima — «me envía al sitio pero no
  se minimiza la ventana».

  Este comodín casa con toda ruta que no tenga su propia interceptada y
  devuelve vacío, así que la ranura se limpia. Las rutas `(.)…` concretas son
  más específicas y siguen ganando.
*/
export default function SinOverlay() {
  return null
}
