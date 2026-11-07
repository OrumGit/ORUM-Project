/*
  CORTACIRCUITO POR CLAVE  (06/11/2026, prueba de carga)

  Cuando Supabase empezó a rechazar peticiones (522/525), cada visitante cuyo
  refresco de caché fallaba volvía a intentarlo contra Supabase: con 250
  usuarios eran ~69 peticiones por segundo a una API que ya estaba en
  problemas, y el fallo se mantenía solo mientras duraba la carga. Una
  lectura fallida no se guarda en `unstable_cache`, así que nada frenaba la
  cadena.

  Esto la frena: tras un fallo, durante `enfriamientoMs` esa clave NO vuelve
  a llamar a la lectura y lanza `CortacircuitoAbierto` al instante. Quien
  llama sigue sirviendo lo último bueno (la caché conserva su copia vieja) y
  Supabase respira.

  · Es POR INSTANCIA: el estado vive en memoria del proceso. Corta la cadena
    dentro de cada instancia; no coordina entre instancias, y no hace falta.
  · Puro: el reloj se inyecta, así que se prueba sin esperar.
*/

export class CortacircuitoAbierto extends Error {
  readonly clave: string
  readonly reintentoEnMs: number

  constructor(clave: string, reintentoEnMs: number) {
    super(`Circuito abierto para «${clave}»: se vuelve a intentar en ${reintentoEnMs} ms`)
    this.name = 'CortacircuitoAbierto'
    this.clave = clave
    this.reintentoEnMs = reintentoEnMs
  }
}

export function crearCortacircuito(opciones: { enfriamientoMs: number; ahora?: () => number }) {
  const { enfriamientoMs, ahora = Date.now } = opciones
  const ultimoFallo = new Map<string, number>()

  async function ejecutar<T>(clave: string, leer: () => Promise<T>): Promise<T> {
    const fallo = ultimoFallo.get(clave)
    if (fallo !== undefined) {
      const transcurrido = ahora() - fallo
      if (transcurrido < enfriamientoMs) {
        throw new CortacircuitoAbierto(clave, enfriamientoMs - transcurrido)
      }
    }
    try {
      const valor = await leer()
      ultimoFallo.delete(clave)
      return valor
    } catch (error) {
      ultimoFallo.set(clave, ahora())
      throw error
    }
  }

  return { ejecutar }
}
