import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { EnlaceInstalar } from '@/components/pwa/instalar-movil'
import { EstrellaOrum, LogoOrum } from '@/components/ui/marca/marca'
import { REVELAR, revelarEscalonado } from '@/lib/shared/revelado'
import estilos from './pie-sitio.module.css'

/*
  EL PIE  ·  el sitio del producto donde conviven las puertas
  ---------------------------------------------------------------------------
  Lo usan el Portal Público y, desde el 27/09/2026, el Portal de Miembros
  (encargo del propietario: «un footer como los otros»). Vive en
  `src/components/pie/` y no en `(publico)/_components/` porque lo comparten
  dos portales: una pieza compartida guardada dentro de una ruta se rompe en
  la primera reorganización. El shell de administración y la herramienta de
  comercios siguen terminando en su barra de navegación.

  SON ENLACES DE TEXTO, NO BOTONES. Tres salidas de igual peso para tres
  audiencias distintas que ya saben lo que buscan: competir por atención con
  `Button` sería tratarlas como conversión, y son navegación.

  El pie NO imita a `PantallaAuth` ni la reemplaza — las tres pantallas de
  acceso siguen siendo su propio umbral oscuro con halo dorado. El único
  acoplamiento real es el nombre del destino, que se repite literal («Portal de
  Miembros», «Herramienta de comercios», «Administración») para que el visitante
  reconozca a dónde va antes de hacer clic.
*/

const PUERTAS = [
  { href: '/miembros/login', texto: 'Soy socio', destino: 'Portal de Miembros' },
  {
    href: '/comercios/login',
    texto: 'Tengo un comercio',
    destino: 'Herramienta de comercios',
  },
  /*
    «Administro ORUM» se RETIRÓ (29/09/2026, encargo del propietario): el pie
    es público y la puerta del panel de administración no debe anunciarse a
    cualquiera que visite la web. Desde el 11/11/2026 la puerta vive además
    en una dirección secreta (`lib/auth/ruta-panel.ts`) y `/login` da 404.
  */
] as const

const MENSAJE_SOPORTE = 'Hola, quiero saber más sobre el club de beneficios ORUM.'

/** Deja solo dígitos: wa.me rechaza espacios, guiones y paréntesis. */
function limpiarTelefono(telefono: string): string {
  return telefono.replace(/\D/g, '')
}

export function PieSitio({
  soporte,
  mensajeSoporte = MENSAJE_SOPORTE,
  className,
  compacto = false,
  instalar = false,
}: {
  soporte: string | null
  /** Lo que llega escrito en WhatsApp. Cada portal pregunta lo suyo. */
  mensajeSoporte?: string
  /** Solo para que el portal que lo monta reserve el hueco de su propio cromo. */
  className?: string
  /**
   * Solo logotipo y derechos, en una fila (maqueta del carnet, 29/09/2026).
   * Lo usan las pantallas interiores del Portal de Miembros: las puertas
   * y el soporte ya están en el pie del Inicio y en el menú de la cuenta.
   */
  compacto?: boolean
  /**
   * Enseña el icono de «instalar la app» junto al soporte. Solo lo pide el
   * Portal de Miembros (03/10/2026, encargo del propietario: «únicamente en
   * miembros por el momento»); la fachada pública no lo ofrece.
   */
  instalar?: boolean
}) {
  if (compacto) {
    return (
      <footer className={[estilos.pie, estilos.pieCompacto, className].filter(Boolean).join(' ')}>
        <div className={estilos.filaCompacta}>
          <LogoOrum variante="plata" className={estilos.logoCompacto} />
          <p className={estilos.derechos}>
            © {new Date().getFullYear()} ORUM · Apoya lo local, te da más.
          </p>
        </div>
      </footer>
    )
  }

  return (
    <footer className={[estilos.pie, className].filter(Boolean).join(' ')}>
      <div className={estilos.contenido}>
        <p className={[estilos.marca, REVELAR].join(' ')}>
          <LogoOrum variante="plata" className={estilos.logo} />
        </p>

        <nav className={estilos.puertas} aria-label="Accesos a los portales">
          {PUERTAS.map((puerta, i) => (
            <Link
              key={puerta.href}
              href={puerta.href}
              className={[estilos.puerta, revelarEscalonado(i)].join(' ')}
            >
              <span className={estilos.puertaTexto}>{puerta.texto}</span>
              <span className={estilos.puertaDestino}>{puerta.destino}</span>
            </Link>
          ))}
        </nav>

        {/*
          Sin número configurado no se pinta un enlace roto ni un botón muerto:
          la fila desaparece y el resto del pie sigue en pie (SPEC §5.2). No se
          usa `WhatsAppButton` aquí a propósito — ese componente es un `Button`,
          y en este pie todo es enlace de texto por la razón de arriba.
        */}
        <div className={estilos.ayuda}>
          {soporte && (
            <a
              className={estilos.soporte}
              href={`https://wa.me/${limpiarTelefono(soporte)}?text=${encodeURIComponent(mensajeSoporte)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Soporte por WhatsApp
            </a>
          )}
          {/* Instalar la app: solo el icono, al lado del soporte. Solo se
              pinta donde instalar es posible y la app no corre ya instalada. */}
          {instalar && <EnlaceInstalar className={estilos.instalar} />}
        </div>
      </div>

      <div className={estilos.base}>
        <p className={estilos.derechos}>
          © {new Date().getFullYear()} ORUM
          <EstrellaOrum tono="plata" className={estilos.estrellaDerechos} />
          Apoya lo local, te da más.
        </p>

        <nav className={estilos.legal} aria-label="Legal">
          <Link href="/terminos" className={estilos.enlaceLegal}>
            Términos y condiciones
          </Link>
          <Link href="/privacidad" className={estilos.enlaceLegal}>
            Política de privacidad
          </Link>
          <Link href="/derechos-de-autor" className={estilos.enlaceLegal}>
            Derechos de autor
          </Link>
        </nav>
      </div>
    </footer>
  )
}
