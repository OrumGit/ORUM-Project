'use server'

import { mensajeDeError } from '@/lib/shared/errores'
import { createClient } from '@/lib/supabase/server'
import { requireRolComercio } from '@/lib/comercios/requerir-comercio'
import type { MetodoRegistroVenta } from '@/lib/supabase/database.types'
import { calcularDescuento, calcularValorFinal } from '@/lib/comercios/ventas'
import { createAdminClient } from '@/lib/supabase/admin'
import { esPromocionVigente } from '@/lib/comercios/promocion-vigente'
import { aplicaAhora, cuandoAplica, normalizarFranjas } from '@/lib/comercios/franjas-promocion'
import { hoyISO } from '@/lib/shared/fecha'
import { obtenerMiComercio } from '@/lib/comercios/comercio-sesion'
import { MAX_VISITAS, prepararVisitas, type HistorialVisitas } from '@/lib/comercios/visitas'

export type MiembroEncontrado = {
  id: number
  nombreCompleto: string
  numeroMembresia: string
  vigente: boolean
  membresiaId: number | null
  planNombre: string | null
  /** La foto del carnet, para cotejar la cara en la caja. `null` si no tiene. */
  fotoUrl: string | null
  /** Las últimas visitas del socio a ESTE comercio, o el aviso de que fallaron. */
  historial: HistorialVisitas
}

/**
 * Las últimas visitas del socio al comercio de la sesión.
 *
 * `service_role` filtrada por el `comercio_id` de la cookie (misma razón que la
 * foto: el comercio no lee `ventas` de otros). Nunca lanza: devuelve
 * `{ ok: false }` y la ventana lo dice, porque el historial es una ayuda y no
 * puede tumbar una verificación.
 */
async function obtenerHistorial(miembroId: number): Promise<HistorialVisitas> {
  try {
    const comercio = await obtenerMiComercio()
    if (!comercio) return { ok: false }

    const admin = createAdminClient()
    const { data: sucursales, error: errSuc } = await admin
      .from('sucursales')
      .select('id, nombre')
      .eq('comercio_id', comercio.id)
    if (errSuc || !sucursales) return { ok: false }
    if (sucursales.length === 0) return { ok: true, visitas: [] }

    const { data: filas, error } = await admin
      .from('ventas')
      .select('id, fecha_hora, sucursal_id')
      .eq('miembro_id', miembroId)
      .in('sucursal_id', sucursales.map((s) => s.id))
      .order('fecha_hora', { ascending: false })
      .limit(MAX_VISITAS)
    if (error || !filas) return { ok: false }

    return { ok: true, visitas: prepararVisitas(filas, sucursales) }
  } catch {
    return { ok: false }
  }
}

export type BuscarMiembroState = {
  error?: string
  miembro?: MiembroEncontrado
  metodo?: MetodoRegistroVenta
  /**
   * Identifica ESTA consulta. La ventana del veredicto lo usa para dos cosas:
   * saber cuál se cerró (y no reabrirla) y arrancar el formulario de venta en
   * limpio con cada socio. Dos búsquedas seguidas del mismo carnet son dos
   * consultas distintas, y por eso no sirve el id del miembro.
   */
  consultaId?: number
}

