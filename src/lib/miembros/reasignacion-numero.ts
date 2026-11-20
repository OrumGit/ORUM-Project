import { esNumeroRegistroValido } from './numeros-registro'

/*
  REASIGNAR EL NÚMERO DE MEMBRESÍA (19/11/2026)
  ---------------------------------------------------------------------------
  Solo el administrador puede cambiar el número de un miembro, y solo si no
  tiene ventas registradas: una venta ya quedó atada a ese número. El número
  nuevo sale del pozo (`numeros_registro`); el anterior vuelve a él. Aquí vive
  solo la regla pura; la persistencia está en la server action.
*/

export type RevisionReasignacion = { ok: true } | { ok: false; error: string }

export type EntradaReasignacion = {
  numeroActual: string
  numeroNuevo: string
  /** Ventas registradas del miembro (cualquier estado). */
  ventas: number
}

/** ¿Se puede pasar al miembro del número actual al número nuevo? */
export function revisarReasignacion(entrada: EntradaReasignacion): RevisionReasignacion {
  const { numeroActual, numeroNuevo, ventas } = entrada

  if (!esNumeroRegistroValido(numeroNuevo)) {
    return { ok: false, error: 'El número nuevo debe tener exactamente 8 dígitos.' }
  }
  if (numeroNuevo === numeroActual) {
    return { ok: false, error: 'Ese ya es su número de membresía.' }
  }
  if (ventas > 0) {
    const plural = ventas === 1 ? 'una venta registrada' : `${ventas} ventas registradas`
    return {
      ok: false,
      error: `No se puede reasignar el número: el miembro tiene ${plural}.`,
    }
  }
  return { ok: true }
}
