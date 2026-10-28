import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { vecesFiltrada } from './contrasena-filtrada'
import { MENSAJE_FILTRADA, palabrasDeContexto, revisarContrasena } from './contrasena-segura'

/*
  LA REVISIÓN QUE DECIDE  ·  servidor (27/10/2026)
  ---------------------------------------------------------------------------
  El campo del navegador guía; esto decide. Lo llaman las dos puertas por
  las que se crea una contraseña: activar la cuenta / restablecerla
  (`activar-cuenta/actions.ts`) y «Cambiar contraseña» del panel
  (`admin/cuenta/actions.ts`).

  Junta las tres comprobaciones que piden NIST y OWASP:
    1. las reglas (`revisarContrasena`): largo, repeticiones, series,
       comunes;
    2. el CONTEXTO de la persona —su correo, su nombre y su cédula—, que el
       navegador no conoce al activar una cuenta y aquí sí;
    3. las filtraciones conocidas (`vecesFiltrada`).
*/

/**
 * Las palabras propias de la cuenta: el correo y, según quién sea, los
 * nombres y la cédula del socio o del empleado, o el nombre del comercio.
 * Con la `service_role`, solo de ESTE `perfilId`, y solo para comparar.
 */
export async function contextoDeLaCuenta(perfilId: string, correo: string | undefined): Promise<string[]> {
  const datos: (string | null | undefined)[] = [correo]
  try {
    const admin = createAdminClient()
    const [miembro, empleado, comercio] = await Promise.all([
      admin.from('miembros').select('nombres, apellidos, cedula').eq('perfil_id', perfilId).maybeSingle(),
      admin.from('empleados').select('nombres, apellidos, cedula').eq('perfil_id', perfilId).maybeSingle(),
      admin.from('comercios').select('nombre').eq('perfil_id', perfilId).maybeSingle(),
    ])
    for (const fila of [miembro.data, empleado.data]) {
      if (fila) datos.push(fila.nombres, fila.apellidos, fila.cedula)
    }
    if (comercio.data) datos.push(comercio.data.nombre)
  } catch {
    // Sin los datos de la cuenta, la revisión sigue con el correo.
  }
  return palabrasDeContexto(datos)
}

/** `null` si la contraseña vale; si no, el mensaje que dice qué cambiar. */
export async function motivoParaRechazar(contrasena: string, contexto: readonly string[]): Promise<string | null> {
  const revision = revisarContrasena(contrasena, contexto)
  if (!revision.ok) return revision.mensaje
  const veces = await vecesFiltrada(contrasena)
  if (veces !== null && veces > 0) return MENSAJE_FILTRADA
  return null
}
