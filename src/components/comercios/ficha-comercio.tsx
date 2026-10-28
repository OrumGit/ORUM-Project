import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft, ExternalLink, MapPin, Phone } from 'lucide-react'
import { ComercioLogo } from '@/components/ui/comercio-logo'
import { Ampliable, VisorImagenes, type ImagenVisor } from '@/components/ui/visor-imagenes'
import { enlaceMapa } from '@/lib/comercios/enlace-mapa'
import type { HorarioSucursal } from '@/lib/comercios/horario'
import { telefonoLegible, telefonoParaMarcar } from '@/lib/shared/telefono'
import { HorarioSede } from './horario-sede'
import estilos from './ficha-comercio.module.css'

/*
  LA FICHA DE UN COMERCIO  ·  una sola, para el público y para el socio
  ---------------------------------------------------------------------------
  Nació como la ficha pública del rediseño aprobado (`/explorar/[id]`). El
  30/09/2026 el propietario pidió que la del Portal de Miembros fuera IGUAL,
  así que la estructura vive aquí y cada portal pone solo lo que le es propio:

    · `beneficio` — el público lo enseña desenfocado con «inicia sesión»; el
                    socio, legible.
    · `accion`    — «Preguntar por WhatsApp» / «Mostrar mi carnet».
    · `resenas`   — solo el socio: promedio, lista y su propia reseña.

  Portada, logo y fotos se AMPLÍAN al tocarlos (`VisorImagenes`): «cuando le
  dé clic al logo o a alguna foto, se agrande para que la pueda ver mejor».

  Server Component. Lo único de cliente es el visor, y las imágenes le llegan
  ya renderizadas como `children`.
*/

export type SedeFicha = {
  id: number
  nombre: string | null
  direccion: string | null
  ciudadNombre: string | null
  telefono?: string | null
  /** El horario de la sede; vacío o ausente = no se dice nada. */
  horario?: HorarioSucursal
}

export type FotoFicha = { url: string; alt: string }

type Props = {
  nombre: string
  /** «Categoría · Ciudades», o nada. */
  detalle?: string | null
  logoUrl: string | null
  portadaUrl: string | null
  sedes: SedeFicha[]
  descripcion: string | null
  fotos: FotoFicha[]
  /** El contenido del bloque hundido del beneficio. */
  beneficio: ReactNode
  /** La acción principal, al pie. */
  accion?: ReactNode
  /** Las reseñas, tras la información principal. Solo la monta el Portal de Miembros. */
  resenas?: ReactNode
  /** Enlace de vuelta a pantalla completa (dentro del overlay no se pinta). */
  volver?: { href: string; texto: string }
  enOverlay?: boolean
  /** Nombres de transición de elemento compartido (solo a pantalla completa). */
  transicion?: { placa?: string; titulos?: string }
}

/** Cuántas fotos entran en la rejilla; el visor enseña todas. */
const TOPE_GALERIA = 6

