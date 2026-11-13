import Link from 'next/link'
import { PantallaAcceso } from '@/components/ui/pantalla-acceso'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/*
  Mercado Pago devuelve aquí a la persona al terminar el pago. La membresía no
  se activa en esta página: la activa el webhook cuando Mercado Pago confirma el
  cobro. Aquí solo se dice en qué punto está el registro.
*/
export default async function RetornoPagoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let completado = false
  if (user) {
    const { data: registro } = await createAdminClient()
      .from('registros_pendientes')
      .select('estado')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    completado = registro?.estado === 'completado'
  }

  return (
    <PantallaAcceso
      puerta="activar"
      titular={completado ? 'Tu membresía está activa' : 'Estamos confirmando tu pago'}
      apoyo={
        completado
          ? 'Ya puedes entrar al Portal de Miembros con tu correo o tu número de socio.'
          : 'Mercado Pago confirma el cobro en unos minutos. Cuando llegue la confirmación verás tu membresía lista.'
      }
    >
      <p>
        <Link href="/miembros/login">Entrar al Portal de Miembros</Link>
      </p>
    </PantallaAcceso>
  )
}
