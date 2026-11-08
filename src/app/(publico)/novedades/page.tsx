import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgePercent, Store } from 'lucide-react'
import { obtenerAnunciosPublicos, obtenerWhatsappSoporteEstricto } from '@/lib/publico/datos-publicos'
import { ListaNovedades } from '@/components/novedades/lista-novedades'
import { TituloSeccion } from '@/components/ui/titulo-seccion'
import { HREF_UNETE } from '../_components/anclas'
import estilos from '@/components/novedades/pagina-novedades.module.css'

export const metadata: Metadata = {
  alternates: { canonical: '/novedades' },
  title: 'Novedades · ORUM',
  description: 'Beneficios nuevos y actualizaciones del club.',
}

/*
  EL HTML SE GUARDA 5 MINUTOS (08/11/2026; antes `force-dynamic`). Esta página
  no lee sesión: sale de la capa de datos cacheada (etiqueta `publico`), y las
  acciones del panel sueltan `updateTag('publico')`, que invalida también este
  HTML. `revalidate` es un literal a propósito: Next no lo lee de una constante.

  Un fallo de la base no puede quedar guardado: las novedades ya lanzan si la
  lectura falla, y el pie —que el layout pide con respaldo— se comprueba aquí
  en estricto (ver `obtenerWhatsappSoporteEstricto`).
*/
export const revalidate = 300

/*
  NOVEDADES  ·  rediseño del 21/10/2026 («se ve muy vacío»)
  ---------------------------------------------------------------------------
  Cabecera con el titular de la casa, la lista (`ListaNovedades`: la más
  reciente en grande y las anteriores en rejilla) y, al final, dos accesos
  para seguir: los comercios y las membresías. Todo a lo ancho de la
  fachada, no en una columna de 640px.
*/
export default async function NovedadesPublicas() {
  // El número no se pinta aquí: se pide solo para que un fallo no se guarde (ver arriba).
  const [anuncios] = await Promise.all([obtenerAnunciosPublicos(), obtenerWhatsappSoporteEstricto()])

  return (
    <div className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <p className={estilos.antetitulo}>El club, al día</p>
        <TituloSeccion como="h1" tamano="pagina" texto="Novedades de ORUM" />
        <p className={estilos.bajada}>
          Beneficios nuevos, aliados que llegan y lo que pasa en el club.
        </p>
      </header>

      <ListaNovedades anuncios={anuncios} />

      <nav className={estilos.seguir} aria-label="Seguir explorando">
        <Link href="/explorar" className={estilos.acceso}>
          <span className={estilos.accesoIcono} aria-hidden="true">
            <Store size={20} />
          </span>
          <span className={estilos.accesoTextos}>
            <span className={estilos.accesoTitulo}>Explora los comercios aliados</span>
            <span className={estilos.accesoAyuda}>Dónde usar tus beneficios.</span>
          </span>
          <ArrowRight className={estilos.accesoFlecha} size={18} aria-hidden="true" />
        </Link>
        <Link href={HREF_UNETE} className={estilos.acceso}>
          <span className={estilos.accesoIcono} aria-hidden="true">
            <BadgePercent size={20} />
          </span>
          <span className={estilos.accesoTextos}>
            <span className={estilos.accesoTitulo}>Conoce las membresías</span>
            <span className={estilos.accesoAyuda}>Únete y empieza a ahorrar.</span>
          </span>
          <ArrowRight className={estilos.accesoFlecha} size={18} aria-hidden="true" />
        </Link>
      </nav>
    </div>
  )
}
