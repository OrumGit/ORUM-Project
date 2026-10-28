'use server'

import { leerPesos } from '@/lib/validacion/reglas'
import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual, type PerfilActual } from '@/lib/auth/auth'
import { hoyISO } from '@/lib/shared/fecha'
import { registrarActividad } from '@/lib/bitacora/bitacora'
import { enviarCorreoInvitacion } from '@/lib/correo/correo'
import {
  calcularFechaFin,
  calcularFechaInicioRenovacion,
  derivarEstadoMembresia,
  type EstadoMembresia,
} from '@/lib/miembros/membresias'
import { esNumeroRegistroValido } from '@/lib/miembros/numeros-registro'
import { revisarRevocacion } from '@/lib/miembros/revocacion'
import { construirEnlaceActivacion, urlBaseSitio } from '@/lib/auth/activacion'
import { errorDeCorreoOcupado } from '@/lib/auth/correo-registrado'
import { cambiarCorreoDeCuenta } from '@/lib/auth/cambiar-correo'

type Admin = ReturnType<typeof createAdminClient>

/** Devuelve el perfil del actor si es empleado o super_admin activo; si no, null. */
async function exigirEmpleadoOAdmin(): Promise<PerfilActual | null> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo) return null
  if (actor.rolCodigo !== 'empleado' && actor.rolCodigo !== 'super_admin') return null
  return actor
}

/** empleados.id del actor, o null si es super_admin sin fila en empleados (D5). */
async function resolverEmpleadoId(admin: Admin, perfilId: string): Promise<number | null> {
  const { data } = await admin
    .from('empleados')
    .select('id')
    .eq('perfil_id', perfilId)
    .is('deleted_at', null)
    .maybeSingle()
  return data?.id ?? null
}

export type RegistrarMiembroState = {
  error?: string
  ok?: boolean
  numero?: string
  correo?: string
  nombre?: string
}

/**
 * Registra un cliente (miembro) junto con su PRIMERA membresía (tipo=nueva).
 * Flujo: validar → crear usuario en Auth (correo real) → upsert perfil (rol
 * miembro) → insertar miembro (con número único, reintentando ante colisión) →
 * insertar membresía. Revierte todo si algún paso falla.
 */
