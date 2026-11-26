'use server'

import { redirect } from 'next/navigation'
import { urlBaseSitio } from '@/lib/auth/activacion'
import { claveCupo, huella, LIMITES } from '@/lib/auth/limite-uso'
import { hayCupo } from '@/lib/auth/limitador'
import { puedeAbrirPago, type MotivoNoPagar } from '@/lib/auth/registro-pago'
import { crearPreferencia } from '@/lib/mercadopago/cliente'
import { construirPreferenciaPago } from '@/lib/mercadopago/preferencia-pago'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type IniciarPagoState = { error?: string }

const MENSAJE_POR_MOTIVO: Record<MotivoNoPagar, string> = {
  correo_sin_confirmar: 'Primero confirma tu correo: te enviamos un enlace.',
  sin_registro: 'No encontramos un registro pendiente. Vuelve a registrarte.',
  registro_cancelado: 'Este registro ya no está activo. Vuelve a registrarte.',
  ya_completado: 'Tu membresía ya está activa.',
}

const ERROR_PAGO = 'No pudimos abrir el pago. Inténtalo de nuevo en un momento.'

/**
 * Pago único (Checkout Pro): crea la preferencia, guarda su id en el registro y
 * manda a la persona a la página de Mercado Pago. Sin cancelar nada: una
 * preferencia no cobra por sí sola, y el pago que llegue se casa con el
 * registro por `external_reference`.
 */
async function abrirPagoUnico(
  admin: ReturnType<typeof createAdminClient>,
  registro: { id: number },
  plan: { nombre: string; precio: number | string },
): Promise<IniciarPagoState> {
  const origen = new URL(urlBaseSitio()).origin
  const cuerpo = construirPreferenciaPago({
    titulo: `Membresía ORUM · ${plan.nombre}`,
    monto: Number(plan.precio),
    referenciaExterna: String(registro.id),
    urlRetorno: `${origen}/registro/pago/retorno`,
    urlNotificacion: `${origen}/api/mercadopago/webhook`,
  })

  let preferencia: { id: string; init_point: string }
  try {
    preferencia = await crearPreferencia(cuerpo)
  } catch (error) {
    console.error('[registro] no se pudo crear la preferencia de pago', error)
    return { error: ERROR_PAGO }
  }

  const { data: guardado, error: errGuardar } = await admin
    .from('registros_pendientes')
    .update({ mp_preference_id: preferencia.id, updated_at: new Date().toISOString() })
    .eq('id', registro.id)
    .eq('estado', 'pendiente')
    .select('id')
  if (errGuardar || !guardado || guardado.length === 0) return { error: ERROR_PAGO }

  redirect(preferencia.init_point)
}

/**
 * Abre el pago de la membresía: crea la suscripción en Mercado Pago y manda a
 * la persona a su página de pago. Solo si el correo está confirmado y el
 * registro sigue pendiente (`puedeAbrirPago`).
 *
 * Si ya había un intento anterior, se cancela antes. Si esa cancelación falla,
 * no se crea uno nuevo: así nunca quedan dos enlaces de pago activos.
 */
export async function iniciarPagoRegistro(
  _previo: IniciarPagoState,
  formData: FormData,
): Promise<IniciarPagoState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Entra con tu correo y tu contraseña para continuar.' }

  // Cada intento crea una suscripción en Mercado Pago: con tope por persona.
  // Si el contador falla, se deja pasar (lo importante es poder pagar).
  if (!(await hayCupo(claveCupo('pago', 'cuenta', huella(user.id)), LIMITES.pagoPorCuenta, 'permitir'))) {
    return { error: 'Hiciste muchos intentos de pago seguidos. Espera un rato e inténtalo de nuevo.' }
  }

  const admin = createAdminClient()
  const { data: registro, error: errRegistro } = await admin
    .from('registros_pendientes')
    .select('id, plan_id, estado, miembro_id, mp_preapproval_id, correo')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (errRegistro) return { error: ERROR_PAGO }

  const permiso = puedeAbrirPago(user.email_confirmed_at, registro)
  if (!permiso.ok) return { error: MENSAJE_POR_MOTIVO[permiso.motivo] }
  if (!registro) return { error: MENSAJE_POR_MOTIVO.sin_registro }

  // «Cambiar plan» (ventana del registro y «Completa tu membresía»): el plan
  // que llega del formulario manda si es uno vigente; se anota en el registro
  // ANTES de abrir el pago, que es de donde lo leen el alta y la conciliación.
  const pedido = Number(formData.get('plan_id'))
  const planId = Number.isInteger(pedido) && pedido > 0 ? pedido : registro.plan_id

  const { data: plan, error: errPlan } = await admin
    .from('planes_membresia')
    .select('nombre, precio, duracion_meses')
    .eq('id', planId)
    .eq('activo', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (errPlan || !plan) return { error: 'Ese plan ya no está disponible. Elige otro.' }

  if (planId !== registro.plan_id) {
    const { error: errCambio } = await admin
      .from('registros_pendientes')
      .update({ plan_id: planId, updated_at: new Date().toISOString() })
      .eq('id', registro.id)
      .eq('estado', 'pendiente')
    if (errCambio) return { error: ERROR_PAGO }
  }

  return abrirPagoUnico(admin, { id: registro.id }, plan)
}
