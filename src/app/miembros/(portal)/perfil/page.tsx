import Link from 'next/link'
import { Camera } from 'lucide-react'
import { requireMiembroVigente } from '@/lib/miembros/requerir-miembro'
import { createClient } from '@/lib/supabase/server'
import { derivarEstadoMembresia } from '@/lib/miembros/membresias'
import { hoyISO } from '@/lib/shared/fecha'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { TituloSeccion } from '@/components/ui/titulo-seccion'
import { Carnet } from './_components/carnet'
import { BotonAmpliarCarnet, CarnetAmpliable } from './_components/carnet-ampliable'
import styles from './perfil.module.css'

export const metadata = { title: 'Mi carnet · ORUM' }

/*
  EL CARNET  ·  Z2

  Es lo que el socio enseña con orgullo en la caja, con una mano y con prisa.
  26/09/2026 · rediseño total del propietario: la tarjeta de chocolate de la
  Z1 pasa a ser una tarjeta BLANCA, horizontal, a todo el ancho del
  contenido — «que sea una card en fondo blanco» y, antes, «que ocupe toda la
  página, y si es PC que sea horizontal». El porqué de cada decisión, y el
  quiebre de contenedor que la tumba, están en `perfil.module.css`; el
  marcado del objeto, en `_components/carnet.tsx`; aquí solo los datos y el
  reparto de la pantalla.

  Lo que sigue igual, porque el objeto no cambió, solo el material:

  - UN SOLO EJE, como un carnet de verdad: emisor, foto, nombre, plan, estado,
    número, vigencia y QR sobre la misma línea (apilados de pie, en fila a
    partir de 640px de contenedor).
  - La FOTO manda la jerarquía, no el nombre.
  - Se AMPLÍA por encima de la página, con velo, sin navegar: `CarnetAmpliable`.
  - El QR va negro sobre blanco, pase lo que pase con el tema.
  - La foto del socio, si la hay. Si no la hay, sus iniciales — nunca un hueco
    ni un icono genérico de persona, que es lo que hace que una credencial
    parezca rota.

  Server Component entero salvo `CarnetAmpliable` (que solo guarda un booleano)
  y el botón de copiar. La aparición no necesita JavaScript: la hace un
  `@keyframes` de 180 ms.
*/

/*
  UTC a propósito: `fechaLegible` construye el instante a medianoche UTC, así
  que hay que leerlo en UTC. En Bogotá (UTC−5) retrocedería al día anterior y
  el carnet anunciaría que la membresía vence un día antes de lo que vence.
*/
const FECHA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** 'YYYY-MM-DD' → texto legible, sin desplazarse un día por zona horaria. */
function fechaLegible(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return FECHA.format(new Date(Date.UTC(a, m - 1, d)))
}

/*
  Onboarding permanente. No cuesta un clic, no se descarta. Ya no llena una
  columna lateral —con la tarjeta a todo el ancho no queda ninguna—: vive
  debajo del carnet, en tres columnas con el mismo círculo numerado que
  «Así es como te unes» en el Portal Público. `titulo` es lo primero que se
  lee en negrita; `frase` completa la instrucción.
*/
const PASOS = [
  { titulo: 'Busca el comercio', frase: 'en el catálogo y mira qué beneficio tiene.' },
  { titulo: 'Toca «Ampliar»', frase: 'y muestra el código en la caja, antes de pagar.' },
  { titulo: 'El comercio lo escanea', frase: 'y aplica tu beneficio al momento.' },
]

const MENSAJE_SOPORTE = 'Hola, tengo una duda con mi carnet ORUM.'

