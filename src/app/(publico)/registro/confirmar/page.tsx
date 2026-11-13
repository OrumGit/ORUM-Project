import { PantallaAcceso } from '@/components/ui/pantalla-acceso'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ConfirmarForm } from './_components/confirmar-form'

export default async function ConfirmarRegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>
}) {
  const { token_hash } = await searchParams

  // Si el correo ya está confirmado y la sesión sigue abierta (el enlace se
  // usó antes, o se recargó la página), va directo al pago: no depende del
  // token de un solo uso.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let pasoPago = false
  if (user?.email_confirmed_at) {
    const { data: registro } = await createAdminClient()
      .from('registros_pendientes')
      .select('estado')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    pasoPago = registro?.estado === 'pendiente'
  }

  return (
    <PantallaAcceso
      puerta="activar"
      titular="Confirma tu correo"
      apoyo="Un paso más para completar tu membresía de ORUM."
    >
      <ConfirmarForm tokenHash={token_hash ?? ''} pasoPago={pasoPago} />
    </PantallaAcceso>
  )
}