export async function registrarMiembro(
  _prev: RegistrarMiembroState,
  formData: FormData,
): Promise<RegistrarMiembroState> {
  const actor = await exigirEmpleadoOAdmin()
  if (!actor) return { error: 'No tienes permiso para realizar esta acción.' }

  // 1) Leer y validar campos.
  const nombres = String(formData.get('nombres') ?? '').trim()
  const apellidos = String(formData.get('apellidos') ?? '').trim()
  const cedula = String(formData.get('cedula') ?? '').trim()
  const correo = String(formData.get('correo') ?? '').trim().toLowerCase()
  const telefono = String(formData.get('telefono') ?? '').trim() || null
  const direccion = String(formData.get('direccion') ?? '').trim() || null
  const ciudadRaw = String(formData.get('ciudad_id') ?? '').trim()
  const ciudad_id = ciudadRaw ? Number(ciudadRaw) : null
  const plan_id = Number(formData.get('plan_id'))
  // Cortesía: la membresía existe pero no es una venta. El precio que llegue se
  // ignora: una cortesía no se cobra.
  const es_cortesia = formData.get('es_cortesia') === 'on'
  const precio_pagado = es_cortesia ? 0 : leerPesos(formData.get('precio_pagado'))
  const numero_registro = String(formData.get('numero_registro') ?? '').trim()

  if (!nombres || !apellidos) return { error: 'Nombres y apellidos son obligatorios.' }
  if (!cedula) return { error: 'La cédula es obligatoria.' }
  if (!correo || !correo.includes('@')) return { error: 'Ingresa un correo electrónico válido.' }
  if (!esNumeroRegistroValido(numero_registro)) return { error: 'Selecciona un número de registro.' }
  if (!Number.isInteger(plan_id)) return { error: 'Selecciona un plan de membresía.' }
  if (!Number.isFinite(precio_pagado) || precio_pagado < 0) {
    return { error: 'El precio pagado debe ser un número mayor o igual a 0.' }
  }

  const admin = createAdminClient()

  // 2-5) Cédula única, plan activo, rol "miembro", número de registro libre y
  // empleado del actor: ninguna depende de otra, así que van en paralelo.
  const [
    { data: cedulaExiste },
    { data: plan },
    { data: rolMiembro },
    { data: numeroLibre },
    empleadoId,
  ] = await Promise.all([
    admin.from('miembros').select('id').eq('cedula', cedula).is('deleted_at', null).maybeSingle(),
    admin
      .from('planes_membresia')
      .select('id, nombre, duracion_meses, activo')
      .eq('id', plan_id)
      .is('deleted_at', null)
      .maybeSingle(),
    admin.from('roles').select('id').eq('codigo', 'miembro').single(),
    admin
      .from('numeros_registro')
      .select('numero')
      .eq('numero', numero_registro)
      .is('miembro_id', null)
      .maybeSingle(),
    resolverEmpleadoId(admin, actor.userId),
  ])
  if (cedulaExiste) return { error: `Ya existe un miembro con la cédula ${cedula}.` }
  if (!plan || !plan.activo) return { error: 'El plan seleccionado no existe o está inactivo.' }
  if (!rolMiembro) return { error: 'No se encontró el rol "miembro" en la base de datos.' }
  if (!numeroLibre) {
    return { error: 'El número de registro seleccionado ya no está disponible. Elige otro.' }
  }

  // 5) Crear usuario en Auth vía invitación: no se genera ni se envía
  // contraseña, el miembro elige la suya al abrir el enlace de un solo uso.
  // Antes se comprueba que el correo esté libre: la invitación no falla con uno
  // ya registrado y le pisaría el rol a esa cuenta.
  const errCorreo = await errorDeCorreoOcupado(admin, correo)
  if (errCorreo) return { error: errCorreo }

  const { data: creado, error: errAuth } = await admin.auth.admin.generateLink({
    type: 'invite',
    email: correo,
    options: { redirectTo: urlBaseSitio() },
  })
  if (errAuth || !creado?.user) {
    const msg = /already been registered|already registered|exists/i.test(errAuth?.message ?? '')
      ? 'Ya existe un usuario con ese correo.'
      : mensajeDeError('No se pudo crear el usuario', errAuth)
    return { error: msg }
  }
  const userId = creado.user.id

  // Compensación ante fallos posteriores. Solo se libera el número del pozo si
  // ESTA alta llegó a asignárselo (`numeroAsignado`): sin ese guard, un fallo
  // en una alta que perdió la carrera borraría la asignación legítima de otra.
  // Y se libera ANTES de borrar el miembro: la FK numeros_registro.miembro_id
  // es ON DELETE RESTRICT, así que con la fila aún asignada el delete fallaría.
  let numeroAsignado = false
  const revertir = async () => {
    if (numeroAsignado) {
      await admin
        .from('numeros_registro')
        .update({ miembro_id: null, asignado_at: null })
        .eq('numero', numero_registro)
    }
    await admin.from('miembros').delete().eq('perfil_id', userId)
    await admin.from('perfiles').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
  }

  // 6) Perfil (rol miembro).
  const { error: errPerfil } = await admin
    .from('perfiles')
    .upsert(
      { id: userId, rol_id: rolMiembro.id, activo: true, updated_by: actor.userId },
      { onConflict: 'id' },
    )
  if (errPerfil) {
    await revertir()
    return { error: mensajeDeError('No se pudo crear el perfil', errPerfil) }
  }

  // 7) Insertar miembro con el número de registro elegido del pozo.
  const numero = numero_registro
  const { data: filaMiembro, error: errMiembro } = await admin
    .from('miembros')
    .insert({
      updated_by: actor.userId,
      perfil_id: userId,
      numero_membresia: numero,
      nombres,
      apellidos,
      cedula,
      telefono,
      direccion,
      ciudad_id,
      registrado_por: empleadoId,
    })
    .select('id')
    .single()
  if (errMiembro || !filaMiembro) {
    await revertir()
    // 23505 = unique_violation: entre la comprobación de arriba y este insert,
    // otra alta tomó el mismo número (o la misma cédula).
    const msg =
      errMiembro?.code === '23505'
        ? 'Ese número de registro acaba de asignarse a otro miembro. Elige otro.'
        : mensajeDeError('No se pudo registrar el miembro', errMiembro)
    return { error: msg }
  }
  const miembroId = filaMiembro.id

  // Marcar el número como asignado. El guard `.is('miembro_id', null)` cierra la
  // ventana de carrera: si otra alta lo tomó primero, aquí no afecta ninguna
  // fila y se revierte.
  const { data: asignado, error: errAsignar } = await admin
    .from('numeros_registro')
    .update({ miembro_id: miembroId, asignado_at: new Date().toISOString() })
    .eq('numero', numero)
    .is('miembro_id', null)
    .select('numero')
    .maybeSingle()
  if (errAsignar || !asignado) {
    await revertir()
    return { error: 'Ese número de registro acaba de asignarse a otro miembro. Elige otro.' }
  }
  numeroAsignado = true

  // 8) Primera membresía (nueva).
  const fecha_inicio = hoyISO()
  const fecha_fin = calcularFechaFin(fecha_inicio, plan.duracion_meses)
  const { error: errMembresia } = await admin.from('membresias').insert({
    updated_by: actor.userId,
    miembro_id: miembroId,
    plan_id,
    tipo: 'nueva',
    estado: 'activa',
    fecha_inicio,
    fecha_fin,
    precio_pagado,
    es_cortesia,
    vendido_por: empleadoId,
  })
  if (errMembresia) {
    await revertir()
    return { error: mensajeDeError('No se pudo registrar la membresía', errMembresia) }
  }

  await registrarActividad(admin, {
    actorId: actor.userId,
    accion: 'alta',
    entidadId: miembroId,
    datosNuevos: {
      nombres,
      apellidos,
      cedula,
      numero_membresia: numero,
      plan_nombre: plan.nombre,
      precio_pagado,
      es_cortesia,
    },
  })

  await enviarCorreoInvitacion({
    nombre: `${nombres} ${apellidos}`.trim(),
    correo,
    urlInvitacion: construirEnlaceActivacion(
      urlBaseSitio(),
      'miembro',
      creado.properties.hashed_token,
      creado.properties.verification_type,
    ),
  })

  revalidatePath('/admin/miembros')
  return { ok: true, numero, correo, nombre: `${nombres} ${apellidos}`.trim() }
}

