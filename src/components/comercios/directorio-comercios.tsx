import type { ReactNode } from 'react'
import type { CatalogoPublico } from '@/lib/publico/datos-publicos'
import { DirectorioInteractivo } from './directorio-interactivo'
import { ProveedorFavoritos } from './favoritos'

/*
  EL DIRECTORIO DE COMERCIOS  ·  el de `/explorar`, compartido (29/09/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: el Inicio del Portal de Miembros tiene que ser
  IGUAL que `/explorar`. Para que lo sea por construcción y no por copia, el
  directorio vive aquí y lo montan las dos páginas:

    · `/explorar` (Portal Público): beneficios legibles desde el 27/11/2026
      (desenfocados si el interruptor de `lib/publico/beneficios-publicos.ts`
      vuelve a 'oculto'), la ficha se abre encima (ruta interceptada).
    · `/miembros` (`socio`): beneficios legibles, la ficha del socio, el
      corazón de favoritos y el filtro «Favoritos».

  DESDE EL 03/10/2026 SE FILTRA EN EL NAVEGADOR (`DirectorioInteractivo`):
  cada filtro era un viaje al servidor, lento y que se pisaba con toques
  rápidos. Los filtros SIGUEN VIVIENDO EN LA URL (se comparten por WhatsApp,
  sobreviven a un refresco y el primer pintado ya sale filtrado); lo que
  cambió es que aplicarlos ya no navega. El porqué entero está en
  `directorio-interactivo.tsx`.

  Este archivo es solo la costura de servidor: pone el estado de favoritos
  cuando hay socio.
*/

type Props = {
  /** Ruta donde vive: `/explorar` o `/miembros`. La usan la búsqueda y los filtros. */
  base: string
  directorio: CatalogoPublico
  /** El titular del banner. «Comercios» en la fachada. */
  titulo?: string
  /** La frase bajo el titular. */
  bajada: string
  /** Portal de Miembros: beneficio legible y ficha del socio. */
  socio?: boolean
  /**
   * Los favoritos del socio (ids de comercio), leídos en el servidor. Con
   * ellos aparecen el corazón de cada tarjeta y el filtro «Favoritos». Sin
   * ellos (la fachada pública), ni lo uno ni lo otro.
   */
  favoritos?: number[]
  /** Entre el banner y los filtros (el aviso de la última novedad del socio). */
  aviso?: ReactNode
}

export function DirectorioComercios({
  base,
  directorio,
  titulo = 'Comercios',
  bajada,
  socio = false,
  favoritos,
  aviso,
}: Props) {
  /*
    SIN `<Suspense>` alrededor, a propósito. `useSearchParams` solo exige esa
    frontera en páginas que se prerenderizan, y las dos que montan esto son
    dinámicas (`/explorar` es `force-dynamic`, `/miembros` lee la sesión).
    Con la frontera, React hidrataba el directorio con MENOR prioridad que el
    resto de la página: durante ese rato un toque en una tarjeta navegaba a
    la página completa de la ficha en vez de abrirla encima.
  */
  const interactivo = (
    <DirectorioInteractivo
      base={base}
      directorio={directorio}
      titulo={titulo}
      bajada={bajada}
      socio={socio}
      aviso={aviso}
    />
  )

  /* El estado del corazón es UNO para toda la pantalla. */
  return favoritos !== undefined ? (
    <ProveedorFavoritos inicial={favoritos}>{interactivo}</ProveedorFavoritos>
  ) : (
    interactivo
  )
}
