import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { CortacircuitoAbierto, crearCortacircuito } from '@/lib/shared/cortacircuito'
import { conReintentoUnico } from '@/lib/shared/reintento'
import { obtenerAnunciosVisibles } from '@/lib/anuncios/consultas'
import { resolverLogoComercio } from '@/lib/comercios/logo-comercio'
import { leerHorariosDeSucursales } from '@/lib/comercios/horario-datos'
import type { HorarioSucursal } from '@/lib/comercios/horario'
import { esPromocionVigente } from '@/lib/comercios/promocion-vigente'
import { formatearBeneficio, formatearBeneficioCorto } from '@/lib/comercios/beneficios-formato'
import { TOPE_PUBLICIDAD, textoAlternativo } from '@/lib/publicidad/publicidad'
import { hoyISO } from '@/lib/shared/fecha'
import { compararNombres, ordenarCategorias, type CategoriaDeComercio } from './directorio'
import { catalogoPara, faltaColumnaVisibilidad, leerVisibilidad, type Visibilidad } from '@/lib/comercios/visibilidad'
import { prepararPlanes, type PlanPublico } from './planes'

/* ==========================================================================
   CACHÉ DE DATOS PÚBLICOS  ·  60 s  (1/10/2026, auditoría de carga)
   --------------------------------------------------------------------------
   Antes, CADA visita a la portada, a `/explorar` o a una ficha leía la base
   (comercios, promociones, sucursales, planes, WhatsApp, anuncios). `cache()`
   de React solo deduplica DENTRO de una petición; entre visitantes no
   compartía nada, así que la carga sobre la base crecía con las visitas.

   Ahora las lecturas pasan por `unstable_cache`: mil visitas en un minuto son
   una sola lectura. Se cachea la CAPA DE DATOS y no la página, porque la
   portada mira la sesión de quien entra (el botón cambia si ya eres socio).

   DECISIÓN DEL PROPIETARIO: un cambio del administrador puede tardar HASTA
   60 SEGUNDOS en verse en la fachada. No hay invalidación por etiqueta desde
   las acciones del admin a propósito (son ~10 y olvidar una dejaría datos
   viejos sin avisar); si algún día «al instante» importa más, la etiqueta
   `publico` ya está puesta: basta `revalidateTag('publico')` en esas acciones.

   Dos límites a conocer:
     · `unstable_cache` serializa a JSON: lo que devuelven estas funciones es
       JSON puro (los `Map` son internos). Un `Date`, `Map` o `undefined` en el
       resultado se rompería en silencio.
     · Un fallo transitorio de la base que devuelva vacío quedaría cacheado
       hasta 60 s en vez de afectar a una sola petición.
   ========================================================================== */

/*
  06/11/2026 · PRUEBA DE CARGA · 60 s → 300 s.

  Con 250 usuarios simultáneos Supabase empezó a devolver 522/525 a los
  refrescos de esta caché: ~69 peticiones por segundo contra una API que ya
  rechazaba conexiones, y Vercel registró ~17.000 errores y 2.155 funciones
  muertas a los 300 s. Con 300 s el refresco baja unas cinco veces.

  DECISIÓN DEL PROPIETARIO (06/11/2026): un cambio del administrador puede
  tardar HASTA 5 MINUTOS en verse en la fachada (antes, 1). La etiqueta
  `publico` sigue puesta: `revalidateTag('publico')` en las acciones del admin
  lo haría inmediato si algún día importa más.

  Tres piezas más lo acompañan, todas probadas aparte en `lib/shared/`:
    · `fetchConTiempoMaximo`: ninguna lectura espera más de TIEMPO_MAXIMO_LECTURA_MS.
    · `crearCortacircuito`: tras un fallo, esa lectura no vuelve a llamar a
      Supabase durante ENFRIAMIENTO_MS y se sigue sirviendo lo último bueno.
    · `conReintentoUnico`: el reintento espera una pausa aleatoria y se salta
      si el circuito está abierto.
*/
const OPCIONES_CACHE: { revalidate: number; tags: string[] } = { revalidate: 300, tags: ['publico'] }

const TIEMPO_MAXIMO_LECTURA_MS = 5_000
const ENFRIAMIENTO_MS = 15_000

// Un solo cortacircuito para todas las lecturas de la fachada, una clave por lectura.
const circuito = crearCortacircuito({ enfriamientoMs: ENFRIAMIENTO_MS })

/** El cliente de servicio de la fachada: igual que el de siempre, con techo de espera. */
function clienteFachada() {
  return createAdminClient({ tiempoMaximoMs: TIEMPO_MAXIMO_LECTURA_MS })
}