export type RenovarState = { error?: string; ok?: boolean }

/**
 * Renueva la membresía de un miembro: crea una nueva (tipo=renovada) enlazada a
 * la vigente, marca la anterior como 'vencida' y deja solo una 'activa'.
 */
export async function renovarMembresia(
  _prev: RenovarState,
  formData: FormData,
): Promise<RenovarState> {
  const actor = await exigirEmpleadoOAdmin()
  if (!actor) return { error: 'No tienes permiso para realizar esta acción.' }

  const miembro_id = Number(formData.get('miembro_id'))
  const plan_id = Number(formData.get('plan_id'))
  const es_cortesia = formData.get('es_cortesia') === 'on'
  const precio_pagado = es_cortesia ? 0 : leerPesos(formData.get('precio_pagado'))
  if (!Number.isInteger(miembro_id) || miembro_id < 1) return { error: 'Falta el identificador del miembro.' }
  if (!Number.isInteger(plan_id) || plan_id < 1) return { error: 'Selecciona un plan de membresía.' }
  if (!Number.isFinite(precio_pagado) || precio_pagado < 0) {
    return { error: 'El precio pagado debe ser un número mayor o igual a 0.' }
  }

  const admin = createAdminClient()

  // El plan, la membresía vigente (si existe) y el empleado del actor no
  // dependen entre sí: se piden en paralelo.
  const [{ data: plan }, { data: vigente }, empleadoId] = await Promise.all([
    admin
      .from('planes_membresia')
      .select('id, nombre, duracion_meses, activo')
      .eq('id', plan_id)
      .is('deleted_at', null)
      .maybeSingle(),
    admin
      .from('membresias')
      .select('id, fecha_fin')
      .eq('miembro_id', miembro_id)
      .eq('estado', 'activa')
      .order('fecha_fin', { ascending: false })
      .limit(1)
      .maybeSingle(),
    resolverEmpleadoId(admin, actor.userId),
  ])
  if (!plan || !plan.activo) return { error: 'El plan seleccionado no existe o está inactivo.' }

  const fecha_inicio = calcularFechaInicioRenovacion(hoyISO(), vigente?.fecha_fin ?? null)
  const fecha_fin = calcularFechaFin(fecha_inicio, plan.duracion_meses)

  // La anterior pasa a 'vencida' ANTES de insertar la nueva: uq_membresia_activa
  // (índice único sobre membresias(miembro_id) WHERE estado='activa') rechaza el
  // INSERT si sigue habiendo una fila 'activa' para este miembro. Si el INSERT de
  // abajo falla, se revierte este UPDATE para no dejar al miembro sin membresía.
  if (vigente) {
    const { error: errVencer } = await admin
      .from('membresias')
      .update({ estado: 'vencida', updated_by: actor.userId })
      .eq('id', vigente.id)
    if (errVencer) {
      return { error: mensajeDeError('No se pudo completar la renovación', errVencer) }
    }
  }

  const { data: nueva, error: errNueva } = await admin
    .from('membresias')
    .insert({
      updated_by: actor.userId,
      miembro_id,
      plan_id,
      tipo: 'renovada',
      estado: 'activa',
      fecha_inicio,
      fecha_fin,
      precio_pagado,
      es_cortesia,
      vendido_por: empleadoId,
      membresia_anterior_id: vigente?.id ?? null,
    })
    .select('id')
    .single()
  if (errNueva || !nueva) {
    if (vigente) {
      await admin
        .from('membresias')
        .update({ estado: 'activa', updated_by: actor.userId })
        .eq('id', vigente.id)
    }
    return { error: mensajeDeError('No se pudo registrar la renovación', errNueva) }
  }

  await registrarActividad(admin, {
    actorId: actor.userId,
    accion: 'renovacion',
    entidadId: miembro_id,
    datosNuevos: {
      plan_nombre: plan.nombre,
      fecha_inicio,
      fecha_fin,
      precio_pagado,
      es_cortesia,
    },
  })

  revalidatePath('/admin/miembros')
  revalidatePath(`/admin/miembros/${miembro_id}`)
  return { ok: true }
}

