import { cache } from 'react'
import { notFound } from 'next/navigation'
import { requireMiembroVigente } from '@/lib/miembros/requerir-miembro'
import { resolverVolverAlCatalogo } from '@/lib/miembros/volver-catalogo'
import { createClient } from '@/lib/supabase/server'
import { esPromocionVigente } from '@/lib/comercios/promocion-vigente'
import { formatearBeneficio } from '@/lib/comercios/beneficios-formato'
import { cuandoUsarlo, normalizarFranjas } from '@/lib/comercios/franjas-promocion'
import { asuntoDelTitulo } from '@/lib/comercios/titulo-beneficio'
import { BeneficiosSocio, type BeneficioSocio } from '@/components/comercios/beneficios-socio'
import { AdornoEstrella } from '@/components/ui/marca/marca'
import { resolverLogoComercio } from '@/lib/comercios/logo-comercio'
import { leerHorariosDeSucursales } from '@/lib/comercios/horario-datos'
import { transicionComercio } from '@/lib/comercios/transiciones'
import { hoyISO } from '@/lib/shared/fecha'
import { detalleComercio, type CategoriaDeComercio } from '@/lib/publico/directorio'
import { FichaComercio, type SedeFicha } from '@/components/comercios/ficha-comercio'
import estilos from '@/components/comercios/ficha-comercio.module.css'
import { obtenerResenasParaSocio, puedoResenar } from '@/lib/resenas/datos'
import { SeccionResenas } from '@/components/resenas/seccion-resenas'
import { BotonMostrarCarnet } from '../../_components/boton-carnet'

/*
  FICHA DE COMERCIO DEL SOCIO — el MISMO componente en dos superficies.

  Desde el directorio se abre encima, en la ranura `@modal` del portal
  (`enOverlay`). Por enlace directo —WhatsApp, un buscador, recargar— se pinta
  a pantalla completa.

  DESDE EL 30/09/2026 ES LA FICHA PÚBLICA (`FichaComercio`), por encargo del
  propietario: «quiero que sea igual». Cambia solo lo que es del socio: el
  beneficio se LEE (en la pública va desenfocado) y la acción principal es
  «Mostrar mi carnet», que abre el carnet encima sin salir de la ficha.

  Server Component. El cliente es el visor de imágenes y el botón del carnet.
*/

/** Id numérico de la URL, o `null`. Entrada no confiable: llega de la ruta. */
function idOnulo(valor: string): number | null {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : null
}

type Hero = {
  id: number
  nombre: string
  descripcion: string | null
  categorias: CategoriaDeComercio[]
  logoUrl: string | null
}

/**
 * El comercio y su categoría. `cache()` memoiza DENTRO de la petición, para
 * que `generateMetadata` y la página compartan una sola consulta.
 *
 * Devuelve `null` en los TRES casos fatales —no existe, `activo === false`,
 * `deleted_at` no nulo— sin distinguirlos: distinguirlos permitiría enumerar
 * comercios inactivos probando ids.
 */