/*
  UN FALLO DE LA BASE NO ES «NO HAY DATOS» (02/10/2026).

  Las lecturas solo miraban `data`: si una consulta fallaba —un corte
  momentáneo, un tiempo de espera—, `data` llegaba en `null` y la función
  devolvía un catálogo vacío como si el club no tuviera comercios. Con la
  caché de 60 s ese vacío se GUARDABA y se servía a todo el mundo durante un
  minuto: la portada sin carrusel ni destacados, el directorio con «0
  comercios», una ficha como «no disponible».

  Ahora una consulta fallida LANZA (`exigir`). `unstable_cache` no guarda una
  excepción, así que la caché nunca queda envenenada; fuera de ella,
  `conRespaldo` reintenta una vez y, solo si vuelve a fallar, sirve el vacío
  de esa única petición, sin cachearlo y sin romper la página.
*/
function exigir<T>(
  resultado: { data: T | null; error: { message: string } | null },
  que: string,
): T | null {
  if (resultado.error) {
    throw new Error(`[publico] No se pudo leer ${que}: ${resultado.error.message}`)
  }
  return resultado.data
}

async function conRespaldo<T>(leer: () => Promise<T>, respaldo: T, que: string): Promise<T> {
  try {
    return await conReintentoUnico(leer, {
      // Con el circuito abierto insistir no sirve: es justo lo que se evita.
      noReintentar: (e) => e instanceof CortacircuitoAbierto,
    })
  } catch (e) {
    console.error(`[publico] ${que}: no se pudo leer, se sirve vacío sin cachear`, e)
    return respaldo
  }
}

/* ==========================================================================
   LOS DATOS DE LA FACHADA  ·  y por qué salen del cliente de servicio
   --------------------------------------------------------------------------
   `createAdminClient()` y NO `createClient()`, que es el que usa el resto del
   producto.

   `createClient()` lleva la clave anónima y resuelve la sesión por cookies, y
   hoy TODOS los consumidores de `comercios`, `marcas`, `promociones` y
   `configuracion` están detrás de `requireMiembroVigente`, `requireRolComercio`
   o un rol de administración: no existe ninguna política de lectura anónima
   sobre esas tablas. Desde una página pública, sin sesión, esas consultas
   devolverían CERO FILAS EN SILENCIO —sin error, sin aviso— y la landing
   diría por omisión que ORUM no tiene aliados.

   La alternativa correcta a largo plazo es la política RLS de lectura pública
   (B1 de la spec). No se toma hoy porque esa migración no está aplicada y una
   landing que depende de SQL sin aplicar se ve vacía el día del despliegue.

   Al usar la `service_role` se salta RLS, así que la disciplina la pone ESTE
   archivo, en un único sitio:

     · Solo se seleccionan columnas públicas. De `comercios`: `id`, `nombre`,
       `descripcion`, `logo_url`, `portada_url` y `marca_id`; de
       `comercio_categorias`, `categoria_id` y `subcategoria_id` (hasta 3 por
       comercio).
       De `marcas`: `id` y `logo_url`. De `promociones`, lo justo para saber
       si hay un beneficio vigente y cómo se llama. De `sucursales`: nombre,
       dirección y ciudad —el teléfono de cada sede se queda fuera: el
       contacto de la fachada es el WhatsApp de ORUM—. De `comercio_imagenes`:
       URL y texto alternativo. De `planes_membresia`: nombre, descripción,
       precio y duración, que es catálogo de producto y no dato de nadie.
     · QUEDA DELIBERADAMENTE FUERA `comercios.perfil_id` —es el enlace con la
       cuenta de acceso del comercio— y cualquier columna de `miembros`,
       `perfiles`, `ventas` o `membresias`. Nada de lo que se lee aquí
       identifica a una persona.
     · `marca_id` sí entra, aunque no aparezca en pantalla: es lo que permite
       que un comercio sin logotipo propio herede el de su marca
       (`resolverLogoComercio`). Es una clave foránea a un catálogo público,
       no un dato sensible.
     · Siempre `activo = true` y `deleted_at is null`. Un comercio dado de baja
       no se anuncia en la puerta.
     · Este módulo lleva `server-only`: si alguien lo importara desde un
       componente con `'use client'`, el build falla en vez de publicar la
       clave de servicio en el navegador.

   `cache()` de React deduplica dentro de una misma petición: el layout pide el
   WhatsApp para el pie y la página lo vuelve a pedir para el CTA, y solo se
   consulta una vez.
   ========================================================================== */

/** Cuántas tarjetas entran en «Comercios destacados». Es una muestra, no el catálogo. */
const TOPE_DESTACADOS = 5

/** Cuántas fotografías rotan en el carrusel de «Qué es ORUM». */
const TOPE_FOTOS = 5

