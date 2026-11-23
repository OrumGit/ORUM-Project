// Procesa una notificación ya validada: consulta el recurso real en la API de
// Mercado Pago (nunca se fía del cuerpo) y llama a la función de base de datos.
//
// Solo servidor: escribe con la `service_role` a través de `admin`.

import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'
import { accionCobro, accionSuscripcion } from './estados'
import { obtenerCobroRecurrente, obtenerPago, obtenerSuscripcion } from './cliente'
import {
  argsRegistrarCobro,
  montoCuadra,
  preapprovalDePago,
  type NotificacionMP,
  type PagoMP,
} from './notificacion'

type Admin = ReturnType<typeof createAdminClient>

/**
 * La notificación es válida pero no se puede aplicar (pago incompleto, estado
 * sin efecto, suscripción desconocida). No se reintenta: se deja el motivo en
 * la bitácora y el webhook responde 200 para que Mercado Pago no lo repita.
 */
export class NotificacionNoAplicable extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'NotificacionNoAplicable'
  }
}

export type ResultadoProcesar = { accion: string }

export async function procesarNotificacion(
  admin: Admin,
  n: NotificacionMP,
): Promise<ResultadoProcesar> {
  switch (n.tipo) {
    case 'payment': {
      const pago = await obtenerPago(n.recursoId)
      const preapproval = preapprovalDePago(pago)
      if (!preapproval) throw new NotificacionNoAplicable('pago_sin_suscripcion')
      return registrarPago(admin, pago, preapproval)
    }

    case 'subscription_authorized_payment': {
      // La cuota no decide nada por sí sola: su pago es lo que se registra.
      const cuota = await obtenerCobroRecurrente(n.recursoId)
      const pagoId = cuota.payment?.id
      if (pagoId == null) return { accion: 'sin_pago_todavia' }
      const pago = await obtenerPago(String(pagoId))
      const preapproval = cuota.preapproval_id ?? preapprovalDePago(pago)
      if (!preapproval) throw new NotificacionNoAplicable('cuota_sin_suscripcion')
      return registrarPago(admin, pago, preapproval)
    }

    case 'subscription_preapproval': {
      const sus = await obtenerSuscripcion(n.recursoId)
      const accion = accionSuscripcion(sus.status)
      if (accion.tipo === 'ignorar') return { accion: `ignorada:${accion.motivo}` }

      const { error } = await admin.rpc('espejar_estado_suscripcion', {
        p_preapproval_id: sus.id,
        p_estado_mp: sus.status ?? 'desconocido',
        p_renovacion_activa: accion.renovacionActiva,
      })
      if (error) throw error
      return { accion: 'suscripcion_sincronizada' }
    }

    default:
      return { accion: 'tipo_no_gestionado' }
  }
}

async function registrarPago(
  admin: Admin,
  pago: PagoMP,
  preapprovalId: string,
): Promise<ResultadoProcesar> {
  const decision = accionCobro(pago.status)
  if (decision.tipo === 'ignorar' || decision.tipo === 'revisar_manual') {
    throw new NotificacionNoAplicable(
      decision.tipo === 'ignorar' ? decision.motivo : `revisar_manual:${decision.motivo}`,
    )
  }

  const args = argsRegistrarCobro(pago, preapprovalId)
  if (!args) throw new NotificacionNoAplicable('pago_incompleto')

  // Un cobro aprobado que no cuadra con el precio del plan no da membresía:
  // queda en la bitácora de eventos para revisarlo a mano.
  if (decision.tipo === 'registrar_aprobado') {
    const precio = await precioDelPlan(admin, preapprovalId)
    if (precio !== null && !montoCuadra(pago, precio)) {
      throw new NotificacionNoAplicable(
        `monto_no_coincide:${pago.transaction_amount ?? '?'} ${pago.currency_id ?? '?'} (plan ${precio})`,
      )
    }
  }

  // Primer cobro aprobado de un registro público: se da de alta el socio y su
  // suscripción con plan antes de registrar el cobro. Para socios existentes
  // la función no encuentra registro y no hace nada.
  if (decision.tipo === 'registrar_aprobado') {
    const { error: errAlta } = await admin.rpc('alta_socio_mercadopago', {
      p_preapproval_id: preapprovalId,
    })
    if (errAlta) {
      if (errAlta.code === 'P0001') throw new NotificacionNoAplicable(errAlta.message)
      throw errAlta
    }
  }

  const { data, error } = await admin.rpc('registrar_cobro_mp', {
    ...args,
    // Los periodos los calcula la base desde la duración del plan.
    p_periodo_desde: null,
    p_periodo_hasta: null,
  })
  if (error) {
    // Errores de negocio de la función (P0001 estado no decisivo, P0002 suscripción
    // desconocida). Cualquier otro es transitorio y debe reintentarlo Mercado Pago.
    if (error.code === 'P0001' || error.code === 'P0002') {
      throw new NotificacionNoAplicable(error.message)
    }
    throw error
  }
  return { accion: String((data as { accion?: string } | null)?.accion ?? 'registrado') }
}

/**
 * Precio del plan de esta suscripción: el de su fila en ORUM si el socio ya
 * existe, o el del registro público que la creó. `null` si no se conoce (la
 * función de la base dirá entonces que la suscripción es desconocida).
 */
async function precioDelPlan(admin: Admin, preapprovalId: string): Promise<number | null> {
  const { data: sus, error: errSus } = await admin
    .from('suscripciones_mercadopago')
    .select('plan_id')
    .eq('preapproval_id', preapprovalId)
    .maybeSingle()
  if (errSus) throw errSus

  let planId = sus?.plan_id ?? null
  if (planId === null) {
    const { data: reg, error: errReg } = await admin
      .from('registros_pendientes')
      .select('plan_id')
      .eq('mp_preapproval_id', preapprovalId)
      .maybeSingle()
    if (errReg) throw errReg
    planId = reg?.plan_id ?? null
  }
  if (planId === null) return null

  const { data: plan, error: errPlan } = await admin
    .from('planes_membresia')
    .select('precio')
    .eq('id', planId)
    .maybeSingle()
  if (errPlan) throw errPlan
  return plan ? Number(plan.precio) : null
}