export type EditarMiembroState = { error?: string; ok?: boolean }

/**
 * Edita los datos de un miembro (no cambia número ni perfil_id/UUID). El correo
 * se actualiza vía Admin API sólo si cambió.
 */
export async function editarMiembro(
  _prev: EditarMiembroState,
  formData: FormData,
): Promise<EditarMiembroState> {
  const actor = await exigirEmpleadoOAdmin()
  if (!actor) return { error: 'No tienes permiso para realizar esta acción.' }

  const miembroId = Number(formData.get('miembro_id'))
  const perfilId = String(formData.get('perfil_id') ?? '')
  if (!Number.isInteger(miembroId) || miembroId < 1) return { error: 'Falta el identificador del miembro.' }

  const nombres = String(formData.get('nombres') ?? '').trim()
  const apellidos = String(formData.get('apellidos') ?? '').trim()
  const cedula = String(formData.get('cedula') ?? '').trim()
  const telefono = String(formData.get('telefono') ?? '').trim() || null
  const direccion = String(formData.get('direccion') ?? '').trim() || null
  const ciudadRaw = String(formData.get('ciudad_id') ?? '').trim()
  const ciudad_id = ciudadRaw ? Number(ciudadRaw) : null
  const correo = String(formData.get('correo') ?? '').trim().toLowerCase()
  const correoOriginal = String(formData.get('correo_original') ?? '').trim().toLowerCase()
  if (!nombres || !apellidos) return { error: 'Nombres y apellidos son obligatorios.' }
  if (!cedula) return { error: 'La cédula es obligatoria.' }
  // Validar el formato del correo ANTES de escribir, para no dejar una edición a medias.
  if (correo && !correo.includes('@')) return { error: 'El correo electrónico no es válido.' }

  const admin = createAdminClient()

  // Snapshot para la bitácora y la verificación de cédula única no dependen
  // entre sí: se piden en paralelo.
  const [{ data: miembroAntes }, { data: cedulaExiste }] = await Promise.all([
    admin
      .from('miembros')
      .select('nombres, apellidos, cedula, telefono, direccion, ciudad_id')
      .eq('id', miembroId)
      .maybeSingle(),
    admin
      .from('miembros')
      .select('id')
      .eq('cedula', cedula)
      .is('deleted_at', null)
      .neq('id', miembroId)
      .maybeSingle(),
  ])
  if (cedulaExiste) return { error: `Ya existe otro miembro con la cédula ${cedula}.` }

  const { error } = await admin
    .from('miembros')
    .update({ nombres, apellidos, cedula, telefono, direccion, ciudad_id, updated_by: actor.userId })
    .eq('id', miembroId)
  if (error) return { error: mensajeDeError('No se pudieron guardar los cambios', error) }

  await registrarActividad(admin, {
    actorId: actor.userId,
    accion: 'edicion',
    entidadId: miembroId,
    datosAnteriores: miembroAntes,
    datosNuevos: { nombres, apellidos, cedula, telefono, direccion, ciudad_id },
  })

  // Correo (vía Auth), sólo si cambió. El formato ya se validó arriba.
  if (perfilId && correo && correo !== correoOriginal) {
    const cambio = await cambiarCorreoDeCuenta(admin, perfilId, correo)
    if (!cambio.ok) return { error: cambio.error }
  }

  revalidatePath('/admin/miembros')
  revalidatePath(`/admin/miembros/${miembroId}`)
  return { ok: true }
}

