import { Pause } from 'lucide-react'
import { requireRolMiembro } from '@/lib/miembros/requerir-miembro'
import { createClient } from '@/lib/supabase/server'
import { derivarEstadoMembresia, type MotivoInactiva } from '@/lib/miembros/membresias'
import { hoyISO } from '@/lib/shared/fecha'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Stack } from '@/components/ui/layout'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { cerrarSesionMiembro } from '../../login/actions'
import styles from './inactiva.module.css'

export const metadata = { title: 'Membresía en pausa · ORUM' }

/*
  MEMBRESÍA EN PAUSA  ·  spec §7

  Es la única pantalla del portal con un motivo comercial claro: un socio que
  dejó de pagar y puede volver. Antes informaba —«Tu membresía no está activa»,
  «No encontramos una membresía vigente asociada a tu cuenta»—, que es correcto
  y frío: describe un fallo de búsqueda en una base de datos.

  Ahora invita. «Pausa» es reversible; «no activa» es un veredicto. Y donde
  tenemos el dato se dice CUÁNDO venció: un dato concreto tranquiliza más que
  una frase amable.

  `requireRolMiembro`, NUNCA `requireMiembroVigente`: esta es la pantalla a la
  que ese guardián desvía, así que exigir vigencia aquí crearía un bucle.
*/

type Variante = {
  titulo: string
  cuerpo: string
  /** El texto de un botón dice lo que va a pasar, no lo que nos gustaría. */
  accion: string
}

/*
  Copy por motivo (§7.4). Ninguno culpa al socio: no se escribe «no has
  pagado» ni «tu pago no se procesó».
*/
function copiaPara(motivo: MotivoInactiva | null, fecha: string | null): Variante {
  if (motivo === 'suspendida') {
    return {
      titulo: 'Tu membresía está suspendida',
      cuerpo: 'Tu membresía está suspendida por ahora. Escríbenos y revisamos qué pasó.',
      // «Reactivar» no describe lo que va a pasar cuando hay algo que revisar.
      accion: 'Escribir a soporte',
    }
  }

  if (motivo === 'cancelada') {
    return {
      titulo: 'Tu membresía está cancelada',
      /*
        La spec pedía «se canceló el {fecha}». No hay de dónde sacar esa fecha:
        `membresias` no guarda cuándo se canceló, y `fecha_fin` es el fin del
        periodo pagado, no la cancelación. Decirlo con esa fecha sería una
        afirmación falsa, así que la frase va sin dato. Está anotado como
        propuesta para backend.
      */
      cuerpo:
        'Tu membresía se canceló. Si quieres volver al club, escríbenos y la activamos de nuevo.',
      accion: 'Reactivar mi membresía',
    }
  }

  if (motivo === 'vencida' && fecha) {
    return {
      titulo: 'Tu membresía está en pausa',
      cuerpo: `Venció el ${fecha}. Reactivarla toma un minuto y vuelves a tener todos los beneficios del club.`,
      accion: 'Reactivar mi membresía',
    }
  }

  return {
    titulo: 'Tu membresía está en pausa',
    cuerpo:
      'No encontramos una membresía vigente en tu cuenta. Escríbenos y lo resolvemos en un momento.',
    accion: 'Reactivar mi membresía',
  }
}

/*
  `fecha_fin` es 'YYYY-MM-DD' CIVIL: se construye a medianoche UTC y se
  formatea en UTC. Leerla en Bogotá (UTC−5) la retrasaría un día y esta
  pantalla anunciaría un vencimiento que no fue el que fue.
*/
const FECHA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function fechaLegible(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return FECHA.format(new Date(Date.UTC(a, m - 1, d)))
}

export default async function MembresiaInactivaPage() {
  const perfil = await requireRolMiembro()

  const supabase = await createClient()

  /*
    Independientes, así que van juntas. La membresía necesita el `id` del
    miembro, que sale de la primera: esa sí va después.
  */
  const [{ data: config }, { data: miembro }] = await Promise.all([
    supabase.from('configuracion').select('valor').eq('clave', 'whatsapp_soporte').maybeSingle(),
    supabase
      .from('miembros')
      .select('id')
      .eq('perfil_id', perfil.userId)
      .is('deleted_at', null)
      .maybeSingle(),
  ])

  let motivo: MotivoInactiva | null = null
  let fecha: string | null = null

  if (miembro) {
    const { data: membresias } = await supabase
      .from('membresias')
      .select('estado, fecha_fin')
      .eq('miembro_id', miembro.id)
      .order('fecha_fin', { ascending: false })
      .limit(1)

    const ultima = membresias?.[0]

    if (ultima) {
      /*
        DERIVADO, nunca `membresias.estado` en crudo: esa columna tiene default
        'activa' y nada la actualiza al vencer, así que a quien lleva meses sin
        pagar le diría que su membresía sigue activa.

        Si el estado derivado saliera activo —solo ocurre si alguien escribe
        esta URL a mano— no se inventa un motivo: cae en la variante genérica.
      */
      const estado = derivarEstadoMembresia(ultima.estado, ultima.fecha_fin, hoyISO())
      if (!estado.activa) {
        motivo = estado.motivo
        fecha = fechaLegible(ultima.fecha_fin)
      }
    }
  }

  const soporte = config?.valor ?? null
  const copia = copiaPara(motivo, fecha)

  return (
    <div className={styles.centro}>
      {/* La única superficie de la pantalla: lleva ella el trazo de 2px. */}
      <Card padding="lg" principal className={styles.tarjeta}>
        <Stack gap={5} escalonado>
          <div className={styles.icono} aria-hidden>
            <Pause size={26} />
          </div>

          <Stack gap={3}>
            <h1 className={styles.titulo}>{copia.titulo}</h1>
            <p className={styles.texto}>
              {copia.cuerpo}
              {/*
                §7.6: sin teléfono de soporte esta pantalla era un callejón —el
                socio veía el problema y no tenía ninguna acción—. Con el
                respaldo, siempre hay una salida y una instrucción.
              */}
              {!soporte && ' Contacta al punto donde te inscribiste para reactivarla.'}
            </p>
          </Stack>

          <Stack gap={2} className={styles.acciones}>
            {soporte && (
              /*
                `brand` y no `primary`: este es el recorrido del cliente y la
                única pantalla del portal con un motivo comercial. El oro de
                acción está habilitado aquí con los ratios ya firmados
                (`--gold-600` + tinta, 5,40:1 y 3,66:1).
              */
              <WhatsAppButton
                telefono={soporte}
                mensaje="Hola, quiero reactivar mi membresía ORUM."
                variant="brand"
                size="lg"
              >
                {copia.accion}
              </WhatsAppButton>
            )}

            {/*
              «Cerrar sesión» es nuevo y necesario: quien entró con la cuenta
              equivocada, o ya pagó por otro canal, no tenía forma de salir sin
              descubrir el menú del avatar — y pedirle eso en la pantalla que
              acaba de darle una mala noticia es de mal diseño.

              El formulario envuelve al botón para que la server action se
              dispare aunque no haya JavaScript.
            */}
            <form action={cerrarSesionMiembro}>
              <Button type="submit" variant={soporte ? 'ghost' : 'primary'} fullWidth>
                Cerrar sesión
              </Button>
            </form>
          </Stack>
        </Stack>
      </Card>
    </div>
  )
}
