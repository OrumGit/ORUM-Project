import type { Metadata } from 'next'
import { PaginaLegal } from '../_components/pagina-legal'

export const metadata: Metadata = {
  alternates: { canonical: '/reembolsos' },
  title: 'Reembolsos y cancelaciones · ORUM',
  description:
    'Cómo cancelar tu membresía ORUM, ejercer el derecho de retracto y solicitar reembolsos o reversión de pagos.',
}

/*
  Texto de la Política de Reembolsos, Derecho de Retracto, Reversión de Pagos y
  Cancelación de Membresías, revisado por el abogado (versión 1.0, vigente desde
  el 14/11/2026). Se conserva su estructura y numeración. Solo cambia la forma de
  citar a la persona responsable (sin pronombres) y se omite su cédula.
*/
export default function ReembolsosPage() {
  return (
    <PaginaLegal
      titulo="Política de reembolsos y cancelaciones"
      actualizado="14 de noviembre de 2026"
    >
      <section>
        <h2>1. Objeto</h2>
        <p>
          La presente Política de Reembolsos, Derecho de Retracto, Reversión de Pagos y
          Cancelación de Membresías regula las condiciones aplicables a las membresías
          ofrecidas mediante la plataforma ORUM.
        </p>
        <p>La presente política se fundamenta en:</p>
        <ul>
          <li>Constitución Política de Colombia.</li>
          <li>Ley 1480 de 2011 (Estatuto del Consumidor).</li>
          <li>Decreto 587 de 2016.</li>
          <li>Ley 527 de 1999.</li>
          <li>
            Demás normas colombianas vigentes aplicables al comercio electrónico y la protección
            del consumidor.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Responsable</h2>
        <p>
          La atención de solicitudes relacionadas con cancelaciones, retractos, reembolsos y
          reversión de pagos está a cargo de <strong>Jessica Viviana García Fernández</strong>,
          persona natural que opera la plataforma ORUM.
        </p>
        <p>
          Correo electrónico: <strong>soporte@cluborum.com</strong>
        </p>
      </section>

      <section>
        <h2>3. Ámbito de aplicación</h2>
        <p>
          La presente política aplica a toda adquisición de membresías realizada a través de
          los canales electrónicos habilitados por ORUM.
        </p>
        <p>
          La aceptación de esta política forma parte integral de los Términos y Condiciones y
          del Reglamento de Membresía de ORUM.
        </p>
      </section>

      <section>
        <h2>4. Cancelación de membresías</h2>
        <h3>4.1 Cancelación voluntaria</h3>
        <p>
          El usuario podrá solicitar la cancelación de su membresía en cualquier momento
          mediante solicitud enviada a <strong>soporte@cluborum.com</strong>.
        </p>
        <p>
          La cancelación producirá efectos sobre períodos posteriores o futuras renovaciones,
          cuando estas existan.
        </p>
        <p>La cancelación no genera automáticamente derecho a devolución de dinero.</p>

        <h3>4.2 Finalización por vencimiento</h3>
        <p>Las membresías finalizarán automáticamente al concluir el período contratado.</p>
        <p>Actualmente:</p>
        <ul>
          <li>La membresía mensual requiere un nuevo pago para continuar activa.</li>
          <li>La membresía anual finaliza al concluir el período contratado.</li>
        </ul>

        <h3>4.3 Cancelación por incumplimiento</h3>
        <p>ORUM podrá suspender o cancelar una membresía cuando exista evidencia razonable de:</p>
        <ul>
          <li>Fraude.</li>
          <li>Suplantación de identidad.</li>
          <li>Uso indebido de beneficios.</li>
          <li>Incumplimiento grave de los términos y condiciones.</li>
          <li>Actividades contrarias a la ley.</li>
        </ul>
        <p>
          La aplicación de estas medidas no limita los derechos reconocidos por la legislación
          colombiana a los consumidores.
        </p>
      </section>

      <section>
        <h2>5. Derecho de retracto</h2>
        <h3>5.1 Procedencia</h3>
        <p>
          De conformidad con el artículo 47 de la Ley 1480 de 2011, el consumidor podrá ejercer
          el derecho de retracto respecto de compras realizadas mediante comercio electrónico o
          mecanismos de venta a distancia.
        </p>
        <p>
          La solicitud deberá presentarse dentro de los cinco (5) días hábiles siguientes a la
          fecha de compra.
        </p>

        <h3>5.2 Solicitud</h3>
        <p>
          La solicitud deberá remitirse al correo <strong>soporte@cluborum.com</strong>,
          indicando como mínimo:
        </p>
        <ul>
          <li>Nombre completo.</li>
          <li>Documento de identidad.</li>
          <li>Correo electrónico registrado.</li>
          <li>Fecha de adquisición.</li>
          <li>Descripción de la solicitud.</li>
        </ul>

        <h3>5.3 Inicio de ejecución del servicio digital</h3>
        <p>
          La membresía ORUM permite el acceso inmediato a beneficios, descuentos, promociones,
          convenios comerciales y demás funcionalidades asociadas al servicio contratado.
        </p>
        <p>
          La utilización efectiva de cualquiera de dichos beneficios o funcionalidades
          constituirá evidencia del inicio de ejecución del servicio para los efectos previstos
          en el artículo 47 de la Ley 1480 de 2011, sin perjuicio del análisis individual de
          cada solicitud.
        </p>

        <h3>5.4 Excepciones legales</h3>
        <p>
          El derecho de retracto no procederá en los eventos expresamente excluidos por el
          artículo 47 de la Ley 1480 de 2011 y las normas que lo modifiquen, complementen o
          sustituyan.
        </p>

        <h3>5.5 Devolución del dinero</h3>
        <p>
          Cuando el derecho de retracto resulte procedente, ORUM devolverá las sumas pagadas por
          el consumidor dentro de los treinta (30) días calendario siguientes al ejercicio válido
          del derecho, conforme al artículo 47 de la Ley 1480 de 2011.
        </p>
      </section>

      <section>
        <h2>6. Reembolsos</h2>
        <h3>6.1 Procedencia</h3>
        <p>El reembolso procederá únicamente cuando:</p>
        <ul>
          <li>Exista obligación legal de devolución.</li>
          <li>El retracto haya sido ejercido válidamente.</li>
          <li>Una autoridad competente así lo ordene.</li>
          <li>ORUM decida voluntariamente reconocerlo.</li>
        </ul>

        <h3>6.2 Casos que no generan reembolso automático</h3>
        <p>No generan automáticamente devolución:</p>
        <ul>
          <li>La cancelación voluntaria de la membresía.</li>
          <li>La falta de uso de la membresía.</li>
          <li>El vencimiento natural del período contratado.</li>
          <li>La decisión del usuario de no continuar utilizando la plataforma.</li>
        </ul>

        <h3>6.3 Alcance</h3>
        <p>
          La existencia de mecanismos legales como el retracto o la reversión de pagos no implica
          que toda cancelación genere un derecho automático de devolución.
        </p>
      </section>

      <section>
        <h2>7. Reversión de pagos</h2>
        <h3>7.1 Derecho de reversión</h3>
        <p>
          De conformidad con el artículo 51 de la Ley 1480 de 2011 y el Decreto 587 de 2016, el
          consumidor podrá solicitar la reversión de pagos efectuados mediante mecanismos de
          comercio electrónico cuando se configure alguna de las causales previstas por la ley.
        </p>

        <h3>7.2 Causales de reversión</h3>
        <p>La reversión podrá solicitarse cuando:</p>
        <ul>
          <li>El consumidor haya sido objeto de fraude.</li>
          <li>Corresponda a una operación no solicitada.</li>
          <li>El producto adquirido no haya sido recibido.</li>
          <li>El servicio adquirido no haya sido prestado.</li>
          <li>El producto entregado no corresponda a lo solicitado o a las características informadas.</li>
          <li>El producto entregado resulte defectuoso.</li>
        </ul>

        <h3>7.3 Procedimiento legal a cargo del consumidor</h3>
        <p>Cuando considere procedente la reversión del pago, el consumidor deberá:</p>
        <p>
          <strong>Paso 1.</strong> Presentar reclamación directa ante ORUM.
        </p>
        <p>
          <strong>Paso 2.</strong> Presentar simultáneamente la solicitud de reversión ante el
          emisor del instrumento de pago, entidad financiera, banco o participante del sistema de
          pagos correspondiente.
        </p>
        <p>
          <strong>Paso 3.</strong> Realizar dichas actuaciones dentro de los cinco (5) días hábiles
          siguientes:
        </p>
        <ul>
          <li>A la fecha en que tuvo noticia de la operación fraudulenta o no solicitada.</li>
          <li>A la fecha en que debió recibir el producto o servicio.</li>
          <li>A la fecha en que recibió un producto defectuoso.</li>
          <li>A la fecha en que recibió un producto que no correspondía a lo solicitado.</li>
        </ul>
        <p>
          <strong>Paso 4.</strong> Aportar la información y soportes razonablemente necesarios para
          verificar la solicitud.
        </p>
      </section>

      <section>
        <h2>8. Procedimiento interno de ORUM para solicitudes de reversión</h2>
        <p>Una vez recibida una solicitud de reversión, ORUM aplicará el siguiente procedimiento interno:</p>
        <h3>Etapa 1. Radicación</h3>
        <p>La solicitud será registrada internamente con fecha y hora de recepción.</p>
        <h3>Etapa 2. Verificación inicial</h3>
        <p>ORUM verificará:</p>
        <ul>
          <li>Identidad del solicitante.</li>
          <li>Existencia de la transacción.</li>
          <li>Fecha del pago.</li>
          <li>Estado de la membresía.</li>
          <li>Información suministrada por el consumidor.</li>
        </ul>
        <h3>Etapa 3. Revisión documental</h3>
        <p>
          ORUM podrá solicitar información adicional razonablemente necesaria para validar los
          hechos reportados.
        </p>
        <h3>Etapa 4. Análisis</h3>
        <p>Se verificará:</p>
        <ul>
          <li>La causal invocada.</li>
          <li>La existencia de pagos registrados.</li>
          <li>La activación de la membresía.</li>
          <li>El historial de acceso o utilización del servicio cuando resulte pertinente.</li>
        </ul>
        <h3>Etapa 5. Respuesta</h3>
        <p>
          ORUM emitirá respuesta al consumidor y colaborará con la entidad financiera, pasarela de
          pagos o participante del sistema de pago involucrado en la transacción cuando ello
          resulte legalmente procedente.
        </p>
        <h3>Etapa 6. Conservación de evidencia</h3>
        <p>
          Las solicitudes y soportes relacionados con procesos de reversión serán conservados
          durante los períodos exigidos por la legislación colombiana o el tiempo necesario para
          la defensa de los derechos e intereses de las partes.
        </p>
      </section>

      <section>
        <h2>9. Pasarelas de pago</h2>
        <p>
          ORUM podrá habilitar una o varias pasarelas de pago. Sin embargo, se utilizará,
          principalmente, <strong>Mercado Pago</strong>.
        </p>
        <p>
          Las transacciones realizadas a través de dichas plataformas también estarán sujetas a
          los términos, condiciones y políticas del respectivo proveedor.
        </p>
      </section>

      <section>
        <h2>10. Contacto para cancelaciones, retractos, reembolsos y reversión de pagos</h2>
        <p>
          Correo electrónico: <strong>soporte@cluborum.com</strong>
        </p>
        <p>
          Responsable de atención: <strong>Jessica Viviana García Fernández</strong>, persona
          natural que opera la plataforma ORUM.
        </p>
      </section>

      <section>
        <h2>11. Contratación electrónica</h2>
        <p>
          La aceptación de esta política mediante mecanismos electrónicos, casillas de
          verificación, autenticación digital o cualquier otro medio tecnológico implementado por
          ORUM constituirá manifestación válida de voluntad de conformidad con la Ley 527 de 1999.
        </p>
      </section>

      <section>
        <h2>12. Protección del consumidor</h2>
        <p>
          Ninguna disposición de esta política podrá interpretarse como limitación, renuncia o
          exclusión de los derechos reconocidos a los consumidores por la Constitución Política de
          Colombia, la Ley 1480 de 2011 y demás normas aplicables.
        </p>
      </section>

      <section>
        <h2>13. Vigencia</h2>
        <p>
          La presente política entrará en vigor a partir del <strong>14 de noviembre de 2026</strong> y
          permanecerá vigente hasta su modificación o sustitución.
        </p>
      </section>
    </PaginaLegal>
  )
}
