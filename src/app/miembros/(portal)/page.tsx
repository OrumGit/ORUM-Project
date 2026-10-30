import { requireMiembroVigente } from '@/lib/miembros/requerir-miembro'
import { obtenerDirectorioPublico } from '@/lib/publico/datos-publicos'
import { createClient } from '@/lib/supabase/server'
import { DirectorioComercios } from '@/components/comercios/directorio-comercios'
import { AvisoNovedad } from '@/components/novedades/aviso-novedad'
import { TopComerciosSocio } from '@/components/comercios/top-comercios'
import { obtenerAnunciosVisibles } from '@/lib/anuncios/consultas'
import { hayTop } from '@/lib/comercios/top-comercios'
import { leerTopComercios } from '@/lib/comercios/top-comercios-datos'

export const metadata = { title: 'Comercios y beneficios · ORUM' }

/*
  EL INICIO DEL SOCIO  ·  el directorio de `/explorar` (29/09/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «quiero que sea igual [a /explorar]; vamos a
  quitar todos los apartados existentes para que sea igual». Se retiraron
  novedades, favoritos, más recientes, el top del club y el catálogo propio:
  el Inicio es el MISMO componente que el directorio público
  (`DirectorioComercios`), con tres diferencias que hacen al socio:

    · el beneficio de cada comercio se LEE (en la fachada va desenfocado);
    · cada tarjeta lleva a la ficha del socio (`/miembros/comercios/[id]`);
    · entre el banner y los filtros va el aviso de su última novedad
      (`AvisoNovedad`, el de la portada pública), que lleva a
      `/miembros/novedades` (21/10/2026);
    · justo debajo del aviso, el «Top de comercios» (29/10/2026): los 5 mejor
      calificados y los 5 con más ventas del último mes. Ojo: el 29/09 se
      retiró «el top del club» de este Inicio; este es un encargo NUEVO y
      deliberado del propietario, no una regresión. Sin la migración
      `20261029140000_top_comercios.sql`, `leerTopComercios` devuelve `null`
      y el bloque no se pinta.

  Los datos son los del directorio público (`obtenerDirectorioPublico`): la
  misma lista de comercios activos, con su beneficio destacado. Nada de lo
  que se muestra aquí es privado del socio.
*/
export default async function MiembrosHomePage() {
  const miembro = await requireMiembroVigente()
  const supabase = await createClient()

  const [{ directorio, top }, { data: filasFavoritos }, novedades] = await Promise.all([
    /* El top se cruza con el catálogo (nombre, logo, categorías), así que
       espera al directorio —que sale de caché—; mientras tanto corren las
       otras dos lecturas. */
    obtenerDirectorioPublico().then(async (directorio) => ({
      directorio,
      top: await leerTopComercios(supabase, directorio.comercios),
    })),
    /*
      LOS FAVORITOS DEL SOCIO (30/09/2026): el corazón de cada tarjeta y el
      filtro «Favoritos». Cliente con sesión, no el de administración: la
      política RLS de `favoritos` ya limita a los del propio socio, y el `eq`
      lo repite. Si la tabla fallara, `data` llega en `null` y el socio ve
      todos los corazones vacíos, nunca una pantalla rota.
    */
    supabase
      .from('favoritos')
      .select('comercio_id')
      .eq('miembro_id', miembro.id)
      .order('created_at', { ascending: false })
      .limit(500),
    /*
      LA ÚLTIMA NOVEDAD PARA EL SOCIO (21/10/2026: «no lo veo en el portal de
      miembros»). Las que el panel marca para el Portal de Miembros, ya en su
      ventana de programación; con la sesión del socio (la política RLS
      también filtra).
    */
    obtenerAnunciosVisibles(supabase, 'miembros'),
  ])
  const favoritos = (filasFavoritos ?? []).map((f) => f.comercio_id)

  return (
    <DirectorioComercios
      base="/miembros"
      directorio={directorio}
      /* El texto le habla a quien YA es socio (29/09/2026): no «descubre
         el club», sino dónde usar lo que ya tiene. */
      titulo="Tus beneficios"
      bajada="Elige dónde usar tu membresía: muestra tu carnet en la caja y el descuento es tuyo al momento."
      socio
      favoritos={favoritos}
      aviso={
        <>
          <AvisoNovedad novedad={novedades[0] ?? null} href="/miembros/novedades" />
          {hayTop(top) && <TopComerciosSocio top={top} />}
        </>
      }
    />
  )
}
