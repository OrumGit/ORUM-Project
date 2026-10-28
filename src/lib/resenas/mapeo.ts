/*
  RESEÑAS  ·  de la fila de la base a lo que pinta la interfaz
  ---------------------------------------------------------------------------
  Puro (sin `server-only`) para poder probarlo. `datos.ts` hace la E/S y
  delega aquí el paso de snake_case a camelCase.
*/

import type { ResenaVista } from './resenas'
import { necesitaRevision } from './moderacion'

/** Una reseña para la gestión (comercio y administración): autor completo y fechas de respuesta. */
export type ResenaGestion = Omit<ResenaVista, 'autor'> & {
  autor: string
  respuestaComercioAt: string | null
  respuestaAdminAt: string | null
}

export type FilaRpcResena = {
  id: number
  estrellas: number
  mensaje: string | null
  autor: string
  created_at: string
  respuesta_comercio: string | null
  respuesta_admin: string | null
  es_mia: boolean
}

export type FilaGestion = {
  id: number
  estrellas: number
  mensaje: string | null
  created_at: string
  respuesta_comercio: string | null
  respuesta_comercio_at: string | null
  respuesta_admin: string | null
  respuesta_admin_at: string | null
  miembros: { nombres: string; apellidos: string } | null
}

export function vistaDeFilaRpc(
  fila: FilaRpcResena,
): ResenaVista & { esMia: boolean } {
  return {
    id: fila.id,
    estrellas: fila.estrellas,
    mensaje: fila.mensaje,
    autor: fila.autor,
    creadaEn: fila.created_at,
    respuestaComercio: fila.respuesta_comercio,
    respuestaAdmin: fila.respuesta_admin,
    esMia: fila.es_mia,
  }
}

/** Nombre completo del socio; si la fila del socio no llegó, un marcador neutro. */
export function nombreCompleto(
  miembro: { nombres: string; apellidos: string } | null,
): string {
  if (!miembro) return 'Socio'
  const completo = `${miembro.nombres} ${miembro.apellidos}`
    .replace(/\s+/g, ' ')
    .trim()
  return completo || 'Socio'
}

/** Una reseña en el apartado del panel: con su comercio y si está por revisar. */
export type ResenaPanel = ResenaGestion & {
  comercioId: number
  comercioNombre: string
  revisadaAt: string | null
  porRevisar: boolean
}

export type FilaPanel = FilaGestion & {
  comercio_id: number
  comercios: { nombre: string } | null
  revisada_at?: string | null
}

export function panelDeFila(fila: FilaPanel, conRevision: boolean): ResenaPanel {
  const base = gestionDeFila(fila)
  const revisadaAt = fila.revisada_at ?? null
  return {
    ...base,
    comercioId: fila.comercio_id,
    comercioNombre: fila.comercios?.nombre?.trim() || 'Comercio',
    revisadaAt,
    porRevisar: necesitaRevision({ estrellas: base.estrellas, revisadaAt, respuestaAdmin: base.respuestaAdmin }, conRevision),
  }
}

export function gestionDeFila(fila: FilaGestion): ResenaGestion {
  return {
    id: fila.id,
    estrellas: fila.estrellas,
    mensaje: fila.mensaje,
    autor: nombreCompleto(fila.miembros),
    creadaEn: fila.created_at,
    respuestaComercio: fila.respuesta_comercio,
    respuestaComercioAt: fila.respuesta_comercio_at,
    respuestaAdmin: fila.respuesta_admin,
    respuestaAdminAt: fila.respuesta_admin_at,
  }
}

/**
 * Separa la reseña propia del resto. La función SQL devuelve todas las filas
 * (con `es_mia`), así que la propia se busca en la lista COMPLETA: si cayera
 * fuera de las `limite` más recientes, recortar primero la perdería. Las
 * demás se recortan dejando un hueco para la propia, de modo que nunca se
 * muestran más de `limite` y la propia no aparece dos veces.
 */
export function separarMiResena(
  filas: FilaRpcResena[],
  limite: number,
): { miResena: (ResenaVista & { esMia: boolean }) | null; otras: (ResenaVista & { esMia: boolean })[] } {
  const propia = filas.find((f) => f.es_mia) ?? null
  const otras = filas
    .filter((f) => !f.es_mia)
    .slice(0, Math.max(0, limite - (propia ? 1 : 0)))
    .map(vistaDeFilaRpc)
  return { miResena: propia ? vistaDeFilaRpc(propia) : null, otras }
}