const cargarComercio = cache(async (id: number): Promise<Hero | null> => {
  // `createClient()`, NUNCA el de administración: los portales de usuario
  // final no saltan RLS.
  const supabase = await createClient()

  const [
    { data: comercio },
    { data: marcas },
    { data: categorias },
    { data: subcategorias },
    { data: filasCategoria },
  ] = await Promise.all([
    supabase
      .from('comercios')
      .select('id, nombre, descripcion, marca_id, logo_url')
      .eq('id', id)
      .eq('activo', true)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase.from('marcas').select('id, nombre, logo_url').limit(100),
    supabase.from('categorias').select('id, nombre').limit(100),
    supabase.from('subcategorias').select('id, subcategoria').limit(300),
    supabase
      .from('comercio_categorias')
      .select('categoria_id, subcategoria_id, orden')
      .eq('comercio_id', id)
      .order('orden')
      .limit(3),
  ])

  if (!comercio) return null

  const marca = comercio.marca_id
    ? ((marcas ?? []).find((m) => m.id === comercio.marca_id) ?? null)
    : null
  const categoriasDelComercio: CategoriaDeComercio[] = (filasCategoria ?? []).flatMap((f) => {
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

  return {
    id: comercio.id,
    nombre: comercio.nombre,
    descripcion: comercio.descripcion,
    categorias: categoriasDelComercio,
    // La misma cadena comercio -> marca -> inicial que usa el directorio.
    logoUrl: resolverLogoComercio(comercio.logo_url, marca?.logo_url ?? null),
  }
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numero = idOnulo(id)
  const comercio = numero ? await cargarComercio(numero) : null
  // El mismo título para los tres casos fatales: no se filtra por la pestaña
  // lo que la página calla.
  return { title: comercio ? `${comercio.nombre} · ORUM` : 'Comercio no disponible · ORUM' }
}

export default async function FichaComercioPage({
  params,
  searchParams,
  enOverlay = false,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ volver?: string | string[] }>
  enOverlay?: boolean
}) {
  /*
    SIN EXCEPCIÓN, y antes de leer nada. Un socio con la membresía vencida no
    puede ver la ficha de un beneficio que no puede usar: sería prometer en la
    pantalla lo que la caja del comercio va a denegar.
  */
  await requireMiembroVigente()

  const [{ id }, paramsCrudos] = await Promise.all([params, searchParams])

  const numero = idOnulo(id)
  if (numero === null) notFound()

  const supabase = await createClient()
  /* Fecha civil 'YYYY-MM-DD' en America/Bogota: con UTC, una promoción que
     vence hoy dejaría de verse desde las 7pm hora Colombia. */
  const hoy = hoyISO()

  // Todas independientes: arrancan a la vez.
  const [
    comercio,
    { data: promociones },
    { data: tipos },
    { data: sucursales },
    { data: ciudades },
    { data: imagenesCrudas },
    { data: portada },
    resenas,
    puedeResenar,
  ] = await Promise.all([
    cargarComercio(numero),
    supabase
      .from('promociones')
      // `*`: trae `franjas_horarias` si la migración está aplicada, y no falla si no.
      .select('*')
      .eq('comercio_id', numero)
      .eq('activo', true)
      .is('deleted_at', null)
      .order('titulo')
      .limit(100),
    supabase.from('tipos_beneficio').select('id, codigo').limit(100),
    supabase
      .from('sucursales')
      .select('id, nombre, direccion, telefono, ciudad_id')
      .eq('comercio_id', numero)
      .eq('activo', true)
      .is('deleted_at', null)
      .order('nombre')
      .limit(100),
    supabase.from('ciudades').select('id, nombre').limit(100),
    /* Si la tabla de la galería no existiera, `data` llega en `null` y se
       trata como «sin fotos»: nunca tumba la ficha. */
    supabase
      .from('comercio_imagenes')
      .select('id, url, descripcion, orden')
      .eq('comercio_id', numero)
      .order('orden')
      .limit(24),
    /* La portada va APARTE: si su columna faltara, pedirla en la consulta que
       decide si el comercio EXISTE convertiría eso en un 404. */
    supabase.from('comercios').select('portada_url').eq('id', numero).maybeSingle(),
    /* Con la sesión del socio (funciones SQL, nunca el cliente de
       administración). Si fallan o la tabla no existe, la sección no se pinta. */
    obtenerResenasParaSocio(numero),
    puedoResenar(numero),
  ])

  if (!comercio) notFound()

  /* La portada es la que el comercio eligió; si no eligió, su primera foto,
     que se retira de la galería para no enseñarla dos veces seguidas. */
  const galeriaCompleta = (imagenesCrudas ?? []).map((i) => ({
    url: i.url,
    alt: i.descripcion ?? '',
  }))
  const portadaUrl = portada?.portada_url ?? galeriaCompleta[0]?.url ?? null
  const fotos = portada?.portada_url ? galeriaCompleta : galeriaCompleta.slice(1)

  const codigoTipo = new Map((tipos ?? []).map((t) => [t.id, t.codigo]))
  const nombreCiudad = new Map((ciudades ?? []).map((c) => [c.id, c.nombre]))

  /* SOLO PROMOCIONES VIGENTES, con el mismo criterio que el directorio: una
     ficha que anunciara un beneficio caducado prometería lo que la caja
     rechaza. */
  const beneficios: BeneficioSocio[] = (promociones ?? [])
    .filter((p) => esPromocionVigente(p.activo, p.fecha_inicio, p.fecha_fin, hoy))
    .flatMap((p) => {
      const tipoCodigo = codigoTipo.get(p.tipo_beneficio_id)
      if (!tipoCodigo) return []
      const valor = formatearBeneficio(tipoCodigo, p.valor)
      const franjas = normalizarFranjas(p.franjas_horarias)
      return [
        {
          id: p.id,
          tipo: tipoCodigo,
          // El titular: «10% de descuento · Brunch» (sin repetir el valor).
          valor,
          asunto: asuntoDelTitulo(valor, p.titulo),
          descripcion: p.descripcion,
          // CUÁNDO, lo que el socio necesita saber antes de ir: los días
          // enteros con sus horas completas (o «Todo el día»).
          cuando: cuandoUsarlo(p.dias_semana, franjas),
          dias: p.dias_semana,
          franjas,
          restricciones: p.restricciones,
        },
      ]
    })

  /* Con la sesión del socio (la política deja ver solo sucursales activas de
     comercios activos). Si la tabla no existe, llega vacío y no se dice nada. */
  const horarios = await leerHorariosDeSucursales(
    supabase,
    (sucursales ?? []).map((s) => s.id),
  )

  const sedes: SedeFicha[] = (sucursales ?? []).map((s) => ({
    id: s.id,
    nombre: (s.nombre ?? '').trim() || null,
    direccion: s.direccion,
    telefono: s.telefono,
    ciudadNombre: nombreCiudad.get(s.ciudad_id) ?? null,
    horario: horarios.get(s.id) ?? [],
  }))

  const ciudadesDelComercio = Array.from(
    new Set(sedes.map((s) => s.ciudadNombre).filter((c): c is string => Boolean(c))),
  )
  const detalle = detalleComercio(comercio.categorias, ciudadesDelComercio)

  /* ENTRADA NO CONFIABLE: `?volver=` viaja en una URL que cualquiera puede
     enviar. Sin la lista blanca, el botón de vuelta sería una redirección
     abierta. */
  const hrefVolver = resolverVolverAlCatalogo(paramsCrudos.volver)

  /* En overlay NO hay nombres de transición: el directorio sigue montado
     detrás y dos nombres iguales vivos a la vez anulan la transición entera. */
  const transicion = enOverlay ? undefined : transicionComercio(comercio.id)

  return (
    <FichaComercio
      nombre={comercio.nombre}
      detalle={detalle}
      logoUrl={comercio.logoUrl}
      portadaUrl={portadaUrl}
      sedes={sedes}
      descripcion={comercio.descripcion}
      fotos={fotos}
      volver={{ href: hrefVolver, texto: 'Comercios' }}
      enOverlay={enOverlay}
      transicion={transicion}
      beneficio={
        <div className={estilos.beneficioTextos}>
          <p className={estilos.beneficioEtiqueta}>
            <AdornoEstrella />
            {beneficios.length > 1 ? 'Tus beneficios ORUM' : 'Tu beneficio ORUM'}
          </p>
          {beneficios.length > 0 ? (
            /* El titular subrayado, cuándo aplica y si aplica AHORA, y las
               condiciones: `BeneficiosSocio` (28/10/2026). */
            <BeneficiosSocio beneficios={beneficios} />
          ) : (
            <p className={estilos.beneficioPronto}>
              Este aliado no tiene beneficios vigentes hoy. En cuanto publique uno, aparecerá aquí.
            </p>
          )}
        </div>
      }
      accion={<BotonMostrarCarnet className={estilos.botonOro} />}
      resenas={
        <SeccionResenas
          comercioId={comercio.id}
          comercioNombre={comercio.nombre}
          resumen={resenas}
          resenas={resenas.resenas}
          puedeResenar={puedeResenar}
          miResena={resenas.miResena}
        />
      }
    />
  )
}
