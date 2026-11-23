import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { finDiaBogota, inicioDiaBogota } from '@/lib/shared/fecha'
import { normalizarMovimiento, type Movimiento, type VentaCruda } from './movimientos'
import type { RangoCompras } from './compras-miembro'

/*
  LAS COMPRAS DE UN MIEMBRO  ·  lectura para el panel (11/11/2026)
  ---------------------------------------------------------------------------
  Con la clave de servicio: la ficha del miembro solo la abre el personal
  (`requireRol('super_admin', 'empleado')` en la página), y desde el panel
  hay que ver también las compras en comercios ya desactivados, que la RLS
  del socio esconde. El filtro por `miembro_id` es el de la ficha.

  Se leen TODAS las compras del periodo (por páginas de 1000, que es donde
  corta PostgREST), no solo las de la página de la tabla: los totales, el
  ranking de comercios y la tabla tienen que salir de las mismas filas.
*/

const SELECCION = `
  id, fecha_hora, valor_compra, valor_descuento, valor_final, metodo_registro,
  sucursales ( nombre, comercios ( id, nombre, logo_url ) ),
  promociones ( titulo )
`

const POR_PAGINA = 1000
/** Diez mil compras de un solo socio no es un caso real; el tope evita un bucle sin fin. */
const MAX_PAGINAS = 10

export type CompraPanel = Movimiento & {
  /** `qr` o `numero`: cómo lo encontró la caja. */
  metodo: string | null
}

/** Las compras del miembro en el periodo, de la más reciente a la más antigua. `null` si falla. */
export async function cargarComprasMiembro(
  miembroId: number,
  rango: RangoCompras,
): Promise<CompraPanel[] | null> {
  const admin = createAdminClient()
  const compras: CompraPanel[] = []

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    let consulta = admin.from('ventas').select(SELECCION).eq('miembro_id', miembroId)
    // `timestamptz`: los extremos con su hora de Colombia, nunca una cadena suelta.
    if (rango.desde) consulta = consulta.gte('fecha_hora', inicioDiaBogota(rango.desde))
    if (rango.hasta) consulta = consulta.lte('fecha_hora', finDiaBogota(rango.hasta))

    const { data, error } = await consulta
      .order('fecha_hora', { ascending: false })
      .order('id', { ascending: false })
      .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1)

    if (error) {
      console.error(`[cargarComprasMiembro] miembro_id=${miembroId}:`, error)
      return null
    }

    const filas = data as unknown as (VentaCruda & { metodo_registro: string | null })[]
    for (const f of filas) compras.push({ ...normalizarMovimiento(f), metodo: f.metodo_registro })
    if (filas.length < POR_PAGINA) break
  }

  return compras
}
