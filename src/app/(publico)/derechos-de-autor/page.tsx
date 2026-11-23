import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PaginaLegal } from '../_components/pagina-legal'

export const metadata: Metadata = {
  alternates: { canonical: '/derechos-de-autor' },
  // Borrador: fuera de los buscadores hasta el visto bueno legal.
  robots: { index: false, follow: true },
  title: 'Reclamos por derechos de autor · ORUM',
  description: 'Cómo reportar un contenido que infringe tus derechos de autor en ORUM.',
}

/*
  BORRADOR — pendiente de revisión legal (el abogado del propietario lo está
  revisando). No se publica hasta tener su visto bueno: el aviso de la primera
  sección se retira SOLO con esa confirmación.

  El correo sale de `configuracion.correo_reclamos` (alias de recepción de la
  cuenta del admin), igual que `whatsapp_soporte`, para cambiarlo sin desplegar.
*/
export default async function DerechosDeAutorPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'correo_reclamos')
    .maybeSingle()
  const correo = data?.valor?.trim() || null

  return (
    <PaginaLegal titulo="Reclamos por derechos de autor" actualizado="30 de septiembre de 2026">
      <section>
        <h2>1. Qué puedes reportar</h2>
        <p>
          Los socios de ORUM pueden subir una foto a su perfil. Si eres titular de derechos
          sobre una imagen publicada en ORUM sin tu autorización, o actúas en nombre de quien lo
          es, puedes solicitar su retiro.
        </p>
      </section>

      <section>
        <h2>2. Qué debe incluir tu aviso</h2>
        <ul>
          <li>La obra protegida que consideras infringida y cómo acreditas tus derechos.</li>
          <li>La dirección (enlace) de la imagen en ORUM, o información suficiente para ubicarla.</li>
          <li>Tu nombre, dirección, teléfono y correo de contacto.</li>
          <li>
            Una declaración de que actúas de buena fe y de que la información del aviso es
            exacta.
          </li>
          <li>Tu firma o la de quien te representa.</li>
        </ul>
      </section>

      <section>
        <h2>3. Dónde enviarlo</h2>
        {correo ? (
          <p>
            Escribe a{' '}
            <a href={`mailto:${correo}`}>
              <strong>{correo}</strong>
            </a>
            .
          </p>
        ) : (
          <p>El canal de reclamos no está disponible en este momento. Vuelve a intentarlo pronto.</p>
        )}
      </section>

      <section>
        <h2>4. Qué hacemos al recibirlo</h2>
        <p>
          Revisamos el aviso y, si corresponde, retiramos la imagen con prontitud y avisamos a
          quien la subió. Quien crea que el retiro fue un error puede responder al mismo correo.
        </p>
      </section>

      <section>
        <h2>5. Infractores reincidentes</h2>
        <p>
          ORUM puede suspender las cuentas de quienes infrinjan derechos de autor de forma
          repetida.
        </p>
      </section>
    </PaginaLegal>
  )
}