/**
 * Techo de la lectura del directorio. Holgado para el lanzamiento; cuando el
 * club pase de aquí, el directorio necesitará paginar y este número lo dirá
 * antes que nadie.
 */
const TOPE_DIRECTORIO = 500

/**
 * Un comercio tal y como lo necesita la fachada: más delgado que el
 * `ComercioListado` del catálogo de miembros, y a propósito.
 *
 * No importa aquel tipo porque vive en `_components/` de una ruta privada:
 * una ruta pública que dependiera de él invertiría la dependencia, y además
 * arrastraría campos (`createdAt`, `marcaNombre`, la lista completa de
 * promociones) que esta pantalla no muestra.
 */
export type ComercioVitrina = {
  id: number
  nombre: string
  descripcion: string | null
  /** Sus categorías (hasta 3), en el orden en que se guardaron. */
  categorias: CategoriaDeComercio[]
  /** Ids de las ciudades con al menos una sede activa. Alimentan el filtro. */
  ciudadIds: number[]
  ciudades: string[]
  logoUrl: string | null
  /** Texto ya formateado del beneficio vigente más visible, o `null`. */
  beneficioDestacado: string | null
  /**
   * La fotografía del local, que NO es el logotipo: `comercios.portada_url`
   * (migración `20260913120000_imagenes_y_avatares.sql`). Una cadena vacía se
   * normaliza a `null`: sería un `<img src="">`, que el navegador resuelve
   * pidiendo otra vez la propia página.
   */
  portadaUrl: string | null
  /** Dónde se ve: el catálogo es UNO y cada portal se queda con lo suyo (`catalogoPara`). */
  visible: Visibilidad
}

/** Una opción de filtro del directorio: una categoría o una ciudad. */
export type OpcionFiltro = { id: number; nombre: string }

/**
 * Una categoría del directorio con sus subcategorías (20/10/2026). Solo las
 * subcategorías con algún comercio activo: elegir una vacía daría siempre una
 * rejilla vacía.
 */
export type CategoriaFiltro = OpcionFiltro & { subcategorias: OpcionFiltro[] }

/** Una fotografía de la fachada, con su texto alternativo ya resuelto. */
export type FotoPublica = { url: string; alt: string }

export type DatosVitrina = {
  /** «Comercios destacados», hasta `TOPE_DESTACADOS`. */
  destacados: ComercioVitrina[]
  /** Portadas reales de comercios, hasta `TOPE_FOTOS`. Hoy solo son el
   *  respaldo del carrusel mientras no exista la tabla `publicidad`. */
  fotos: FotoPublica[]
  /** Cuántos comercios activos hay en total. */
  totalComercios: number
}

export type CatalogoPublico = {
  /** Todos los comercios activos, en orden alfabético. */
  comercios: ComercioVitrina[]
  /** Todas las categorías del catálogo, aunque alguna esté vacía hoy. */
  categorias: CategoriaFiltro[]
  /**
   * Solo las ciudades con al menos una sede activa: filtrar por una ciudad
   * sin comercios daría siempre una rejilla vacía.
   */
  ciudades: OpcionFiltro[]
}

/**
 * LA ÚNICA LECTURA DEL CATÁLOGO PÚBLICO.
 *
 * La landing y el directorio (`/explorar`) piden cosas distintas —una muestra
 * de cinco y la lista entera— pero del MISMO conjunto de comercios. Leerlo en
 * un solo sitio garantiza que las dos pantallas no se contradigan (un
 * destacado de la portada que no aparece en el directorio), y `cache()` hace
 * que, si las dos lo piden en la misma petición, se consulte una sola vez.
 */
