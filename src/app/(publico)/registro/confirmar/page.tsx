import { redirect } from 'next/navigation'
import { PantallaAcceso } from '@/components/ui/pantalla-acceso'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ConfirmarForm } from './_components/confirmar-form'

/*
  El ENLACE del correo de confirmación (el código de 6 dígitos es el otro
  camino, dentro de la ventana del registro). Abrir la página no gasta el
  enlace: se canjea al pulsar el botón, así un escáner de correo no lo consume.
*/
export default async function ConfirmarRegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>
}) {
  const { token_hash, type } = await searchParams

  // Correo ya confirmado y registro aún pendiente (el enlace se usó antes, o
  // se recargó): directo al pago. No depende del enlace de un solo uso.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.email_confirmed_at) {
    const { data: registro } = await createAdminClient()
      .from('registros_pendientes')
      .select('estado')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (registro?.estado === 'pendiente') redirect('/registro/completar')
  }

  return (
    <PantallaAcceso
      puerta="activar"
      titular="Confirma tu correo"
      apoyo="Un paso más para completar tu membresía de ORUM."
    >
      <ConfirmarForm tokenHash={token_hash ?? ''} tipo={type === 'magiclink' ? 'magiclink' : 'signup'} />
    </PantallaAcceso>
  )
}
