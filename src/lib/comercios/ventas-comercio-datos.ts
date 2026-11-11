import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { finDiaBogota, inicioDiaBogota } from '@/lib/shared/fecha'
import { leerEnPaginas } from '@/lib/shared/leer-en-paginas'
import type { RangoPeriodo } from '@/lib/shared/periodo'
import type { VentaComercio } from './ventas-comercio'

/*
  LAS VENTAS DE UN COMERCIO  ·  lectura para el panel (11/11/2026)
  ---------------------------------------------------------------------------
  Con la clave de servicio: la ficha del comercio es solo del administrador
  (`requireRol('super_admin')` en la página). `ventas` no guarda el
  comercio, guarda la SEDE: se piden las ventas de todas sus sucursales,
  también las dadas de baja (conservan su historial).

  Se leen TODAS las del periodo por lotes (`leerEnPaginas`): las cifras, los
  grupos por sede y por promoción y la tabla salen de las mismas filas.
*/

type Fila = {
  id: number
  fecha_hora: string
  miembro_id: number
  valor_compra: number | string
  valor_descuento: number | string
  valor_final: number | string
  metodo_registro: string | null
  miembros: { nombres: string; apellidos: string } | null
  sucursales: { nombre: string | null } | null
  promociones: { titulo: string } | null
}

/** `numeric` de Postgres → número; lo que no lo sea cuenta como 0. */
function aNumero(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(n) ? n : 0
}

/** Las ventas del comercio en el periodo, de la más reciente a la más antigua. `null` si falla. */
export async function cargarVentasComercio(
  comercioId: number,
  rango: RangoPeriodo,
): Promise<VentaComercio[] | null> {
  const admin = createAdminClient()
  try {
    const { data: sucursales, error } = await admin.from('sucursales').select('id').eq('comercio_id', comercioId)
    if (error) throw error
    const ids = (sucursales ?? []).map((s) => s.id)
    if (ids.length === 0) return []

    const filas = await leerEnPaginas<Fila>((inicio, fin) => {
      let consulta = admin
        .from('ventas')
        .select(
          `id, fecha_hora, miembro_id, valor_compra, valor_descuento, valor_final, metodo_registro,
           miembros ( nombres, apellidos ), sucursales ( nombre ), promociones ( titulo )`,
        )
        .in('sucursal_id', ids)
      // `timestamptz`: los extremos con su hora de Colombia, nunca una cadena suelta.
      if (rango.desde) consulta = consulta.gte('fecha_hora', inicioDiaBogota(rango.desde))
      if (rango.hasta) consulta = consulta.lte('fecha_hora', finDiaBogota(rango.hasta))
      return consulta
        .order('fecha_hora', { ascending: false })
        .order('id', { ascending: false })
        .range(inicio, fin) as unknown as PromiseLike<{ data: Fila[] | null; error: unknown }>
    })

    return filas.map((f) => ({
      id: f.id,
      fechaHora: f.fecha_hora,
      miembroId: f.miembro_id,
      miembro: f.miembros
        ? `${f.miembros.nombres} ${f.miembros.apellidos}`.trim()
        : `Miembro #${f.miembro_id}`,
      sede: f.sucursales?.nombre ?? null,
      promocion: f.promociones?.titulo ?? null,
      valorCompra: aNumero(f.valor_compra),
      descuento: aNumero(f.valor_descuento),
      valorFinal: aNumero(f.valor_final),
      metodo: f.metodo_registro,
    }))
  } catch (e) {
    console.error(`[cargarVentasComercio] comercio_id=${comercioId}:`, e)
    return null
  }
}