async function leerCatalogoPublico(): Promise<CatalogoPublico> {
  const supabase = clienteFachada()
  // Fecha civil 'YYYY-MM-DD' en America/Bogotá: `fecha_inicio` y `fecha_fin` de
  // promociones son fechas civiles, no `timestamptz`. Se comparan como cadenas.
  const hoy = hoyISO()

  const [rComercios, rMarcas, rCategorias, rSubcategorias] = await Promise.all([
    supabase
      .from('comercios')
      // `*` y no una lista: trae `visible_publico`/`visible_miembros` si la
      // migración 20261107120000 está aplicada, y no falla si no lo está.
      .select('*')
      .eq('activo', true)
      .is('deleted_at', null)
      .order('nombre')
      .limit(TOPE_DIRECTORIO),
    supabase.from('marcas').select('id, logo_url').limit(200),
    supabase.from('categorias').select('id, nombre').limit(100),
    supabase.from('subcategorias').select('id, subcategoria, categoria_id').limit(300),
  ])
  const comercios = exigir(rComercios, 'los comercios')
  const marcas = exigir(rMarcas, 'las marcas')
  const categorias = exigir(rCategorias, 'las categorías')
  const subcategorias = exigir(rSubcategorias, 'las subcategorías')

  const ids = (comercios ?? []).map((c) => c.id)

  /* Las categorías de los comercios activos (hasta 3 cada uno). Sin comercios
     no hay nada que pedir. */
  const rFilasCategoria =
    ids.length > 0
      ? await supabase
          .from('comercio_categorias')
          .select('comercio_id, categoria_id, subcategoria_id, orden')
          .in('comercio_id', ids)
          .order('orden')
          .limit(TOPE_DIRECTORIO * 3)
      : { data: [], error: null }
  const filasCategoria = exigir(rFilasCategoria, 'las categorías de los comercios')

  // Las subcategorías que algún comercio activo usa, bajo su categoría.
  const subcategoriasUsadas = new Set((filasCategoria ?? []).map((f) => f.subcategoria_id))
  const categoriasOrdenadas: CategoriaFiltro[] = ordenarCategorias(
    (categorias ?? []).map((c) => ({ id: c.id, nombre: c.nombre.trim() })),
  ).map((c) => ({
    ...c,
    subcategorias: (subcategorias ?? [])
      .filter((s) => s.categoria_id === c.id && subcategoriasUsadas.has(s.id))
      .map((s) => ({ id: s.id, nombre: s.subcategoria.trim() }))
      .sort((a, b) => compararNombres(a.nombre, b.nombre)),
  }))

  if (!comercios || comercios.length === 0) {
    return { comercios: [], categorias: categoriasOrdenadas, ciudades: [] }
  }

  const [rPromociones, rTipos, rSucursales, rCiudades] =
    await Promise.all([
      supabase
        .from('promociones')
        .select('comercio_id, valor, tipo_beneficio_id, activo, fecha_inicio, fecha_fin')
        .eq('activo', true)
        .is('deleted_at', null)
        .in('comercio_id', ids)
        .limit(TOPE_DIRECTORIO * 2),
      supabase.from('tipos_beneficio').select('id, codigo').limit(100),
      supabase
        .from('sucursales')
        .select('comercio_id, ciudad_id')
        .eq('activo', true)
        .is('deleted_at', null)
        .in('comercio_id', ids)
        .limit(TOPE_DIRECTORIO * 2),
      supabase.from('ciudades').select('id, nombre').limit(200),
    ])
  const promociones = exigir(rPromociones, 'las promociones')
  const tipos = exigir(rTipos, 'los tipos de beneficio')
  const sucursales = exigir(rSucursales, 'las sucursales')
  const ciudades = exigir(rCiudades, 'las ciudades')

  const logoDeMarca = new Map((marcas ?? []).map((m) => [m.id, m.logo_url]))
  const nombreCategoria = new Map((categorias ?? []).map((c) => [c.id, c.nombre]))
  const nombreSubcategoria = new Map(
    (subcategorias ?? []).map((s) => [s.id, s.subcategoria.trim()]),
  )
  const nombreCiudad = new Map((ciudades ?? []).map((c) => [c.id, c.nombre]))
  const codigoTipo = new Map((tipos ?? []).map((t) => [t.id, t.codigo]))

  const ciudadesPorComercio = new Map<number, Set<number>>()
  const ciudadesDelClub = new Set<number>()
  for (const s of sucursales ?? []) {
    if (!nombreCiudad.has(s.ciudad_id)) continue
    if (!ciudadesPorComercio.has(s.comercio_id)) {
      ciudadesPorComercio.set(s.comercio_id, new Set())
    }
    ciudadesPorComercio.get(s.comercio_id)!.add(s.ciudad_id)
    ciudadesDelClub.add(s.ciudad_id)
  }

  const beneficioPorComercio = new Map<number, string>()
  for (const p of promociones ?? []) {
    // Una promoción caducada no se anuncia: la caja del comercio la rechazaría.
    if (!esPromocionVigente(p.activo, p.fecha_inicio, p.fecha_fin, hoy)) continue
    if (beneficioPorComercio.has(p.comercio_id)) continue
    const tipoCodigo = codigoTipo.get(p.tipo_beneficio_id)
    if (!tipoCodigo) continue
    // La forma CORTA («10%», «2x1»): en la tarjeta del directorio la frase
    // entera partía en dos líneas y el propietario la quería breve. La ficha
    // sigue diciendo «10% de descuento».
    beneficioPorComercio.set(p.comercio_id, formatearBeneficioCorto(tipoCodigo, p.valor))
  }

  const categoriasPorComercio = new Map<number, CategoriaDeComercio[]>()
  for (const f of filasCategoria ?? []) {
    const categoriaNombre = nombreCategoria.get(f.categoria_id)
    if (categoriaNombre === undefined) continue
    const deEste = categoriasPorComercio.get(f.comercio_id) ?? []
    deEste.push({
      categoriaId: f.categoria_id,
      categoriaNombre: categoriaNombre.trim(),
      subcategoriaId: f.subcategoria_id,
      subcategoriaNombre: f.subcategoria_id
        ? (nombreSubcategoria.get(f.subcategoria_id) ?? null)
        : null,
    })
    categoriasPorComercio.set(f.comercio_id, deEste)
  }

  const lista: ComercioVitrina[] = comercios.map((c) => {
    const ciudadIds = Array.from(ciudadesPorComercio.get(c.id) ?? [])
    return {
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion,
      categorias: categoriasPorComercio.get(c.id) ?? [],
      ciudadIds,
      ciudades: ciudadIds.map((id) => nombreCiudad.get(id) ?? '').filter(Boolean),
      logoUrl: resolverLogoComercio(
        c.logo_url,
        c.marca_id ? (logoDeMarca.get(c.marca_id) ?? null) : null,
      ),
      beneficioDestacado: beneficioPorComercio.get(c.id) ?? null,
      portadaUrl: (c.portada_url ?? '').trim() || null,
      visible: leerVisibilidad(c),
    }
  })

  return {
    /* Postgres ordena por bytes («Café 10» antes que «Café 2»): se reordena
       aquí con el mismo criterio que usa el directorio. */
    comercios: lista.sort((a, b) => compararNombres(a.nombre, b.nombre)),
    categorias: categoriasOrdenadas,
    ciudades: Array.from(ciudadesDelClub)
      .map((id) => ({ id, nombre: nombreCiudad.get(id) ?? '' }))
      .sort((a, b) => compararNombres(a.nombre, b.nombre)),
  }
}

