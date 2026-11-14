import type { Metadata } from 'next'
import Link from 'next/link'
import { PaginaLegal } from '../_components/pagina-legal'

export const metadata: Metadata = {
  alternates: { canonical: '/privacidad' },
  title: 'Aviso de privacidad · ORUM',
  description:
    'Cómo ORUM recolecta, usa y protege los datos personales de socios, comercios y visitantes, y cómo ejercer tus derechos.',
}

/*
  Texto del Aviso de Privacidad y de la Autorización de tratamiento, revisados
  por el abogado (versión 1.0, vigente desde el 14/11/2026). Se conserva su
  estructura. Solo cambia la forma de citar a la persona responsable (sin
  pronombres) y se omite el número de cédula, que no hace falta publicar.

  La cláusula biométrica de la autorización (sección final) se añadió después
  de la revisión y está pendiente de aprobación del abogado.
*/
export default function PrivacidadPage() {
  return (
    <PaginaLegal titulo="Aviso de privacidad" actualizado="14 de noviembre de 2026">
      <section>
        <h2>Responsable del tratamiento</h2>
        <p>
          El tratamiento de los datos personales está a cargo de{' '}
          <strong>Jessica Viviana García Fernández</strong>, persona natural que opera la
          plataforma ORUM.
        </p>
        <p>
          Correo electrónico: <strong>orumplataforma@gmail.com</strong>
        </p>
      </section>

      <section>
        <h2>Datos personales que podrán ser tratados</h2>
        <p>Dependiendo del servicio solicitado, ORUM podrá recolectar y tratar:</p>
        <ul>
          <li>Nombre.</li>
          <li>Apellidos.</li>
          <li>Tipo y número de documento.</li>
          <li>Fecha de nacimiento.</li>
          <li>Correo electrónico.</li>
          <li>Número celular.</li>
          <li>Ciudad de residencia.</li>
        </ul>
      </section>

      <section>
        <h2>Finalidades del tratamiento</h2>
        <p>Los datos personales podrán ser utilizados para:</p>
        <ul>
          <li>Administrar registros y cuentas de usuario.</li>
          <li>Gestionar membresías.</li>
          <li>Validar identidad y mayoría de edad.</li>
          <li>Procesar pagos.</li>
          <li>Permitir el acceso a beneficios ofrecidos por comercios aliados.</li>
          <li>Atender consultas, solicitudes y reclamaciones.</li>
          <li>Cumplir obligaciones legales y contractuales.</li>
          <li>Prevenir fraudes y usos indebidos de la plataforma.</li>
        </ul>
      </section>

      <section>
        <h2>Transmisión y tratamiento internacional de datos</h2>
        <p>
          ORUM podrá utilizar proveedores tecnológicos ubicados dentro o fuera de Colombia
          cuando ello resulte necesario para la prestación de sus servicios y siempre que el
          tratamiento cumpla las condiciones previstas en la Ley 1581 de 2012 y el Decreto
          1074 de 2015.
        </p>
        <p>
          Actualmente ORUM ha informado el uso de infraestructura tecnológica asociada a{' '}
          <strong>Supabase y Vercel</strong>, lo cual puede implicar almacenamiento o
          tratamiento internacional de información.
        </p>
      </section>

      <section>
        <h2>Derechos del titular</h2>
        <p>El titular puede:</p>
        <ul>
          <li>Conocer los datos personales objeto de tratamiento.</li>
          <li>Solicitar actualización o rectificación.</li>
          <li>Solicitar prueba de la autorización otorgada.</li>
          <li>Presentar consultas y reclamos.</li>
          <li>Solicitar la supresión de datos cuando proceda legalmente.</li>
          <li>Revocar la autorización cuando resulte procedente.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
        </ul>
        <p>
          Para consultas y reclamos sobre datos personales escribe a{' '}
          <strong>orumplataforma@gmail.com</strong>. El procedimiento está en la{' '}
          <Link href="/pqrs">página de PQRSF</Link>.
        </p>
      </section>

      <section>
        <h2>Conservación de la información</h2>
        <p>
          Los datos personales serán conservados durante el tiempo necesario para cumplir las
          finalidades descritas en la Política de Tratamiento de Datos Personales, atender
          obligaciones legales o contractuales y ejercer la defensa de los derechos e
          intereses legítimos de la persona responsable del tratamiento.
        </p>
      </section>

      <section>
        <h2>Autorización de tratamiento de datos</h2>
        <p>
          Al registrarte, el tratamiento de tus datos personales requiere tu autorización
          previa, expresa e informada. Este es el texto de la autorización.
        </p>

        <h3>Autorización principal obligatoria</h3>
        <p>
          De conformidad con la Ley 1581 de 2012 y el Decreto Único Reglamentario 1074 de
          2015, autorizo de manera previa, expresa e informada a ORUM para recolectar,
          almacenar, usar, actualizar, circular y transmitir mis datos personales para las
          siguientes finalidades:
        </p>
        <ul>
          <li>Administrar mi registro como usuario.</li>
          <li>Gestionar mi membresía.</li>
          <li>Verificar mi identidad.</li>
          <li>Procesar pagos.</li>
          <li>Atender solicitudes, consultas, quejas y reclamos.</li>
          <li>Cumplir obligaciones legales y contractuales.</li>
          <li>Prevenir fraude, suplantación o actividades ilícitas.</li>
        </ul>
        <p>
          Asimismo, autorizo que mis datos personales puedan ser tratados mediante proveedores
          tecnológicos utilizados por ORUM, incluso cuando el almacenamiento o procesamiento se
          lleve a cabo fuera del territorio colombiano, en los términos permitidos por la
          legislación vigente.
        </p>
        <p>
          <strong>ACEPTO Y AUTORIZO EL TRATAMIENTO DE MIS DATOS PERSONALES PARA LA PRESTACIÓN
          DE LOS SERVICIOS OFRECIDOS POR ORUM.</strong>
        </p>

        <h3>Autorización opcional para comunicaciones comerciales</h3>
        <p>De manera libre y voluntaria:</p>
        <ul>
          <li>
            AUTORIZO a ORUM para enviarme información comercial, promocional, publicitaria,
            novedades, campañas, beneficios, descuentos y comunicaciones relacionadas con la
            plataforma y sus aliados comerciales.
          </li>
          <li>NO AUTORIZO el envío de comunicaciones comerciales.</li>
        </ul>

        <h3>Información al titular</h3>
        <p>Declaro haber sido informado sobre:</p>
        <ul>
          <li>Mi derecho a conocer, actualizar y rectificar mis datos personales.</li>
          <li>Mi derecho a solicitar prueba de la autorización otorgada.</li>
          <li>Mi derecho a presentar consultas y reclamos.</li>
          <li>Mi derecho a solicitar la supresión de mis datos cuando resulte procedente.</li>
          <li>Mi derecho a presentar quejas ante la Superintendencia de Industria y Comercio.</li>
        </ul>
        <p>
          Declaro igualmente haber sido informado de que no estoy obligado a autorizar el
          tratamiento de datos sensibles ni de datos de niños, niñas o adolescentes.
        </p>

        <h3>Consentimiento electrónico</h3>
        <p>
          La aceptación de esta autorización mediante casillas de verificación, autenticación
          de usuario, aceptación digital o cualquier otro mecanismo electrónico habilitado por
          ORUM constituirá manifestación válida de consentimiento conforme a la Ley 527 de
          1999.
        </p>

        <h3>Autorización adicional para el tratamiento de datos biométricos</h3>
        <p>
          ORUM utiliza la fotografía del carnet del socio para verificar, en los comercios
          aliados, que quien presenta la membresía es su titular. Esta verificación implica
          comparar los rasgos faciales de la persona con la fotografía registrada, lo que
          constituye tratamiento de datos biométricos, considerados datos sensibles por la Ley
          1581 de 2012.
        </p>
        <p>
          Declaro haber sido informado de que no estoy obligado a autorizar el tratamiento de
          datos sensibles, de que puedo elegir libremente si lo autorizo, y de que mi negativa
          no afecta la existencia de mi membresía. Si no lo autorizo, mi fotografía no será
          utilizada para esta verificación.
        </p>
        <ul>
          <li>
            AUTORIZO de forma expresa el tratamiento de mi fotografía como dato biométrico, con
            la finalidad de verificar mi identidad en los comercios aliados.
          </li>
          <li>NO AUTORIZO el tratamiento de mi fotografía como dato biométrico.</li>
        </ul>
      </section>

    </PaginaLegal>
  )
}
