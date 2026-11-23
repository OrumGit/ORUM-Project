import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cargarDatosRegistro } from '../_components/datos-registro'
import { CompletarMembresia } from './_components/completar-membresia'

export const metadata: Metadata = {
  title: 'Completa tu membresía',
  robots: { index: false },
}

/*
  «Completa tu membresía»: quien ya tiene cuenta (correo confirmado) y un
  registro sin pagar. Lo decide el servidor con la SESIÓN:
  - sin sesión → a entrar;
  - ya es socio, o el registro se completó → a su cuenta;
  - sin registro → a registrarse.
*/
export default async function CompletarMembresiaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/miembros/login')

  const admin = createAdminClient()
  const [{ data: miembro }, { data: registro }] = await Promise.all([
    admin.from('miembros').select('id').eq('perfil_id', user.id).is('deleted_at', null).maybeSingle(),
    admin
      .from('registros_pendientes')
      .select('estado, plan_id, nombres')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ])
  if (miembro || registro?.estado === 'completado') redirect('/miembros')
  if (!registro || registro.estado !== 'pendiente') redirect('/registro')

  const datos = await cargarDatosRegistro(String(registro.plan_id))
  if (!datos) redirect('/')

  return (
    <CompletarMembresia
      nombre={registro.nombres.trim().split(/\s+/)[0] ?? ''}
      planes={datos.planes}
      planInicial={datos.planInicial}
    />
  )
}
