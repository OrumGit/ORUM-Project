/*
  LAS VENTAS DE UN EMPLEADO, UNA POR UNA  ·  puro (25/11/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «que el administrador pueda validar cada uno de
  sus empleados: si realizó 13 ventas, que sepa exactamente cuándo fueron,
  hora, día, membresía, persona… con filtros para la última semana, días,
  meses». Métricas ya decía CUÁNTAS vendió cada uno; esto dice CUÁLES.

  Una «venta» de un empleado es una membresía que él registró
  (`membresias.vendido_por`): un miembro nuevo o una renovación. Cuándo fue
  es `created_at`, el instante en que se guardó —no `fecha_inicio`, que en
  una renovación adelantada es un día futuro—.

  Las palabras, como en Métricas:
    · VENDIDAS  = las que NO son cortesía (las que suman dinero).
    · CORTESÍAS = las que dio sin cobrar: se cuentan aparte y no suman.
*/

export type VentaEmpleado = {
  /** El id de la membresía. */
  id: number
  /** Instante de la base (timestamptz): se formatea en America/Bogota. */
  fechaHora: string
  miembroId: number
  miembro: string
  /** Número de membresía del socio (el del carné). */
  numero: string | null
  plan: string
  tipo: 'nueva' | 'renovada'
  precio: number
  esCortesia: boolean
  /** Vigencia de esa membresía, 'YYYY-MM-DD'. */
  inicio: string
  fin: string
}

/** Redondeo a 2 decimales al final: la coma flotante no acaba impresa. */
const redondear = (n: number) => Math.round(n * 100) / 100

/** El día de Colombia ('YYYY-MM-DD') de un instante. Colombia es UTC−5 todo el año. */
export function diaBogota(instante: string): string {
  const ms = new Date(instante).getTime()
  return new Date(ms - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export type ResumenVentasEmpleado = {
  /** Membresías vendidas (sin las cortesías). */
  vendidas: number
  /** De las vendidas: miembros nuevos y renovaciones. */
  nuevas: number
  renovaciones: number
  /** Lo que sumaron las vendidas. */
  ingreso: number
  /** Ingreso por venta, en promedio; `null` sin ventas. */
  promedio: number | null
  /** Membresías dadas como cortesía (no suman). */
  cortesias: number
  /** Todo lo que registró: vendidas + cortesías. */
  registros: number
  /** Días distintos (de Colombia) en que registró algo. */
  dias: number
}

export function resumirVentasEmpleado(ventas: readonly VentaEmpleado[]): ResumenVentasEmpleado {
  let vendidas = 0
  let nuevas = 0
  let renovaciones = 0
  let ingreso = 0
  let cortesias = 0
  const dias = new Set<string>()
  for (const v of ventas) {
    dias.add(diaBogota(v.fechaHora))
    if (v.esCortesia) {
      cortesias++
      continue
    }
    vendidas++
    ingreso += v.precio
    if (v.tipo === 'nueva') nuevas++
    else renovaciones++
  }
  return {
    vendidas,
    nuevas,
    renovaciones,
    ingreso: redondear(ingreso),
    promedio: vendidas > 0 ? Math.round(ingreso / vendidas) : null,
    cortesias,
    registros: ventas.length,
    dias: dias.size,
  }
}

export type GrupoVentasEmpleado = {
  clave: string
  nombre: string
  vendidas: number
  cortesias: number
  ingreso: number
}

/** Un renglón por día de Colombia, del más reciente al más antiguo. */
export function ventasPorDia(ventas: readonly VentaEmpleado[]): GrupoVentasEmpleado[] {
  const grupos = new Map<string, GrupoVentasEmpleado>()
  for (const v of ventas) {
    const dia = diaBogota(v.fechaHora)
    const g = grupos.get(dia) ?? { clave: dia, nombre: dia, vendidas: 0, cortesias: 0, ingreso: 0 }
    if (v.esCortesia) g.cortesias++
    else {
      g.vendidas++
      g.ingreso = redondear(g.ingreso + v.precio)
    }
    grupos.set(dia, g)
  }
  return [...grupos.values()].sort((a, b) => b.clave.localeCompare(a.clave))
}

/** Un renglón por plan, de más a menos vendidas. */
export function ventasPorPlan(ventas: readonly VentaEmpleado[]): GrupoVentasEmpleado[] {
  const grupos = new Map<string, GrupoVentasEmpleado>()
  for (const v of ventas) {
    const nombre = v.plan.trim() || 'Sin plan'
    const g = grupos.get(nombre) ?? { clave: nombre, nombre, vendidas: 0, cortesias: 0, ingreso: 0 }
    if (v.esCortesia) g.cortesias++
    else {
      g.vendidas++
      g.ingreso = redondear(g.ingreso + v.precio)
    }
    grupos.set(nombre, g)
  }
  return [...grupos.values()].sort(
    (a, b) => b.vendidas - a.vendidas || b.cortesias - a.cortesias || a.nombre.localeCompare(b.nombre, 'es'),
  )
}

/** «Nuevo miembro» o «Renovación», como lo lee el administrador. */
export function textoTipoVenta(tipo: VentaEmpleado['tipo']): string {
  return tipo === 'nueva' ? 'Nuevo miembro' : 'Renovación'
}