const catalogoEnCache = unstable_cache(
  () => circuito.ejecutar('catalogo', leerCatalogoPublico),
  // v2 (07/11/2026): cada comercio trae `visible`; una copia vieja no lo tenía.
  ['publico-catalogo-v2'],
  OPCIONES_CACHE,
)
const cargarCatalogoPublico = cache(() =>
  conRespaldo(
    () => catalogoEnCache(),
    { comercios: [], categorias: [], ciudades: [] } as CatalogoPublico,
    'el catálogo',
  ),
)

/**
 * Lo que pinta la landing: cinco destacados, las fotos del carrusel y el
 * total del club.
 */
export const obtenerVitrinaPublica = cache(async (): Promise<DatosVitrina> => {
  const { comercios } = catalogoPara(await cargarCatalogoPublico(), 'publico')

  /*
    Delante, quien tiene algo que enseñar. Una tarjeta de «destacados» sin
    fotografía es un rectángulo negro con un logotipo, y sin beneficio no
    tiene nada que prometer: primero los que traen las dos cosas, luego los
    que traen foto, luego los que traen beneficio. `sort` es estable, así que
    dentro de cada grupo se conserva el orden alfabético.
  */
  const peso = (c: ComercioVitrina) => (c.portadaUrl ? 2 : 0) + (c.beneficioDestacado ? 1 : 0)
  const ordenados = [...comercios].sort((a, b) => peso(b) - peso(a))

  const fotos: FotoPublica[] = ordenados.flatMap((c) =>
    c.portadaUrl ? [{ url: c.portadaUrl, alt: `${c.nombre}, comercio aliado de ORUM` }] : [],
  )

  return {
    destacados: ordenados.slice(0, TOPE_DESTACADOS),
    fotos: fotos.slice(0, TOPE_FOTOS),
    totalComercios: comercios.length,
  }
})

/* ==========================================================================
   LA PUBLICIDAD  ·  las imágenes del carrusel de la portada (13/10/2026)
   --------------------------------------------------------------------------
   Las sube y ordena el administrador (`/admin/publicidad`); ya no salen de
   las portadas de los comercios.

   DEVUELVE `null` SI LA TABLA TODAVÍA NO EXISTE. El esquema se aplica a mano
   (`supabase/README.md`), así que este código puede llegar a producción
   antes que su tabla: en ese caso la portada sigue con las fotos de los
   comercios, como hasta hoy, en vez de quedarse sin carrusel. Con la tabla
   creada manda SOLO lo que haya puesto el administrador — también si no ha
   puesto nada: quitarlas todas tiene que poder dejar la portada sin carrusel.
   ========================================================================== */

/** Postgres (`42P01`) y PostgREST (`PGRST205`) dicen así «esa tabla no existe». */
const TABLA_AUSENTE = new Set(['42P01', 'PGRST205'])