export function FichaComercio({
  nombre,
  detalle,
  logoUrl,
  portadaUrl,
  sedes,
  descripcion,
  fotos,
  beneficio,
  accion,
  resenas,
  volver,
  enOverlay = false,
  transicion,
}: Props) {
  /* Una sede sin dirección pero con horario también se enseña. */
  const sedesVisibles = sedes.filter((s) => s.direccion || (s.horario && s.horario.length > 0))

  /* La lista del visor, en el orden de la ficha: portada, logo, galería. */
  const imagenes: ImagenVisor[] = []
  const indicePortada = portadaUrl ? imagenes.push({ url: portadaUrl, alt: `Foto de ${nombre}` }) - 1 : -1
  const indiceLogo = logoUrl
    ? imagenes.push({ url: logoUrl, alt: `Logotipo de ${nombre}`, tipo: 'logo' }) - 1
    : -1
  const inicioGaleria = imagenes.length
  for (const f of fotos) imagenes.push({ url: f.url, alt: f.alt || `Foto de ${nombre}` })

  const enRejilla = fotos.slice(0, TOPE_GALERIA)
  const restantes = fotos.length - enRejilla.length

  return (
    <VisorImagenes imagenes={imagenes}>
      <article className={[estilos.ficha, enOverlay && estilos.enOverlay].filter(Boolean).join(' ')}>
        {!enOverlay && volver && (
          <Link href={volver.href} className={estilos.volver}>
            <ChevronLeft size={16} aria-hidden="true" />
            {volver.texto}
          </Link>
        )}

        <div className={estilos.portada}>
          {portadaUrl ? (
            <Ampliable
              indice={indicePortada}
              etiqueta="Ampliar la foto de portada"
              className={estilos.portadaBoton}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria, no un asset local */}
              <img src={portadaUrl} alt="" className={estilos.portadaFoto} fetchPriority="high" />
            </Ampliable>
          ) : (
            <span className={estilos.portadaVacia} aria-hidden="true" />
          )}
          <span className={estilos.logo}>
            {logoUrl ? (
              <Ampliable indice={indiceLogo} etiqueta="Ampliar el logotipo">
                <ComercioLogo logoUrl={logoUrl} nombre={nombre} nombreTransicion={transicion?.placa} />
              </Ampliable>
            ) : (
              <ComercioLogo logoUrl={null} nombre={nombre} nombreTransicion={transicion?.placa} />
            )}
          </span>
        </div>

        <div className={estilos.cuerpo}>
          <header
            style={transicion?.titulos ? { viewTransitionName: transicion.titulos } : undefined}
          >
            {/* Único `h1` de la pantalla. */}
            <h1 className={estilos.nombre}>{nombre}</h1>
            {detalle && <p className={estilos.detalle}>{detalle}</p>}
          </header>

          {sedesVisibles.length > 0 && (
            <ul className={estilos.sedes} aria-label="Direcciones y horarios">
              {sedesVisibles.map((s) => (
                /* Cada dato en SU fila, con su icono dorado a la izquierda:
                   dirección, teléfono y horario (28/10/2026). Antes el
                   teléfono iba pegado a la dirección, en oro y negrita, y el
                   cliente lo quería como la dirección: texto en tinta. */
                <li key={s.id} className={estilos.sede}>
                  {/* El nombre de la sede solo si hay varias: con una sola,
                      «Sede principal» no le dice nada a nadie. */}
                  {sedesVisibles.length > 1 && s.nombre && <p className={estilos.sedeTitulo}>{s.nombre}</p>}

                  <p className={estilos.sedeFila}>
                    <MapPin size={15} aria-hidden="true" className={estilos.sedeIcono} />
                    {s.direccion ? (
                      /* La dirección abre Google Maps (en el teléfono, la
                         app). Pestaña nueva: la ficha se queda donde estaba. */
                      <a
                        href={enlaceMapa(s.direccion, s.ciudadNombre)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={estilos.sedeEnlace}
                      >
                        {s.direccion}
                        {s.ciudadNombre && `, ${s.ciudadNombre}`}
                        <ExternalLink size={12} aria-hidden="true" className={estilos.sedeMapaIcono} />
                        <span className="sr-only"> (abre Google Maps)</span>
                      </a>
                    ) : (
                      <span>{s.nombre ?? s.ciudadNombre ?? 'Sede'}</span>
                    )}
                  </p>

                  {s.telefono && (
                    <p className={estilos.sedeFila}>
                      <Phone size={15} aria-hidden="true" className={estilos.sedeIcono} />
                      <a href={`tel:${telefonoParaMarcar(s.telefono)}`} className={estilos.sedeEnlace}>
                        <span className="sr-only">Llamar al </span>
                        {telefonoLegible(s.telefono)}
                      </a>
                    </p>
                  )}

                  {s.horario && s.horario.length > 0 && <HorarioSede horario={s.horario} />}
                </li>
              ))}
            </ul>
          )}

          {descripcion && <p className={estilos.descripcion}>{descripcion}</p>}

          {enRejilla.length > 0 && (
            <ul className={estilos.galeria} aria-label="Fotos del comercio">
              {enRejilla.map((foto, i) => (
                <li key={foto.url} className={estilos.galeriaCelda}>
                  <Ampliable
                    indice={inicioGaleria + i}
                    etiqueta={`Ampliar foto ${i + 1} de ${fotos.length}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria, no un asset local */}
                    <img src={foto.url} alt={foto.alt} className={estilos.galeriaFoto} loading="lazy" />
                  </Ampliable>
                  {i === enRejilla.length - 1 && restantes > 0 && (
                    <span className={estilos.galeriaMas} aria-hidden="true">
                      +{restantes}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className={estilos.beneficio}>{beneficio}</div>

          {accion}

          {resenas}
        </div>
      </article>
    </VisorImagenes>
  )
}