export default async function PerfilMiembroPage() {
  const miembro = await requireMiembroVigente()

  const supabase = await createClient()

  /*
    Las tres consultas van juntas y ninguna se aísla en un `<Suspense>`: un
    carnet que dice «Daniel Bulla» y medio segundo después añade «Plan
    Premium» —o le aparece la cara— se lee como un fallo, no como progreso.

    La foto se pide aquí y no en `requireMiembroVigente` porque esa función la
    comparten el layout y `/miembros/inactiva`, y ninguna de las dos la
    necesita: añadírsela cargaría una columna en cada navegación del portal
    para usarla en una sola pantalla.
  */
  const [{ data: plan }, { data: config }, { data: ficha }] = await Promise.all([
    supabase
      .from('planes_membresia')
      .select('nombre')
      .eq('id', miembro.membresiaVigente.planId)
      .maybeSingle(),
    supabase.from('configuracion').select('valor').eq('clave', 'whatsapp_soporte').maybeSingle(),
    supabase.from('miembros').select('foto_url').eq('id', miembro.id).maybeSingle(),
  ])

  /*
    Aunque `requireMiembroVigente` ya garantiza que está vigente, el estado se
    DERIVA igual: así el carnet puede decir cuántos días quedan, que es lo que
    de verdad le interesa al miembro, y nunca puede contradecir a la lista del
    administrador —ambos usan la misma función—.

    `membresias.estado` en crudo, JAMÁS: tiene default `'activa'` y nada la
    actualiza al vencer.
  */
  const estado = derivarEstadoMembresia(
    miembro.membresiaVigente.estado,
    miembro.membresiaVigente.fechaFin,
    hoyISO(),
  )

  const nombreCompleto = `${miembro.nombres} ${miembro.apellidos}`.trim()
  const soporte = config?.valor ?? null
  const fotoUrl = ficha?.foto_url ?? null

  /*
    Los datos del objeto se resuelven UNA vez y se reparten a las dos copias
    —la de la página y la ampliada—. Escribirlas por separado es cómo dos
    vistas del mismo dato acaban diciendo cosas distintas.
  */
  const datos = {
    nombre: nombreCompleto,
    // `planes_membresia` sostiene varios planes: mostrar el nombre es
    // correcto. Sin plan, un respaldo genérico.
    plan: plan?.nombre ?? 'Membresía ORUM',
    numeroMembresia: miembro.numeroMembresia,
    estado,
    vigencia: fechaLegible(miembro.membresiaVigente.fechaFin),
    fotoUrl,
  }

  return (
    <div className={styles.pantalla}>
      <header className={styles.encabezado}>
        <TituloSeccion como="h1" texto="Mi carnet" tamano="bloque" />
        <p className={styles.lede}>Muestra este código en la caja.</p>
      </header>

      {/*
        Las dos copias del carnet se crean AQUÍ, en el servidor, y viajan
        como props al componente de cliente. Así el QR y el retrato siguen
        siendo marcado de servidor: lo único que se hidrata es el booleano
        de «abierto» y el botón que lo enciende.

        «Ampliar» y «Cambiar foto» van DENTRO de la fila del carnet, como su
        última columna (maqueta del 29/09/2026: «nada de un hueco vacío
        debajo de la credencial»). Solo en la copia de la página: la
        ampliada es la que se enseña en la caja, y esa no lleva botones.

        Un formulario no navega: `/miembros/perfil/foto` está interceptada
        por la ranura `@modal` del portal y se abre encima del carnet.
      */}
      <CarnetAmpliable ampliado={<Carnet {...datos} variante="ampliado" />}>
        <Carnet
          {...datos}
          acciones={
            <>
              <BotonAmpliarCarnet />
              <Link href="/miembros/perfil/foto" className={styles.cambiarFoto}>
                <Camera size={13} aria-hidden="true" />
                {fotoUrl ? 'Cambiar foto' : 'Añadir mi foto'}
              </Link>
            </>
          }
        />
      </CarnetAmpliable>

      {/*
        A TODO EL ANCHO, debajo del carnet: con la tarjeta ocupando el
        contenido entero ya no queda una columna lateral que llenar. Sin
        `Card`: la pantalla ya tiene su superficie —el carnet— y duplicarla
        la convertiría en «una caja más».
      */}
      <section className={styles.como}>
        {/* El título no se ve en la maqueta, pero la sección lo necesita
            para el lector de pantalla: es un destino de salto. */}
        <h2 className="sr-only">Cómo usarlo</h2>

        <ol className={styles.pasos}>
          {PASOS.map((paso, indice) => (
            <li key={paso.titulo} className={styles.paso}>
              {/* Decorativo: el orden ya lo transporta el `<ol>`. */}
              <span className={styles.numeroPaso} aria-hidden="true">
                {indice + 1}
              </span>
              <p className={styles.pasoTexto}>
                <strong className={styles.pasoTitulo}>{paso.titulo}</strong> {paso.frase}
              </p>
            </li>
          ))}
        </ol>

        {soporte && (
          <div className={styles.soporte}>
            <p className={styles.soporteTexto}>
              ¿Algo no cuadra? El carnet es donde se nota primero: escríbenos y lo revisamos.
            </p>
            <WhatsAppButton
              telefono={soporte}
              mensaje={MENSAJE_SOPORTE}
              pildora
              className={styles.botonSoporte}
            >
              Escríbenos por WhatsApp
            </WhatsAppButton>
          </div>
        )}
      </section>
    </div>
  )
}