async function leerPublicidadPublica(): Promise<FotoPublica[] | null> {
  const supabase = clienteFachada()
  const { data, error } = await supabase
    .from('publicidad')
    .select('imagen_url, descripcion')
    .eq('activo', true)
    .order('orden', { ascending: true })
    .order('id', { ascending: true })
    .limit(TOPE_PUBLICIDAD)

  if (error) {
    if (TABLA_AUSENTE.has(error.code)) return null
    throw new Error(`[publico] No se pudo leer la publicidad: ${error.message}`)
  }

  return (data ?? []).flatMap((p) => {
    const url = (p.imagen_url ?? '').trim()
    return url ? [{ url, alt: textoAlternativo(p.descripcion ?? '') }] : []
  })
}

const publicidadEnCache = unstable_cache(
  () => circuito.ejecutar('publicidad', leerPublicidadPublica),
  ['publico-publicidad'],
  OPCIONES_CACHE,
)

/**
 * Las imágenes del carrusel, en su orden. `null` = la tabla aún no existe o
 * la base falló dos veces: quien llama cae a las fotos de los comercios.
 */
export const obtenerPublicidadPublica = cache(
  async (): Promise<FotoPublica[] | null> =>
    conRespaldo(() => publicidadEnCache(), null, 'la publicidad'),
)

/** El directorio del Portal Público, con sus opciones de filtro. */
export const obtenerDirectorioPublico = cache(
  async (): Promise<CatalogoPublico> => catalogoPara(await cargarCatalogoPublico(), 'publico'),
)

/**
 * El directorio del Portal de Miembros: el MISMO catálogo (y la misma caché),
 * con los comercios que el administrador puso a la vista de los socios.
 */
export const obtenerDirectorioMiembros = cache(
  async (): Promise<CatalogoPublico> => catalogoPara(await cargarCatalogoPublico(), 'miembros'),
)

/* ==========================================================================
   LA FICHA PÚBLICA
   ========================================================================== */

export type SedePublica = {
  id: number
  nombre: string | null
  direccion: string | null
  ciudadNombre: string | null
  /** Vacío = la sucursal no tiene horario cargado. */
  horario: HorarioSucursal
}

export type FichaPublica = {
  id: number
  nombre: string
  descripcion: string | null
  categorias: CategoriaDeComercio[]
  logoUrl: string | null
  portadaUrl: string | null
  ciudades: string[]
  sedes: SedePublica[]
  /** Beneficios vigentes, ya formateados. La ficha los enseña desenfocados. */
  beneficios: string[]
  fotos: FotoPublica[]
  /** `false` = la ficha lleva `noindex` y no entra en el sitemap. */
  indexable: boolean
}

/**
 * La ficha de un comercio para quien todavía no es socio.
 *
 * Devuelve `null` en los tres casos fatales —no existe, inactivo, borrado—
 * sin distinguirlos, igual que la ficha del portal de miembros: distinguirlos
 * permitiría enumerar comercios dados de baja probando ids.
 */
