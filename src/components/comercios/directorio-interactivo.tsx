'use client'

import { useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowUpDown, ChevronDown, Heart, LayoutGrid, MapPin, Search, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, MenuItem } from '@/components/ui/menu'
import { EmptyState } from '@/components/ui/feedback'
import fotoMarca from '@/components/ui/marca/foto-hero.webp'
import type { CatalogoPublico } from '@/lib/publico/datos-publicos'
import {
  alternarCategoria,
  BENEFICIOS_FILTRO,
  ETIQUETAS_ORDEN,
  filtrarDirectorio,
  hayFiltros,
  hrefDirectorio,
  leerFiltrosDirectorio,
  quitarSubcategoriasDe,
  type FiltrosDirectorio,
  type OrdenDirectorio,
} from '@/lib/publico/directorio'
import { prefiereMovimientoReducido } from '@/lib/shared/motion'
import { ENTRADA, REVELAR, retardoEntrada, revelarEscalonado } from '@/lib/shared/revelado'
import escaparate from '@/app/(publico)/escaparate.module.css'
import { CategoriasDirectorio } from './categorias-directorio'
import { SubcategoriasDirectorio } from './subcategorias-directorio'
import { BotonFavorito, useFavoritos } from './favoritos'
import { TarjetaDirectorio } from './tarjeta-directorio'
import { atributosDesborde, useDesborde } from './use-desborde'
import estilos from './directorio-comercios.module.css'

/*
  EL DIRECTORIO, FILTRADO EN EL NAVEGADOR  ·  03/10/2026
  ---------------------------------------------------------------------------
  Encargo del propietario: «se demora mucho cuando le doy clic al filtro de
  me gusta; si pongo muchos filtros de categorías rápido se bugea y se
  desmarcan».

  Las dos cosas tenían la misma causa: cada filtro era una NAVEGACIÓN AL
  SERVIDOR.
    · Lenta: por cada toque, el servidor volvía a comprobar la sesión y la
      membresía, leía los favoritos y repintaba la página entera — con la
      pantalla quieta mientras tanto.
    · Frágil: cada enlace se calculaba con los filtros que el servidor tenía
      al pintar. Dos toques seguidos se pisaban: el segundo no sabía del
      primero y lo desmarcaba.

  La lista completa ya está en la página, así que ahora se filtra AQUÍ, con
  las mismas funciones puras de siempre (`filtrarDirectorio`):

    · LA URL SIGUE SIENDO LA FUENTE DE VERDAD. Los filtros se LEEN de
      `useSearchParams` y se ESCRIBEN con `history.replaceState`, que Next
      sincroniza sin ir al servidor: se comparte por WhatsApp, sobrevive a un
      refresco y el primer pintado (servidor) ya sale filtrado.
    · CADA CAMBIO PARTE DE LA URL DE ESE INSTANTE (`cambiar`), no de lo que
      había al pintar: los toques rápidos se suman.
    · SIN JAVASCRIPT sigue funcionando: los enlaces conservan su `href` y la
      búsqueda es un GET; aquí solo se interceptan.
    · No se toca el scroll.
*/

const ORDENES: OrdenDirectorio[] = ['az', 'za']

/** Transiciones de filtro en vuelo (toques seguidos se encadenan). */
let transiciones = 0

/** Los parámetros de la URL en la forma que entiende `leerFiltrosDirectorio`. */
function crudosDe(parametros: URLSearchParams): Record<string, string | string[]> {
  const crudos: Record<string, string | string[]> = {}
  for (const clave of new Set(parametros.keys())) {
    const valores = parametros.getAll(clave)
    crudos[clave] = valores.length > 1 ? valores : valores[0]
  }
  return crudos
}

/** ¿Es un clic normal? ctrl/cmd/shift+clic quieren otra pestaña y no se interceptan. */
function clicNormal(e: MouseEvent): boolean {
  return !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
}

type Props = {
  base: string
  directorio: CatalogoPublico
  titulo: string
  bajada: string
  socio: boolean
  /** Lo que va entre el banner y los filtros: el aviso de la última novedad (portal del socio). */
  aviso?: ReactNode
}