export type RevocarState = { error?: string; ok?: boolean; campo?: 'motivo' | 'nota' }

/**
 * REVOCA la membresía vigente de un miembro (29/10/2026). Solo el
 * administrador: es una decisión que deja a alguien sin beneficios, como
 * retirar una foto. La membresía pasa a `cancelada` —no se borra—, la caja
 * deja de aceptarla (`fn_validar_venta` exige `activa`) y el socio ve su
 * pantalla de membresía cancelada. El motivo y la nota quedan en la
 * bitácora del miembro.
 */
export async function revocarMembresia(_prev: RevocarState, formData: FormData): Promise<RevocarState> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo || actor.rolCodigo !== 'super_admin') {
    return { error: 'Solo el administrador puede revocar membresías.' }
  }

  const miembroId = Number(formData.get('miembro_id'))
  const membresiaId = Number(formData.get('membresia_id'))
  if (!Number.isInteger(miembroId) || miembroId < 1 || !Number.isInteger(membresiaId) || membresiaId < 1) {
    return { error: 'Falta la membresía que se quiere revocar.' }
  }

  const revision = revisarRevocacion(formData.get('motivo'), formData.get('nota'))
  if (!revision.ok) return { error: revision.error, campo: revision.campo }

  const admin = createAdminClient()
  // La membresía tiene que ser de ESTE miembro: el id viene del formulario.
  const { data: membresia } = await admin
    .from('membresias')
    .select('id, estado, fecha_fin, plan_id')
    .eq('id', membresiaId)
    .eq('miembro_id', miembroId)
    .maybeSingle()
  if (!membresia) return { error: 'No encontramos esa membresía.' }

  const derivado = derivarEstadoMembresia(membresia.estado as EstadoMembresia, membresia.fecha_fin, hoyISO())
  if (!derivado.activa) return { error: 'Esta membresía ya no está vigente: no hay nada que revocar.' }

  const { error } = await admin
    .from('membresias')
    .update({ estado: 'cancelada', updated_by: actor.userId })
    .eq('id', membresia.id)
    .eq('estado', 'activa')
  if (error) return { error: mensajeDeError('No se pudo revocar la membresía', error) }

  await registrarActividad(admin, {
    actorId: actor.userId,
    accion: 'revocacion',
    entidadId: miembroId,
    datosAnteriores: { estado: 'activa' },
    datosNuevos: {
      membresia_id: membresia.id,
      fecha_fin: membresia.fecha_fin,
      motivo: revision.motivo,
      nota: revision.nota,
    },
  })

  revalidatePath('/admin/miembros')
  revalidatePath(`/admin/miembros/${miembroId}`)
  revalidatePath('/admin')
  revalidatePath('/miembros', 'layout')
  return { ok: true }
}