async function leerFichaPublica(id: number): Promise<FichaPublica | null> {
  const supabase = clienteFachada()
  const hoy = hoyISO()

  const [
    rComercio,
    rMarcas,
    rCategorias,
    rSubcategorias,
    rFilasCategoria,
    rPromociones,
    rTipos,
    rSucursales,
    rCiudades,
    { data: imagenes },
  ] = await Promise.all([
    supabase
      .from('comercios')
      .select('*') // con `visible_publico` si la migración 20261107120000 está aplicada
      .eq('id', id)
      .eq('activo', true)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase.from('marcas').select('id, logo_url').limit(200),
    supabase.from('categorias').select('id, nombre').limit(100),
    supabase.from('subcategorias').select('id, subcategoria').limit(300),
    supabase
      .from('comercio_categorias')
      .select('categoria_id, subcategoria_id, orden')
      .eq('comercio_id', id)
      .order('orden')
      .limit(3),
    supabase
      .from('promociones')
      .select('valor, tipo_beneficio_id, activo, fecha_inicio, fecha_fin')
      .eq('comercio_id', id)
      .eq('activo', true)
      .is('deleted_at', null)
      .limit(50),
    supabase.from('tipos_beneficio').select('id, codigo').limit(100),
    supabase
      .from('sucursales')
      .select('id, nombre, direccion, ciudad_id')
      .eq('comercio_id', id)
      .eq('activo', true)
      .is('deleted_at', null)
      .order('nombre')
      .limit(50),
    supabase.from('ciudades').select('id, nombre').limit(200),
    /* La galería puede no existir en una base sin la migración: el error deja
       `data` en `null` y la ficha se pinta sin fotos, que es la verdad. */
    supabase
      .from('comercio_imagenes')
      .select('id, url, descripcion, orden')
      .eq('comercio_id', id)
      .order('orden')
      .limit(12),
  ])
  // La galería sigue tolerante (ver arriba); lo demás, si falla, lanza.
  const comercio = exigir(rComercio, 'el comercio')
  const marcas = exigir(rMarcas, 'las marcas')
  const categorias = exigir(rCategorias, 'las categorías')
  const subcategorias = exigir(rSubcategorias, 'las subcategorías')
  const filasCategoria = exigir(rFilasCategoria, 'las categorías del comercio')
  const promociones = exigir(rPromociones, 'las promociones')
  const tipos = exigir(rTipos, 'los tipos de beneficio')
  const sucursales = exigir(rSucursales, 'las sucursales')
  const ciudades = exigir(rCiudades, 'las ciudades')

  // Oculto para el Portal Público: lo mismo que si no existiera (no se distingue).
  if (!comercio || !leerVisibilidad(comercio).publico) return null

  const nombreCiudad = new Map((ciudades ?? []).map((c) => [c.id, c.nombre]))
  const codigoTipo = new Map((tipos ?? []).map((t) => [t.id, t.codigo]))
  const logoMarca = comercio.marca_id
    ? ((marcas ?? []).find((m) => m.id === comercio.marca_id)?.logo_url ?? null)
    : null

  /* Tolerante, como la galería: sin la tabla, la ficha se pinta sin horario. */
  const horarios = await leerHorariosDeSucursales(
    supabase,
    (sucursales ?? []).map((s) => s.id),
  )

  const sedes: SedePublica[] = (sucursales ?? []).map((s) => ({
    id: s.id,
    nombre: (s.nombre ?? '').trim() || null,
    direccion: (s.direccion ?? '').trim() || null,
    ciudadNombre: nombreCiudad.get(s.ciudad_id) ?? null,
    horario: horarios.get(s.id) ?? [],
  }))

  /* Dos promociones con el mismo valor se anunciarían dos veces con el mismo
     texto: el `Set` las funde. */
  const beneficios = Array.from(
    new Set(
      (promociones ?? [])
        .filter((p) => esPromocionVigente(p.activo, p.fecha_inicio, p.fecha_fin, hoy))
        .flatMap((p) => {
          const codigo = codigoTipo.get(p.tipo_beneficio_id)
          return codigo ? [formatearBeneficio(codigo, p.valor)] : []
        }),
    ),
  )

  const categoriasDeFicha: CategoriaDeComercio[] = (filasCategoria ?? []).flatMap((f) => {
    const nombre = (categorias ?? []).find((c) => c.id === f.categoria_id)?.nombre
    if (nombre === undefined) return []
    return [
      {
        categoriaId: f.categoria_id,
        categoriaNombre: nombre.trim(),
        subcategoriaId: f.subcategoria_id,
        subcategoriaNombre: f.subcategoria_id
          ? ((subcategorias ?? []).find((s) => s.id === f.subcategoria_id)?.subcategoria.trim() ??
            null)
          : null,
      },
    ]
  })

  const fotos: FotoPublica[] = (imagenes ?? []).flatMap((i) => {
    const url = (i.url ?? '').trim()
    /* Vacío = decorativa, como dice el propio tipo. Nunca el nombre del
       archivo, que un lector de pantalla deletrearía. */
    return url ? [{ url, alt: (i.descripcion ?? '').trim() }] : []
  })

  return {
    id: comercio.id,
    nombre: comercio.nombre,
    descripcion: comercio.descripcion,
    categorias: categoriasDeFicha,
    logoUrl: resolverLogoComercio(comercio.logo_url, logoMarca),
    portadaUrl: (comercio.portada_url ?? '').trim() || null,
    ciudades: Array.from(new Set(sedes.flatMap((s) => (s.ciudadNombre ? [s.ciudadNombre] : [])))),
    sedes,
    beneficios,
    fotos,
    indexable: comercio.indexable,
  }
}

// El `id` entra en la clave de caché automáticamente (argumentos de la función).
const fichaEnCache = unstable_cache(
  (id: number) => circuito.ejecutar(`ficha-${id}`, () => leerFichaPublica(id)),
  ['publico-ficha'],
  OPCIONES_CACHE,
)
export const obtenerFichaPublica = cache((id: number) =>
  conRespaldo(() => fichaEnCache(id), null, `la ficha ${id}`),
)

/**
 * Los comercios cuya ficha puede salir en buscadores, para el sitemap.
 * Solo `id` y la fecha de última edición: nada más se publica ahí.
 */