export function DirectorioInteractivo({ base, directorio, titulo, bajada, socio, aviso }: Props) {
  /*
    LOS FILTROS SE LEEN SOLO CUANDO LA URL ES LA DEL DIRECTORIO (bug del
    03/10/2026). Al tocar un comercio, la ficha se abre ENCIMA como ruta
    interceptada y la URL pasa a ser `/miembros/comercios/12`, sin filtros:
    el directorio, que sigue montado detrás, los leía de esa URL, se veía
    «sin filtros» mientras la ficha cargaba y los recuperaba al cerrarla.
    Con una ficha encima, se conservan los últimos que tuvo su propia URL.
    (`setState` durante el render: el patrón de React para derivar estado de
    algo que cambia, sin efecto y sin pintar un fotograma con el valor malo.)
  */
  /*
    LOS FILTROS QUE SE PINTAN viven aquí (`vista`) y no esperan a la URL
    (20/10/2026: «lo siento muy lento y trabado»). Antes cada toque esperaba a
    que el enrutador de Next sincronizara `useSearchParams` tras el
    `replaceState` (~35 ms); ahora el toque pinta en el acto y la URL se
    escribe a la vez. Si la URL cambia por otro camino (atrás, un enlace), se
    adopta: `url` recuerda la última que se vio, para distinguir un cambio
    de fuera del eco del propio toque.
  */
  const enSuRuta = usePathname() === base
  const cadenaActual = useSearchParams().toString()
  const [vista, setVista] = useState({ cadena: cadenaActual, url: cadenaActual })
  if (enSuRuta && cadenaActual !== vista.url) setVista({ cadena: cadenaActual, url: cadenaActual })
  const filtros = leerFiltrosDirectorio(crudosDe(new URLSearchParams(vista.cadena)))
  /** El cambio pedido que aún no se ha aplicado (ver `cambiar`). */
  const pedida = useRef<string | null>(null)
  /* El estado de favoritos de la pantalla; `null` en la fachada pública,
     donde no hay corazones ni filtro. */
  const favoritos = useFavoritos()
  const conFavoritos = favoritos !== null
  const soloFavoritos = conFavoritos && filtros.soloFavoritos

  /*
    Los favoritos que había AL ENCENDER el filtro. Sin esto, quitar un
    corazón por error dentro de la vista de favoritos haría desaparecer la
    tarjeta en el acto, sin forma de volver a marcarla: aquí se queda, con el
    corazón vacío, hasta que se vuelva a filtrar.
  */
  const [retenidos, setRetenidos] = useState<ReadonlySet<number> | null>(null)
  const idsFavoritos = favoritos && filtros.soloFavoritos ? (retenidos ?? favoritos.ids) : null

  /* De qué categoría es cada subcategoría: lo necesitan el filtro y el
     «apagar categoría», que se lleva sus subcategorías con ella. */
  const categoriaDe = new Map(
    directorio.categorias.flatMap((c) => c.subcategorias.map((s) => [s.id, c.id] as const)),
  )

  const filtrados = filtrarDirectorio(directorio.comercios, filtros, categoriaDe)
  const comercios = idsFavoritos ? filtrados.filter((c) => idsFavoritos.has(c.id)) : filtrados

  /* La ciudad elegida puede no existir ya (un enlace viejo): se muestra
     «Todas» en vez de un id suelto, y el filtro no casa con nada. */
  const ciudadActual = directorio.ciudades.find((c) => c.id === filtros.ciudadId)

  const filaFiltros = useRef<HTMLDivElement>(null)
  const desbordeFiltros = useDesborde(filaFiltros)

  /* EL FILTRO «BENEFICIO» (12/11/2026), solo en el portal de miembros: los
     tipos que de verdad tiene algún comercio del directorio, en su orden. */
  const tiposPresentes = new Set(directorio.comercios.flatMap((c) => c.tiposBeneficio ?? []))
  const beneficios = socio ? BENEFICIOS_FILTRO.filter((b) => tiposPresentes.has(b.clave)) : []
  const beneficioActual = BENEFICIOS_FILTRO.find((b) => b.clave === filtros.beneficio)

  /**
   * Aplica un cambio de filtros SIN ir al servidor. Parte de la URL de este
   * instante —no de `filtros`, que es la del último pintado—: dos toques
   * seguidos se suman en vez de pisarse.
   */
  function cambiar(
    cambio: (actuales: FiltrosDirectorio) => Partial<FiltrosDirectorio>,
    /** Categorías y subcategorías: el cambio se anima (ver abajo). */
    animar = false,
  ) {
    /*
      Se parte del ÚLTIMO CAMBIO PEDIDO, no de la URL: con la animación, el
      cambio se aplica un fotograma después (el navegador saca antes la foto
      del «antes»), y un segundo toque en ese hueco leería la URL vieja —un
      «quitar» se convertía en «poner otra vez»—.
    */
    const desde = pedida.current ?? window.location.search
    const actuales = leerFiltrosDirectorio(crudosDe(new URLSearchParams(desde)))
    const href = hrefDirectorio(actuales, cambio(actuales), base)
    const cadena = new URL(href, window.location.href).searchParams.toString()
    pedida.current = cadena
    const aplicar = () => {
      flushSync(() => setVista({ cadena, url: cadena }))
      window.history.replaceState(null, '', href)
      if (pedida.current === cadena) pedida.current = null
    }

    /*
      LA ANIMACIÓN (20/10/2026: «quiero animación para las subcategorías y
      que se sienta más fluido»). Es una View Transition del navegador: saca
      una foto del antes, aplica el cambio y anima entre las dos en el
      compositor, sin recalcular la página en cada fotograma. Mientras dura,
      `html[data-filtrando]` enciende sus reglas en `globals.css` §4c: entra
      y sale cada grupo de subcategorías, se desliza la rejilla y se funde su
      contenido. Las tarjetas NO vuelan una a una (no llevan nombre: con
      filtros serían vuelos cruzados, `CLAUDE.md` «Dónde NO»); se funden con
      su rejilla. Sin la API, o con movimiento reducido, el cambio es
      instantáneo.
    */
    const raiz = document.documentElement
    if (
      !animar ||
      typeof document.startViewTransition !== 'function' ||
      prefiereMovimientoReducido()
    ) {
      aplicar()
      return
    }
    raiz.dataset.filtrando = ''
    const transicion = document.startViewTransition(aplicar)
    transiciones += 1
    transicion.finished.finally(() => {
      // Con toques seguidos, solo la última transición apaga el atributo.
      transiciones -= 1
      if (transiciones === 0) delete raiz.dataset.filtrando
    })
  }

  function alternarFavoritos() {
    setRetenidos(soloFavoritos || !favoritos ? null : new Set(favoritos.ids))
    cambiar((f) => ({ soloFavoritos: !f.soloFavoritos }))
  }

  function alBuscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '')
    cambiar(() => ({ q: q.trim() }))
  }

  return (
    <>
      {/* ── EL BANNER ───────────────────────────────────────────────────── */}
      <section
        className={[escaparate.franja, estilos.banner].join(' ')}
        aria-labelledby="titulo-directorio"
      >
        {/* La misma foto de marca que el héroe de la landing: la portada y el
            directorio son la misma fachada. Decorativa (`alt=""`). */}
        <Image
          className={estilos.bannerFoto}
          src={fotoMarca}
          alt=""
          fill
          sizes="100vw"
          quality={80}
          placeholder="blur"
          preload
        />
        <div className={estilos.bannerVelo} aria-hidden="true" />

        <div className={[estilos.bannerContenido, escaparate.sobreFoto].join(' ')}>
          <h1
            id="titulo-directorio"
            className={[estilos.titulo, ENTRADA].join(' ')}
            style={retardoEntrada(1)}
          >
            {titulo}
          </h1>
          <p className={[estilos.bajada, ENTRADA].join(' ')} style={retardoEntrada(2)}>
            {bajada}
          </p>

          {/*
            La búsqueda filtra al enviar, sin navegar. Sin JavaScript es un
            GET a esta misma ruta, y por eso los demás filtros viajan en
            campos ocultos: buscar no puede borrar la categoría o la ciudad
            ya elegidas.
          */}
          <form
            className={[estilos.buscador, ENTRADA].join(' ')}
            style={retardoEntrada(3)}
            method="get"
            action={base}
            role="search"
            onSubmit={alBuscar}
          >
            <label htmlFor="busqueda-directorio" className="sr-only">
              Buscar comercios
            </label>
            <input
              /* `key`: si la búsqueda cambia desde fuera (un enlace, «Ver
                 todos»), el campo se vuelve a pintar con el valor nuevo. */
              key={filtros.q}
              id="busqueda-directorio"
              className={estilos.campo}
              type="search"
              name="q"
              defaultValue={filtros.q}
              placeholder="Buscar por nombre, categoría o zona"
              autoComplete="off"
              enterKeyHint="search"
            />
            {filtros.categoriaIds.length > 0 && (
              <input type="hidden" name="categoria_id" value={filtros.categoriaIds.join(',')} />
            )}
            {filtros.subcategoriaIds.length > 0 && (
              <input type="hidden" name="subcategoria_id" value={filtros.subcategoriaIds.join(',')} />
            )}
            {filtros.ciudadId !== null && (
              <input type="hidden" name="ciudad_id" value={filtros.ciudadId} />
            )}
            {filtros.orden !== 'az' && <input type="hidden" name="orden" value={filtros.orden} />}
            {soloFavoritos && <input type="hidden" name="favoritos" value="1" />}
            {filtros.beneficio && <input type="hidden" name="beneficio" value={filtros.beneficio} />}
            <button type="submit" className={estilos.botonBuscar} aria-label="Buscar">
              <Search size={18} aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>

      {aviso}

      {/* ── FAVORITOS + CATEGORÍAS + CIUDAD + ORDEN ─────────────────────── */}
      <section
        id="comercios"
        className={[estilos.panel, REVELAR].join(' ')}
        aria-label="Filtros del directorio"
      >
        <div className={estilos.herramientas}>
          <p className={estilos.recuento} aria-live="polite">
            {comercios.length === 1 ? '1 comercio' : `${comercios.length} comercios`}
          </p>

          {/* En el teléfono se desliza de lado y se desvanece hacia donde sigue. */}
          <div ref={filaFiltros} className={estilos.menus} data-desliza {...atributosDesborde(desbordeFiltros)}>
            {/* «Favoritos»: un interruptor, no un menú. Enciende y apaga el
                filtro con el mismo toque; lleva el corazón relleno y rojo
                cuando está puesto. Solo el socio tiene favoritos. */}
            {conFavoritos && (
              <a
                href={hrefDirectorio(filtros, { soloFavoritos: !soloFavoritos }, base)}
                className={[estilos.disparador, estilos.favoritos].join(' ')}
                data-activo={soloFavoritos || undefined}
                onClick={(e) => {
                  if (!clicNormal(e)) return
                  e.preventDefault()
                  alternarFavoritos()
                }}
              >
                <span className={estilos.disparadorIcono} aria-hidden="true">
                  <Heart size={15} fill={soloFavoritos ? 'currentColor' : 'none'} />
                </span>
                Favoritos
                {soloFavoritos && <span className="sr-only"> (filtro activo)</span>}
              </a>
            )}
            {/* Con una sola ciudad el menú sigue estando: es el filtro que el
                cliente pidió, y dice en qué ciudad está el club hoy. Sin
                ninguna sede cargada no hay nada que elegir y se retira. */}
            {directorio.ciudades.length > 0 && (
              <DropdownMenu
                align="end"
                trigger={
                  <button type="button" className={estilos.disparador} data-activa={ciudadActual ? '' : undefined}>
                    <span className={estilos.disparadorIcono} aria-hidden="true">
                      <MapPin size={15} />
                    </span>
                    {/* En el teléfono, corto: el nombre del filtro o lo elegido. */}
                    <span className={estilos.textoLargo}>Ciudad: {ciudadActual?.nombre ?? 'Todas'}</span>
                    <span className={estilos.textoCorto}>{ciudadActual?.nombre ?? 'Ciudad'}</span>
                    <ChevronDown size={14} aria-hidden="true" className={estilos.chevron} />
                  </button>
                }
              >
                <MenuItem
                  href={hrefDirectorio(filtros, { ciudadId: null }, base)}
                  scroll={false}
                  selected={!ciudadActual}
                  onSelect={() => cambiar(() => ({ ciudadId: null }))}
                >
                  Todas
                </MenuItem>
                {directorio.ciudades.map((c) => (
                  <MenuItem
                    key={c.id}
                    href={hrefDirectorio(filtros, { ciudadId: c.id }, base)}
                    scroll={false}
                    selected={c.id === ciudadActual?.id}
                    onSelect={() => cambiar(() => ({ ciudadId: c.id }))}
                  >
                    {c.nombre}
                  </MenuItem>
                ))}
              </DropdownMenu>
            )}

            {/* Por tipo de beneficio: solo el socio, y solo si hay entre qué elegir. */}
            {beneficios.length > 0 && (
              <DropdownMenu
                align="end"
                trigger={
                  <button type="button" className={estilos.disparador} data-activa={beneficioActual ? '' : undefined}>
                    <span className={estilos.disparadorIcono} aria-hidden="true">
                      <Tag size={15} />
                    </span>
                    <span className={estilos.textoLargo}>Beneficio: {beneficioActual?.etiqueta ?? 'Todos'}</span>
                    <span className={estilos.textoCorto}>{beneficioActual?.etiqueta ?? 'Beneficio'}</span>
                    <ChevronDown size={14} aria-hidden="true" className={estilos.chevron} />
                  </button>
                }
              >
                <MenuItem
                  href={hrefDirectorio(filtros, { beneficio: null }, base)}
                  scroll={false}
                  selected={!beneficioActual}
                  onSelect={() => cambiar(() => ({ beneficio: null }))}
                >
                  Todos
                </MenuItem>
                {beneficios.map((b) => (
                  <MenuItem
                    key={b.clave}
                    href={hrefDirectorio(filtros, { beneficio: b.clave }, base)}
                    scroll={false}
                    selected={b.clave === beneficioActual?.clave}
                    onSelect={() => cambiar(() => ({ beneficio: b.clave }))}
                  >
                    {b.etiqueta}
                  </MenuItem>
                ))}
              </DropdownMenu>
            )}

            <DropdownMenu
              align="end"
              trigger={
                <button type="button" className={estilos.disparador}>
                  <span className={estilos.disparadorIcono} aria-hidden="true">
                    <ArrowUpDown size={15} />
                  </span>
                  <span className={estilos.textoLargo}>Ordenar: {ETIQUETAS_ORDEN[filtros.orden]}</span>
                  <span className={estilos.textoCorto}>
                    <span className="sr-only">Ordenar: </span>
                    {ETIQUETAS_ORDEN[filtros.orden]}
                  </span>
                  <ChevronDown size={14} aria-hidden="true" className={estilos.chevron} />
                </button>
              }
            >
              {ORDENES.map((orden) => (
                <MenuItem
                  key={orden}
                  href={hrefDirectorio(filtros, { orden }, base)}
                  scroll={false}
                  selected={orden === filtros.orden}
                  onSelect={() => cambiar(() => ({ orden }))}
                >
                  {orden === 'az' ? 'Nombre, de la A a la Z' : 'Nombre, de la Z a la A'}
                </MenuItem>
              ))}
            </DropdownMenu>
          </div>
        </div>
        {/* Las categorías, a la vista, DEBAJO de los filtros y separadas de
            ellos por una línea fina (la pone `.herramientas`): dos filas que
            se desplazan, y «Ver más» al final (ver `CategoriasDirectorio`). */}
        {directorio.categorias.length > 0 && (
          <CategoriasDirectorio
            total={comercios.length}
            /* VARIAS a la vez: cada una se enciende y se apaga sola;
               «Todas» limpia la selección. */
            onElegir={(id) =>
              cambiar(
                (f) =>
                  id === null
                    ? { categoriaIds: [], subcategoriaIds: [] }
                    : {
                        categoriaIds: alternarCategoria(f.categoriaIds, id),
                        // Al apagarla se van sus subcategorías; al encenderla no hay ninguna.
                        subcategoriaIds: quitarSubcategoriasDe(f.subcategoriaIds, id, categoriaDe),
                      },
                true,
              )
            }
            opciones={[
              {
                id: null,
                nombre: 'Todas',
                href: hrefDirectorio(filtros, { categoriaIds: [], subcategoriaIds: [] }, base),
                activa: filtros.categoriaIds.length === 0,
              },
              ...directorio.categorias.map((c) => ({
                id: c.id,
                nombre: c.nombre,
                // El buscador de «Ver todas» también encuentra por subcategoría.
                subcategorias: c.subcategorias.map((s) => s.nombre),
                href: hrefDirectorio(
                  filtros,
                  {
                    categoriaIds: alternarCategoria(filtros.categoriaIds, c.id),
                    subcategoriaIds: quitarSubcategoriasDe(filtros.subcategoriaIds, c.id, categoriaDe),
                  },
                  base,
                ),
                activa: filtros.categoriaIds.includes(c.id),
              })),
            ]}
          />
        )}
        {/* Las subcategorías de las categorías elegidas, debajo: afinan. */}
        <SubcategoriasDirectorio
          onElegir={(id) =>
            cambiar((f) => ({ subcategoriaIds: alternarCategoria(f.subcategoriaIds, id) }), true)
          }
          onTodo={(categoriaId) =>
            cambiar(
              (f) => ({
                subcategoriaIds: quitarSubcategoriasDe(f.subcategoriaIds, categoriaId, categoriaDe),
              }),
              true,
            )
          }
          grupos={directorio.categorias
            .filter((c) => filtros.categoriaIds.includes(c.id) && c.subcategorias.length > 0)
            .map((c) => ({
              categoriaId: c.id,
              categoria: c.nombre,
              hrefTodo: hrefDirectorio(
                filtros,
                { subcategoriaIds: quitarSubcategoriasDe(filtros.subcategoriaIds, c.id, categoriaDe) },
                base,
              ),
              opciones: c.subcategorias.map((s) => ({
                id: s.id,
                nombre: s.nombre,
                href: hrefDirectorio(
                  filtros,
                  { subcategoriaIds: alternarCategoria(filtros.subcategoriaIds, s.id) },
                  base,
                ),
                activa: filtros.subcategoriaIds.includes(s.id),
              })),
            }))}
        />
      </section>

      {/* ── LA REJILLA ──────────────────────────────────────────────────── */}
      {/* `data-vt`: al filtrar, la rejilla se desliza como UNA pieza (globals.css §4c). */}
      <section className={estilos.resultados} aria-label="Comercios aliados" data-vt="resultados">
        {comercios.length > 0 ? (
          <ul className={estilos.rejilla}>
            {comercios.map((c, i) => (
              /* En la celda y no en la tarjeta: la tarjeta se levanta al apuntarla. */
              <li key={c.id} className={[estilos.celda, revelarEscalonado(i)].join(' ')}>
                <TarjetaDirectorio comercio={c} socio={socio} />
                {/* Hermano del enlace, no hijo: ver `favoritos.tsx`. */}
                {conFavoritos && (
                  <BotonFavorito comercioId={c.id} nombre={c.nombre} className={estilos.corazon} />
                )}
              </li>
            ))}
          </ul>
        ) : idsFavoritos && idsFavoritos.size === 0 ? (
          <EmptyState
            title="Aún no tienes favoritos"
            description="Toca el corazón de un comercio para guardarlo aquí y encontrarlo de un vistazo."
            icon={<Heart aria-hidden="true" />}
            actions={
              <Button variant="secondary" pildora onClick={alternarFavoritos}>
                Ver todos los comercios
              </Button>
            }
          />
        ) : hayFiltros(filtros) ? (
          <EmptyState
            title="Ningún comercio coincide"
            description={
              socio
                ? 'Prueba con otra categoría, otra ciudad, otro beneficio u otra búsqueda.'
                : 'Prueba con otra categoría, otra ciudad u otra búsqueda.'
            }
            icon={<Search aria-hidden="true" />}
            actions={
              <Button
                variant="secondary"
                pildora
                onClick={() => {
                  setRetenidos(null)
                  window.history.replaceState(null, '', base)
                }}
              >
                Ver todos los comercios
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="Pronto habrá comercios aquí"
            description="Estamos sumando los primeros aliados del club."
            icon={<LayoutGrid aria-hidden="true" />}
          />
        )}
      </section>
    </>
  )
}
