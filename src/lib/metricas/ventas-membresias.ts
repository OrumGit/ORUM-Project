/*
  MEMBRESÍAS VENDIDAS POR UN EMPLEADO  ·  puro (26/11/2026)
  ---------------------------------------------------------------------------
  La bitácora de cada empleado en Usuarios: qué membresía vendió, a quién,
  por cuánto y cuándo. Una CORTESÍA aparece en la lista (quedó registrada
  por ese empleado), pero no es una venta: no suma ni a la cantidad ni al
  monto, igual que en Métricas (`agruparMembresiasPorEmpleado`).

  Las cifras de aquí y las de Métricas salen de la misma regla: si una
  cambia, cambian las dos.
*/

export type VentaMembresia = {
  /** Id de la membresía. Crece con cada alta: sirve de desempate y de orden. */
  id: number
  /** Momento en que se registró la membresía (`created_at`, timestamptz). */
  fechaHora: string
  miembroId: number
  miembro: string
  numeroMembresia: string
  plan: string
  tipo: 'nueva' | 'renovada'
  esCortesia: boolean
  /** Lo pagado. Una cortesía lleva 0 (lo exige un CHECK en la base). */
  precio: number
}

export type ResumenVentasMembresias = {
  /** Membresías cobradas (sin cortesías). */
  vendidas: number
  /** Dinero cobrado por esas membresías. */
  monto: number
  /** Cortesías registradas en el periodo. No suman a nada. */
  cortesias: number
}

export function resumirVentasMembresias(ventas: readonly VentaMembresia[]): ResumenVentasMembresias {
  let vendidas = 0
  let monto = 0
  let cortesias = 0
  for (const v of ventas) {
    if (v.esCortesia) {
      cortesias += 1
      continue
    }
    vendidas += 1
    monto += v.precio
  }
  return { vendidas, monto, cortesias }
}

/**
 * Más reciente primero. Se ordena por `id` descendente: es un serial que
 * crece con cada alta, así que coincide con el orden de creación y no depende
 * de comparar fechas con microsegundos.
 */
export function ordenarRecientes(ventas: readonly VentaMembresia[]): VentaMembresia[] {
  return [...ventas].sort((a, b) => b.id - a.id)
}

/** Lo que dice la columna «Tipo». Una cortesía se nombra como tal aunque su tipo sea «renovada». */
export function textoTipoMembresia(tipo: VentaMembresia['tipo'], esCortesia: boolean): string {
  if (esCortesia) return 'Cortesía'
  return tipo === 'renovada' ? 'Renovación' : 'Nueva'
}