export async function obtenerComerciosIndexables(): Promise<{ id: number; actualizado: string }[]> {
  const supabase = clienteFachada()
  const consultar = (conVisibilidad: boolean) => {
    const q = supabase
      .from('comercios')
      .select('id, updated_at')
      .eq('activo', true)
      .eq('indexable', true)
      .is('deleted_at', null)
    // Un comercio oculto del Portal Público no se anuncia a los buscadores.
    return (conVisibilidad ? q.eq('visible_publico', true) : q).order('id').limit(TOPE_DIRECTORIO)
  }
  const con = await consultar(true)
  const { data } = faltaColumnaVisibilidad(con.error) ? await consultar(false) : con
  return (data ?? []).map((c) => ({ id: c.id, actualizado: c.updated_at }))
}

/* ==========================================================================
   LOS PLANES
   ========================================================================== */

/**
 * Los planes de membresía que se venden hoy, ya con el ahorro calculado.
 *
 * Solo planes activos y no borrados: uno retirado no se anuncia en la puerta.
 */
async function leerPlanesPublicos(): Promise<PlanPublico[]> {
  const supabase = clienteFachada()
  const data = exigir(
    await supabase
      .from('planes_membresia')
      .select('id, nombre, descripcion, precio, duracion_meses')
      .eq('activo', true)
      .is('deleted_at', null)
      .limit(20),
    'los planes',
  )

  /* `numeric` puede llegar como cadena según la versión de PostgREST: se
     normaliza aquí para que la función pura trabaje siempre con números. */
  return prepararPlanes((data ?? []).map((p) => ({ ...p, precio: Number(p.precio) })))
}

const planesEnCache = unstable_cache(
  () => circuito.ejecutar('planes', leerPlanesPublicos),
  ['publico-planes'],
  OPCIONES_CACHE,
)
export const obtenerPlanesPublicos = cache(() =>
  conRespaldo(() => planesEnCache(), [] as PlanPublico[], 'los planes'),
)

/**
 * El WhatsApp de soporte, de `configuracion.whatsapp_soporte`.
 *
 * Devuelve `null` si la fila no existe o está vacía, y **eso no puede romper
 * la landing**: la spec lo trata como dato obligatorio del lanzamiento, pero
 * un clon recién hecho no lo tiene y la fachada tiene que seguir siendo
 * navegable. Quien llama decide qué ocultar (SPEC §5.2).
 */
async function leerWhatsappSoporte(): Promise<string | null> {
  const supabase = clienteFachada()

  const resultado = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'whatsapp_soporte')
    .maybeSingle()
  const data = exigir(resultado, 'el WhatsApp de soporte')

  const valor = (data?.valor ?? '').trim()
  return valor === '' ? null : valor
}

const whatsappEnCache = unstable_cache(
  () => circuito.ejecutar('whatsapp', leerWhatsappSoporte),
  ['publico-whatsapp'],
  OPCIONES_CACHE,
)
export const obtenerWhatsappSoporte = cache(() =>
  conRespaldo(() => whatsappEnCache(), null as string | null, 'el WhatsApp de soporte'),
)

/* ==========================================================================
   LAS NOVEDADES PÚBLICAS
   ========================================================================== */

/**
 * Las novedades de la fachada. La consulta es la misma que usa el portal de
 * socios (`obtenerAnunciosVisibles`), pero aquí va con el cliente de servicio
 * y detrás del mismo caché (300 s desde el 06/11/2026) que el resto de la fachada.
 */
const anunciosEnCache = unstable_cache(
  () => obtenerAnunciosVisibles(clienteFachada(), 'publico'),
  ['publico-anuncios'],
  OPCIONES_CACHE,
)
export const obtenerAnunciosPublicos = cache(() => anunciosEnCache())

/**
 * El instante actual, según el reloj del SERVIDOR.
 *
 * Lo usa la comprobación anti-robot del formulario de aliados: el reloj del
 * visitante puede ir mal o estar manipulado, así que el único con el que se
 * puede comparar «cuánto tardó en rellenarlo» es este.
 *
 * Es `async` a propósito, aunque no espere nada. `Date.now()` es impuro y
 * llamarlo en el cuerpo de un componente es leerlo *durante el render*, que es
 * justo lo que la regla `react-hooks/purity` prohíbe —y con razón: en un
 * componente que se reevalúe, el valor cambiaría solo—. Pedirlo con `await` lo
 * saca del render y lo deja donde debe estar: en la capa de datos, junto a las
 * demás lecturas que hace la página.
 *
 * Deliberadamente SIN `cache()`: dos formularios pintados en la misma petición
 * pueden compartir instante sin problema, pero congelarlo entre peticiones
 * rompería la comprobación entera.
 */
export async function obtenerInstanteServidor(): Promise<number> {
  return Date.now()
}
