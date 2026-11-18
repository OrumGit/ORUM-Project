import Link from 'next/link'
import { PantallaAcceso } from '@/components/ui/pantalla-acceso'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { conciliarSuscripcion } from '@/lib/mercadopago/conciliar'

/*
  Mercado Pago devuelve aquí a la persona al terminar el pago. La membresía la
  activa el webhook al confirmarse el cobro. Como respaldo, si el webhook no
  llegó, esta página concilia la suscripción con la API de Mercado Pago (la
  misma lógica, idempotente) antes de decir en qué punto está el registro.
*/
export default async function RetornoPagoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let completado = false
  if (user) {
    const admin = createAdminClient()
    const { data: pendiente } = await admin
      .from('registros_pendientes')
      .select('estado, mp_preapproval_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (pendiente?.estado === 'pendiente' && pendiente.mp_preapproval_id) {
      await conciliarSuscripcion(admin, pendiente.mp_preapproval_id).catch((error) =>
        console.error('[registro] no se pudo conciliar la suscripción', error),
      )
    }
    const { data: registro } = await admin
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
