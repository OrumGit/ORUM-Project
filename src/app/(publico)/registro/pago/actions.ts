'use server'

import { claveCupo, huella, type Limite } from '@/lib/auth/limite-uso'
import { hayCupo } from '@/lib/auth/limitador'
import { conciliarPagoUnico } from '@/lib/mercadopago/conciliar-pago-unico'
import {
  estadoPagoRegistro,
  type CobroMP,
  type EstadoPagoRegistro,
} from '@/lib/mercadopago/estado-pago-registro'
import { formatearPesos } from '@/lib/publico/planes'
import { fechaCorta } from '@/lib/shared/calendario'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/*
  EN QUÉ VA EL PAGO  ·  (23/11/2026)
  ---------------------------------------------------------------------------
  La pantalla «Confirmando tu pago» la llama cada pocos segundos, con tope
  (`SONDEO_TOPE_MS`). No confía en nada que traiga la URL de vuelta de
  Mercado Pago: mira el registro de la SESIÓN y pregunta a Mercado Pago.

  Antes esto lo hacía la propia página al cargar (una escritura en un GET);
  ahora es una acción, con su límite por persona.
*/

/** Una consulta cada 3 s durante un minuto son 20; el tope deja margen para «Revisar de nuevo». */
const LIMITE_CONSULTAS: Limite = { tope: 60, ventanaSegundos: 10 * 60 }

export type DatosBienvenida = {
  nombre: string
  nombreCompleto: string
  /** Las ocho cifras del número de socio. */
  numero: string
  plan: string
  vigenteHasta: string
  pagado: string
}

export type RespuestaPago =
  | { estado: 'sin_sesion' }
  | { estado: Exclude<EstadoPagoRegistro, 'activa'> }
  | { estado: 'activa'; socio: DatosBienvenida | null }

export async function consultarPagoRegistro(): Promise<RespuestaPago> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { estado: 'sin_sesion' }

  // Si se pasa del tope, se contesta «confirmando» sin tocar Mercado Pago.
  const conCupo = await hayCupo(claveCupo('pago-estado', 'cuenta', huella(user.id)), LIMITE_CONSULTAS, 'permitir')

  const admin = createAdminClient()
  const leerRegistro = async () => {
    const { data } = await admin
      .from('registros_pendientes')
      .select('id, estado, mp_preapproval_id, mp_preference_id, miembro_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    return data
  }

  let registro = await leerRegistro()
  let ultimoCobro: CobroMP | null = null

  // Pago único: se pregunta a Mercado Pago por los pagos del registro.
  if (conCupo && registro?.estado === 'pendiente' && registro.mp_preference_id) {
    ultimoCobro = await conciliarPagoUnico(admin, registro.id).catch((error) => {
      console.error('[registro] no se pudo conciliar el pago único', error)
      return null
    })
    registro = await leerRegistro()
  }

  // Quien ya era socio antes (renovación) no tiene registro: basta con su ficha.
  const { data: miembro } = await admin
    .from('miembros')
    .select('id, numero_membresia, nombres, apellidos')
    .eq('perfil_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  const estado = estadoPagoRegistro({
    estadoRegistro: registro?.estado ?? null,
    tieneFicha: Boolean(miembro),
    tienePago: Boolean(registro?.mp_preapproval_id || registro?.mp_preference_id),
    ultimoCobro,
  })

  if (estado !== 'activa') return { estado }
  return { estado: 'activa', socio: miembro ? await datosBienvenida(admin, miembro) : null }
}

async function datosBienvenida(
  admin: ReturnType<typeof createAdminClient>,
  miembro: { id: number; numero_membresia: string; nombres: string; apellidos: string },
): Promise<DatosBienvenida> {
  const { data: membresia } = await admin
    .from('membresias')
    .select('plan_id, fecha_fin, precio_pagado')
    .eq('miembro_id', miembro.id)
    .order('fecha_fin', { ascending: false })
    .limit(1)
    .maybeSingle()

  let plan = 'Membresía ORUM'
  if (membresia?.plan_id) {
    const { data: p } = await admin.from('planes_membresia').select('nombre').eq('id', membresia.plan_id).maybeSingle()
    if (p?.nombre) plan = p.nombre
  }

  return {
    nombre: miembro.nombres.trim().split(/\s+/)[0] ?? miembro.nombres,
    nombreCompleto: `${miembro.nombres} ${miembro.apellidos}`.trim(),
    numero: miembro.numero_membresia,
    plan,
    vigenteHasta: membresia?.fecha_fin ? fechaCorta(membresia.fecha_fin) : '',
    pagado: membresia ? formatearPesos(Number(membresia.precio_pagado)) : '',
  }
}