/** Busca un miembro por número de membresía vía la función segura `buscar_miembro_comercio` (RF-21/RF-22). */
export async function buscarMiembro(
  _prev: BuscarMiembroState,
  formData: FormData,
): Promise<BuscarMiembroState> {
  await requireRolComercio()

  const numero = String(formData.get('numero_membresia') ?? '').trim()
  const metodo: MetodoRegistroVenta = formData.get('metodo') === 'qr' ? 'qr' : 'numero'

  if (!/^\d{8}$/.test(numero)) {
    return { error: 'Ingresa un número de membresía válido (8 dígitos).' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('buscar_miembro_comercio', { p_numero: numero })
    .maybeSingle()

  if (error) {
    return { error: 'No se pudo verificar el miembro. Intenta de nuevo.' }
  }
  if (!data) {
    return { error: 'No se encontró un miembro con ese número.' }
  }

  /*
    LA FOTO DEL SOCIO (05/10/2026: «cuando pongo la membresía no aparece la
    foto»). La función `buscar_miembro_comercio` no la devuelve, y el comercio
    no puede leer `miembros` con su sesión (RLS). Se pide aparte con la
    `service_role`, SOLO esa columna y SOLO del miembro que la función ya
    resolvió para este comercio autenticado: es la misma foto que el socio
    enseña en su carnet, y sirve para lo mismo, cotejar la cara. Si falla, la
    ventana cae a las iniciales: la foto no puede tumbar una verificación.
  */
  const [{ data: fila }, historial] = await Promise.all([
    createAdminClient()
      .from('miembros')
      .select('foto_url')
      .eq('id', data.miembro_id)
      .is('deleted_at', null)
      .maybeSingle(),
    obtenerHistorial(data.miembro_id),
  ])

  return {
    metodo,
    consultaId: Date.now(),
    miembro: {
      id: data.miembro_id,
      nombreCompleto: `${data.nombres} ${data.apellidos}`.trim(),
      numeroMembresia: data.numero_membresia,
      vigente: data.vigente,
      membresiaId: data.membresia_id,
      planNombre: data.plan_nombre,
      /* Una cadena vacía no es una foto: sería un `<img src="">`. */
      fotoUrl: (fila?.foto_url ?? '').trim() || null,
      historial,
    },
  }
}

export type RegistrarVentaState = {
  error?: string
  ok?: boolean
  /**
   * Hora del acuse, ya formateada en `America/Bogota`.
   *
   * La calcula el SERVIDOR, no el navegador, y por dos razones. La de negocio:
   * es la hora del recibo, y el reloj del teléfono del cajero puede estar
   * desajustado —el que vale es el del sistema que guardó la venta—. La técnica:
   * leerla en el cliente obligaba a `setState` dentro de un efecto, que dispara
   * un render en cascada y que la norma del proyecto prohíbe; moverla a una
   * `ref` tampoco vale, porque una `ref` no se puede leer durante el render.
   * Devolviéndola aquí, el dato llega con el acuse y no hay nada que sincronizar.
   */
  hora?: string
  /**
   * Lo que se cobró, tal como quedó GUARDADO. El acuse lo enseña desde aquí y
   * no desde lo que había tecleado el cajero: el descuento lo recalcula el
   * servidor, y es su cifra la que vale.
   */
  valorFinal?: number
  /** La compra y el descuento guardados: los renglones del recibo. */
  valorCompra?: number
  valorDescuento?: number
}

/* Zona del negocio, no la del servidor: en UTC un acuse de las 7pm en Colombia
   saldría con la fecha del día siguiente. */
const HORA_BOGOTA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * Registra la venta (RF-21/RF-22): valida que la sucursal y la promoción sean
 * del propio comercio, recalcula el descuento en servidor (no confía en el
 * valor que mandó el formulario) y luego inserta en `ventas`.
 */
export async function registrarVenta(
  _prev: RegistrarVentaState,
  formData: FormData,
): Promise<RegistrarVentaState> {
  const actor = await requireRolComercio()

  const numeroMembresia = String(formData.get('numero_membresia') ?? '').trim()
  const sucursalId = Number(formData.get('sucursal_id'))
  const promocionIdRaw = String(formData.get('promocion_id') ?? '')
  const promocionId = promocionIdRaw ? Number(promocionIdRaw) : null
  const metodoRegistro: MetodoRegistroVenta = formData.get('metodo_registro') === 'qr' ? 'qr' : 'numero'
  const valorCompra = Number(formData.get('valor_compra'))
  const valorDescuentoInput = Number(formData.get('valor_descuento'))

  if (!/^\d{8}$/.test(numeroMembresia)) {
    return { error: 'Número de membresía inválido.' }
  }
  if (!Number.isInteger(sucursalId) || sucursalId < 1) {
    return { error: 'Selecciona la sucursal.' }
  }
  if (!Number.isFinite(valorCompra) || valorCompra < 0) {
    return { error: 'El valor de la compra debe ser un número mayor o igual a 0.' }
  }
  if (!Number.isFinite(valorDescuentoInput) || valorDescuentoInput < 0) {
    return { error: 'El valor del descuento debe ser un número mayor o igual a 0.' }
  }

  const supabase = await createClient()

  // El miembro, el comercio propio y (si aplica) la promoción no dependen
  // entre sí: se piden en paralelo en vez de uno tras otro.
  const [{ data: miembroData, error: miembroError }, { data: comercio }, { data: promo }] =
    await Promise.all([
      supabase.rpc('buscar_miembro_comercio', { p_numero: numeroMembresia }).maybeSingle(),
      supabase
        .from('comercios')
        .select('id, activo, deleted_at')
        .eq('perfil_id', actor.userId)
        .maybeSingle(),
      promocionId
        ? supabase
            .from('promociones')
            // `*`: trae `franjas_horarias` si la migración está aplicada.
            .select('*')
            .eq('id', promocionId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  if (miembroError || !miembroData) {
    return { error: 'No se pudo verificar el miembro para esta venta.' }
  }
  if (!miembroData.vigente) {
    return { error: 'La membresía de este miembro ya no está vigente.' }
  }

  const miembroId = miembroData.miembro_id
  const membresiaId = miembroData.membresia_id

  if (!comercio) return { error: 'No se encontró el comercio asociado a esta cuenta.' }

  /*
    Un comercio retirado del club («Retirar del club» en la ficha de admin) ya
    no se anuncia, pero su cuenta puede seguir con sesión abierta: son dos
    interruptores independientes. Sin esta comprobación seguiría cobrando
    descuentos a los socios. La misma regla vive en `fn_validar_venta`, que es
    la que protege si alguien llama a la API sin pasar por aquí.
  */
  if (!comercio.activo || comercio.deleted_at) {
    return {
      error: 'Este comercio ya no es aliado de ORUM, así que no puede registrar ventas. Escribe al soporte si crees que es un error.',
    }
  }

  if (promocionId && (!promo || promo.comercio_id !== comercio.id)) {
    return { error: 'La promoción seleccionada no es válida.' }
  }

  // La sucursal (depende del comercio) y el tipo de beneficio (depende de la
  // promoción) tampoco dependen entre sí: van juntas en este segundo tramo.
  const [{ data: sucursal }, { data: tipo }] = await Promise.all([
    supabase
      .from('sucursales')
      .select('id')
      .eq('id', sucursalId)
      .eq('comercio_id', comercio.id)
      .eq('activo', true)
      .maybeSingle(),
    promo
      ? supabase.from('tipos_beneficio').select('codigo').eq('id', promo.tipo_beneficio_id).single()
      : Promise.resolve({ data: null }),
  ])
  if (!sucursal) return { error: 'La sucursal seleccionada no es válida.' }

  let valorDescuento = 0
  if (promo) {
    if (!tipo || !esPromocionVigente(promo.activo, promo.fecha_inicio, promo.fecha_fin, hoyISO())) {
      return { error: 'Esa promoción ya no está vigente.' }
    }
    // Vigente por fechas, pero solo ciertos días o ciertas horas (de Colombia).
    // La base lo repite en `fn_validar_venta`.
    const franjas = normalizarFranjas(promo.franjas_horarias)
    if (!aplicaAhora(promo.dias_semana, franjas, new Date())) {
      const cuando = cuandoAplica(promo.dias_semana, franjas)
      return {
        error: `Esa promoción no aplica ${franjas ? 'a esta hora' : 'hoy'}.${cuando ? ` ${cuando}.` : ''}`,
      }
    }

    valorDescuento =
      tipo.codigo === 'porcentaje' || tipo.codigo === 'monto_fijo'
        ? calcularDescuento(tipo.codigo, promo.valor ?? 0, valorCompra)
        : valorDescuentoInput
  }

  const valorFinal = calcularValorFinal(valorCompra, valorDescuento)

  const { error: errVenta } = await supabase.from('ventas').insert({
    miembro_id: miembroId,
    membresia_id: membresiaId,
    sucursal_id: sucursalId,
    promocion_id: promocionId,
    valor_compra: valorCompra,
    valor_descuento: valorDescuento,
    valor_final: valorFinal,
    metodo_registro: metodoRegistro,
    registrada_por_perfil: actor.userId,
  })
  if (errVenta) return { error: mensajeDeError('No se pudo registrar la venta', errVenta) }

  return {
    ok: true,
    hora: HORA_BOGOTA.format(new Date()),
    valorFinal,
    valorCompra,
    valorDescuento,
  }
}
