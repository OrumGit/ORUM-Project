'use server'

import { redirect } from 'next/navigation'
import { urlBaseSitio } from '@/lib/auth/activacion'
import { puedeAbrirPago, type MotivoNoPagar } from '@/lib/auth/registro-pago'
import { cancelarSuscripcion, crearSuscripcion, ErrorMercadoPago } from '@/lib/mercadopago/cliente'
import { construirCuerpoSuscripcion, correoPagador } from '@/lib/mercadopago/suscripcion-pendiente'
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
 * Abre el pago de la membresía: crea la suscripción en Mercado Pago y manda a
 * la persona a su página de pago. Solo si el correo está confirmado y el
 * registro sigue pendiente (`puedeAbrirPago`).
 *
 * Si ya había un intento anterior, se cancela antes. Si esa cancelación falla,
 * no se crea uno nuevo: así nunca quedan dos enlaces de pago activos.
 */
export async function iniciarPagoRegistro(
  _previo: IniciarPagoState,
  _formData: FormData,
): Promise<IniciarPagoState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Entra con tu correo y tu contraseña para continuar.' }

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

  const { data: plan, error: errPlan } = await admin
    .from('planes_membresia')
    .select('nombre, precio, duracion_meses')
    .eq('id', registro.plan_id)
    .eq('activo', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (errPlan || !plan) return { error: 'Ese plan ya no está disponible. Elige otro.' }

  // Cancelar el intento anterior. Si falla, no se crea otro.
  if (registro.mp_preapproval_id) {
    try {
      await cancelarSuscripcion(registro.mp_preapproval_id)
    } catch (error) {
      // Si Mercado Pago ya no la conoce, se sigue; cualquier otro fallo corta.
      if (!(error instanceof ErrorMercadoPago && error.status === 404)) {
        console.error('[registro] no se pudo cancelar el intento anterior', error)
        return { error: ERROR_PAGO }
      }
    }
  }

  const origen = new URL(urlBaseSitio()).origin
  const cuerpo = construirCuerpoSuscripcion({
    razon: `Membresía ORUM · ${plan.nombre}`,
    monto: Number(plan.precio),
    duracionMeses: plan.duracion_meses,
    emailPagador: correoPagador(registro.correo, process.env.MP_PAGADOR_PRUEBA),
    urlRetorno: `${origen}/registro/pago/retorno`,
    referenciaExterna: String(registro.id),
  })

  let suscripcion: { id: string; init_point: string }
  try {
    suscripcion = await crearSuscripcion(cuerpo)
  } catch (error) {
    console.error('[registro] no se pudo crear la suscripción', error)
    return { error: ERROR_PAGO }
  }

  const { error: errGuardar } = await admin
    .from('registros_pendientes')
    .update({ mp_preapproval_id: suscripcion.id, updated_at: new Date().toISOString() })
    .eq('id', registro.id)
  if (errGuardar) {
    // Sin guardar el id no se puede casar la notificación: se cancela lo creado.
    await cancelarSuscripcion(suscripcion.id).catch(() => undefined)
    return { error: ERROR_PAGO }
  }

  redirect(suscripcion.init_point)
}
