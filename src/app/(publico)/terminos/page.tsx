import type { Metadata } from 'next'
import Link from 'next/link'
import { PaginaLegal } from '../_components/pagina-legal'

export const metadata: Metadata = {
  alternates: { canonical: '/terminos' },
  title: 'Términos y condiciones · ORUM',
  description: 'Las condiciones que rigen el uso del club de beneficios ORUM.',
}

/*
  BORRADOR — pendiente de revisión legal (este documento no está entre los
  revisados por el abogado: Aviso de privacidad, Autorización, Reembolsos y
  PQRSF).

  Datos de la responsable: persona natural, sin NIT ni domicilio publicados.
  Falta confirmar la ciudad de domicilio y el juez competente (§13).

  Sección 9 «Contenido que subes» (30/09/2026): borrador, pendiente de la
  revisión del abogado del propietario.
*/
export default function TerminosPage() {
  return (
    <PaginaLegal titulo="Términos y condiciones" actualizado="14 de noviembre de 2026">
      <section>
        <h2>1. Quiénes somos</h2>
        <p>
          ORUM es un club de beneficios operado por{' '}
          <strong>Jessica Viviana García Fernández</strong>, persona natural que opera la
          plataforma. Estos Términos y condiciones rigen el
          uso de la plataforma ORUM (el «Sitio»), disponible para visitantes,
          socios con membresía vigente y comercios aliados.
        </p>
      </section>

      <section>
        <h2>2. Aceptación de los términos</h2>
        <p>
          Al registrarte como socio, al aplicar como comercio aliado o al usar
          cualquier parte del Sitio, aceptas estos términos en su totalidad. Si no
          estás de acuerdo con alguno de ellos, no debes usar el Sitio ni sus
          servicios.
        </p>
      </section>

      <section>
        <h2>3. Qué es el servicio</h2>
        <p>
          ORUM administra planes de membresía que dan acceso a beneficios y
          descuentos en una red de comercios aliados. Cada plan tiene un precio y
          una duración propios, publicados en el momento de la afiliación. La
          vigencia de la membresía determina el acceso a los beneficios: una
          membresía vencida deja de dar derecho a redimirlos, aunque la cuenta
          siga existiendo.
        </p>
      </section>

      <section>
        <h2>4. Registro y cuenta</h2>
        <p>
          El alta de un socio la realiza el equipo de ORUM o un comercio
          autorizado, con los datos que el socio suministra. El socio es
          responsable de mantener la confidencialidad de sus credenciales de
          acceso y de notificar cualquier uso no autorizado de su cuenta.
        </p>
      </section>

      <section>
        <h2>5. Pagos y renovación</h2>
        <p>
          El valor y la duración del plan se informan antes de confirmar la
          afiliación. La renovación de la membresía no es automática salvo que se
          indique expresamente en el momento de la contratación. ORUM puede
          ajustar el precio de los planes hacia adelante, sin afectar el periodo ya
          pagado.
        </p>
      </section>

      <section>
        <h2>6. Comercios aliados</h2>
        <p>
          Los beneficios y descuentos los ofrece cada comercio aliado bajo sus
          propias condiciones (vigencia, cupos, restricciones), que ORUM publica
          de buena fe pero no controla directamente. ORUM actúa como
          intermediario entre el socio y el comercio: la calidad, disponibilidad y
          conformidad del producto o servicio ofrecido por el comercio es
          responsabilidad exclusiva de ese comercio, no de ORUM.
        </p>
      </section>

      <section>
        <h2>7. Uso aceptable</h2>
        <ul>
          <li>No compartir las credenciales de acceso ni el carnet digital con terceros.</li>
          <li>No intentar vulnerar la seguridad de la plataforma ni acceder a datos de otros socios o comercios.</li>
          <li>No usar la información de contacto de los comercios aliados con fines distintos a los previstos por el club.</li>
        </ul>
        <p>
          El incumplimiento de estas condiciones puede dar lugar a la suspensión o
          cancelación de la membresía, sin perjuicio de otras acciones legales que
          correspondan.
        </p>
      </section>

      <section>
        <h2>8. Propiedad intelectual</h2>
        <p>
          La marca ORUM, su logotipo y los contenidos propios del Sitio están
          protegidos por las normas de propiedad intelectual vigentes en
          Colombia. Su reproducción o uso no autorizado está prohibida.
        </p>
      </section>

      <section>
        <h2>9. Contenido que subes</h2>
        <p>
          Al subir una foto a tu perfil declaras que eres quien aparece en ella y que tienes
          derecho a usarla, y nos autorizas a mostrarla en tu carnet. ORUM puede retirar un
          contenido ante un reclamo de derechos de autor o si incumple estos Términos, y puede
          suspender las cuentas con infracciones repetidas. Para reportar un contenido, consulta
          la página de{' '}
          <Link href="/derechos-de-autor">reclamos por derechos de autor</Link>.
        </p>
      </section>

      <section>
        <h2>10. Limitación de responsabilidad</h2>
        <p>
          ORUM no garantiza que el Sitio funcione de forma ininterrumpida ni libre
          de errores. En la medida permitida por la ley, ORUM no responde por
          perjuicios indirectos derivados del uso del Sitio o de la relación entre
          el socio y un comercio aliado.
        </p>
      </section>

      <section>
        <h2>11. Terminación</h2>
        <p>
          ORUM puede suspender o cancelar una cuenta que incumpla estos términos.
          El socio puede solicitar la cancelación de su membresía en cualquier
          momento; la cancelación no da lugar al reembolso del periodo ya
          transcurrido, salvo que la ley disponga otra cosa. Las condiciones de
          cancelación, retracto, reembolso y reversión de pagos están en la{' '}
          <Link href="/reembolsos">política de reembolsos y cancelaciones</Link>.
        </p>
      </section>

      <section>
        <h2>12. Modificaciones</h2>
        <p>
          ORUM puede actualizar estos términos para reflejar cambios en el
          servicio o en la normativa aplicable. La fecha de «Última actualización»
          en la parte superior de esta página indica la versión vigente.
        </p>
      </section>

      <section>
        <h2>13. Ley aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de la República de Colombia.
          Cualquier controversia se someterá a los jueces competentes de Colombia.
        </p>
      </section>

      <section>
        <h2>14. Contacto</h2>
        <p>
          Para preguntas sobre estos términos escríbenos a{' '}
          <strong>orumplataforma@gmail.com</strong> o por el WhatsApp de soporte que
          aparece en el pie de cualquier página del Sitio. Las peticiones, quejas y
          reclamos se tramitan según la{' '}
          <Link href="/pqrs">política de PQRSF</Link>.
        </p>
      </section>
    </PaginaLegal>
  )
}
