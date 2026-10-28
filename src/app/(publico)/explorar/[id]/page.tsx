import { notFound } from 'next/navigation'
import { Lock } from 'lucide-react'
import { FichaComercio } from '@/components/comercios/ficha-comercio'
import estilos from '@/components/comercios/ficha-comercio.module.css'
import { Button } from '@/components/ui/button'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { obtenerFichaPublica, obtenerWhatsappSoporte } from '@/lib/publico/datos-publicos'
import { detalleComercio } from '@/lib/publico/directorio'
import { URL_SITIO } from '@/lib/publico/sitio'
import { MENSAJE_WHATSAPP_PUBLICO } from '@/lib/publico/whatsapp'
import { AdornoEstrella } from '@/components/ui/marca/marca'

/*
  LA FICHA PÚBLICA DE UN COMERCIO — el MISMO componente en dos superficies
  ---------------------------------------------------------------------------
  Desde el directorio o desde «Comercios destacados» se abre ENCIMA, en la
  ranura `@modal` del layout público (`enOverlay`). Por enlace directo —un
  WhatsApp, un buscador, recargar— se pinta a pantalla completa. Es el mismo
  patrón que la ficha del portal de miembros, y por la misma razón: dos
  copias se desincronizan a la primera corrección.

  Es la ficha de QUIEN NO ES SOCIO: foto, dirección, descripción, galería y
  el beneficio desenfocado con la invitación a iniciar sesión. Nada que exija
  sesión ni nada que identifique a una persona (ver `datos-publicos.ts`).

  Server Component. El único cliente es el envoltorio del overlay, que vive
  en la ranura y no aquí.
*/

/** Id numérico de la URL, o `null`. Entrada no confiable: llega de la ruta. */
function idOnulo(valor: string): number | null {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numero = idOnulo(id)
  const ficha = numero ? await obtenerFichaPublica(numero) : null
  /* El mismo título para los tres casos fatales: no se filtra por la pestaña
     lo que la página calla. */
  if (!ficha) {
    return { title: 'Comercio no disponible · ORUM', robots: { index: false, follow: false } }
  }
  const titulo = `${ficha.nombre} · Comercio aliado de ORUM`
  const descripcion = ficha.descripcion ?? undefined
  const imagen = ficha.portadaUrl ?? ficha.logoUrl ?? undefined
  return {
    title: titulo,
    description: descripcion,
    /* Un comercio excluido sigue visible en el sitio: solo se le pide a los
       buscadores que no lo guarden. */
    robots: ficha.indexable ? { index: true, follow: true } : { index: false, follow: false },
    alternates: { canonical: `/explorar/${ficha.id}` },
    openGraph: {
      title: titulo,
      description: descripcion,
      url: `/explorar/${ficha.id}`,
      ...(imagen ? { images: [{ url: imagen }] } : {}),
    },
    twitter: { title: titulo, description: descripcion, ...(imagen ? { images: [imagen] } : {}) },
  }
}

/** JSON-LD del comercio. `<` se escapa para que ningún texto cierre el `<script>`. */
function datosEstructurados(ficha: NonNullable<Awaited<ReturnType<typeof obtenerFichaPublica>>>) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: ficha.nombre,
    url: `${URL_SITIO}/explorar/${ficha.id}`,
    ...(ficha.descripcion ? { description: ficha.descripcion } : {}),
    ...((ficha.portadaUrl ?? ficha.logoUrl) ? { image: ficha.portadaUrl ?? ficha.logoUrl } : {}),
    ...(ficha.sedes.some((s) => s.direccion)
      ? {
          address: ficha.sedes
            .filter((s) => s.direccion)
            .map((s) => ({
              '@type': 'PostalAddress',
              streetAddress: s.direccion,
              ...(s.ciudadNombre ? { addressLocality: s.ciudadNombre } : {}),
              addressCountry: 'CO',
            })),
        }
      : {}),
  }
  return JSON.stringify(json).replace(/</g, '\\u003c')
}

export const dynamic = 'force-dynamic'

export default async function FichaPublicaPage({
  params,
  enOverlay = false,
}: {
  params: Promise<{ id: string }>
  enOverlay?: boolean
}) {
  const { id } = await params
  const numero = idOnulo(id)
  if (numero === null) notFound()

  const [ficha, soporte] = await Promise.all([
    obtenerFichaPublica(numero),
    obtenerWhatsappSoporte(),
  ])
  if (!ficha) notFound()

  const detalle = detalleComercio(ficha.categorias, ficha.ciudades)

  return (
    <>
      {ficha.indexable && !enOverlay && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: datosEstructurados(ficha) }}
        />
      )}
      <FichaComercio
        nombre={ficha.nombre}
        detalle={detalle}
        logoUrl={ficha.logoUrl}
        portadaUrl={ficha.portadaUrl}
        sedes={ficha.sedes}
        descripcion={ficha.descripcion}
        fotos={ficha.fotos}
        volver={{ href: '/explorar', texto: 'Ver todos los comercios' }}
        enOverlay={enOverlay}
        beneficio={
          /*
            EL BENEFICIO, DESENFOCADO. Se ve que existe y no se lee sin ser
            socio: encargo del cliente. El lector de pantalla recibe la misma
            información que el vidente —«exclusivo para socios»—, no el texto
            que el vidente tampoco puede leer.
          */
          <>
            <div className={estilos.beneficioTextos}>
              <p className={estilos.beneficioEtiqueta}>
                <AdornoEstrella />
                Tu beneficio ORUM
              </p>
              {ficha.beneficios.length > 0 ? (
                <>
                  <p className={`${estilos.beneficioValor} ${estilos.desenfocado}`} aria-hidden="true">
                    {ficha.beneficios.join(' · ')}
                  </p>
                  <p className="sr-only">Beneficio exclusivo para socios.</p>
                </>
              ) : (
                <p className={estilos.beneficioPronto}>Pronto con beneficio para socios.</p>
              )}
            </div>
            <Button href="/miembros/login" variant="ghost" size="sm" icon={<Lock size={14} />}>
              Inicia sesión para verlo
            </Button>
          </>
        }
        accion={
          soporte && (
            <WhatsAppButton
              telefono={soporte}
              mensaje={MENSAJE_WHATSAPP_PUBLICO}
              variant="brand"
              size="lg"
              pildora
              fullWidth
              className={estilos.botonOro}
            >
              Preguntar por WhatsApp
            </WhatsAppButton>
          )
        }
      />
    </>
  )
}
