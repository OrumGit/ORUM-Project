import type { Metadata } from 'next'
import { PaginaLegal } from '../_components/pagina-legal'

export const metadata: Metadata = {
  alternates: { canonical: '/pqrs' },
  title: 'PQRSF · ORUM',
  description:
    'Cómo presentar peticiones, quejas, reclamos, sugerencias y felicitaciones a ORUM, y los plazos de respuesta.',
}

/*
  Texto de la Política de Peticiones, Quejas, Reclamos, Sugerencias y
  Felicitaciones (PQRSF), revisado por el abogado (versión 1.0, vigente desde el
  14/11/2026). Se conserva su estructura y numeración. Solo cambia la forma de
  citar a la persona responsable (sin pronombres) y se omite su cédula.
*/
export default function PqrsPage() {
  return (
    <PaginaLegal
      titulo="Peticiones, quejas y reclamos (PQRSF)"
      actualizado="14 de noviembre de 2026"
    >
      <section>
        <h2>1. Objeto</h2>
        <p>
          La presente política regula la recepción, gestión y respuesta de peticiones, quejas,
          reclamos, sugerencias y felicitaciones relacionadas con los servicios ofrecidos por ORUM.
        </p>
      </section>

      <section>
        <h2>2. Responsable de atención</h2>
        <p>
          La atención está a cargo de <strong>Jessica Viviana García Fernández</strong>, persona
          natural que opera la plataforma ORUM.
        </p>
        <p>
          Correo electrónico: <strong>soporte@cluborum.com</strong>
        </p>
      </section>

      <section>
        <h2>3. Definiciones</h2>
        <p>
          <strong>Petición:</strong> Solicitud de información o aclaración presentada por un usuario.
        </p>
        <p>
          <strong>Queja:</strong> Manifestación de inconformidad relacionada con la atención recibida.
        </p>
        <p>
          <strong>Reclamo:</strong> Solicitud mediante la cual se pretende la revisión o corrección
          de una situación particular.
        </p>
        <p>
          <strong>Sugerencia:</strong> Propuesta de mejora relacionada con los servicios de ORUM.
        </p>
        <p>
          <strong>Felicitación:</strong> Reconocimiento efectuado por un usuario respecto de la
          calidad de los servicios recibidos.
        </p>
      </section>

      <section>
        <h2>4. Canales de recepción</h2>
        <p>Las PQRSF podrán presentarse mediante:</p>
        <ul>
          <li>
            Correo electrónico: <strong>soporte@cluborum.com</strong>
          </li>
          <li>Formularios electrónicos habilitados por ORUM.</li>
          <li>Los demás canales oficiales que lleguen a implementarse.</li>
        </ul>
      </section>

      <section>
        <h2>5. Información recomendada para la radicación</h2>
        <p>Se recomienda a los usuarios incluir:</p>
        <ul>
          <li>Nombre completo.</li>
          <li>Documento de identidad.</li>
          <li>Correo electrónico o medio para recibir respuesta.</li>
          <li>Descripción clara de los hechos.</li>
          <li>Documentos de soporte, cuando existan.</li>
        </ul>
      </section>

      <section>
        <h2>6. Términos de atención</h2>
        <p>
          <strong>Solicitudes generales:</strong> ORUM procurará atender las solicitudes generales
          dentro de un término máximo de quince (15) días hábiles, salvo que una disposición legal
          especial establezca un término diferente.
        </p>
        <p>
          <strong>Consultas relacionadas con datos personales:</strong> Serán atendidas conforme al
          artículo 14 de la Ley 1581 de 2012.
        </p>
        <p>
          <strong>Reclamos relacionados con datos personales:</strong> Serán tramitados conforme al
          artículo 15 de la Ley 1581 de 2012.
        </p>
        <p>
          Cuando legalmente proceda la ampliación de alguno de los términos anteriores, ORUM
          informará oportunamente dicha circunstancia al interesado.
        </p>
      </section>

      <section>
        <h2>7. Gratuidad</h2>
        <p>La presentación y trámite de PQRSF será gratuita.</p>
      </section>

      <section>
        <h2>8. Principios de atención</h2>
        <p>ORUM gestionará las solicitudes bajo los principios de:</p>
        <ul>
          <li>Buena fe.</li>
          <li>Transparencia.</li>
          <li>Celeridad.</li>
          <li>Confidencialidad.</li>
          <li>Protección de datos personales.</li>
          <li>Respeto por los derechos de los consumidores.</li>
        </ul>
      </section>

      <section>
        <h2>9. Vigencia</h2>
        <p>
          La presente política entrará en vigencia a partir del 14 de noviembre de 2026 y permanecerá
          vigente hasta su modificación o sustitución.
        </p>
      </section>
    </PaginaLegal>
  )
}
