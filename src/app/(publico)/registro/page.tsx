import { PantallaAcceso } from '@/components/ui/pantalla-acceso'
import { formatearPesos } from '@/lib/publico/planes'
import { createAdminClient } from '@/lib/supabase/admin'
import { FormularioRegistro, type PlanRegistro } from './_components/formulario-registro'

/*
  Página TEMPORAL del registro. La regla del proyecto dice que un formulario se
  abre encima, como overlay desde la sección de precios; ese contenedor aún no
  existe. Cuando exista, `FormularioRegistro` se monta dentro de él y esta
  página se retira.
*/

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan: idTexto } = await searchParams
  const id = Number(idTexto)

  const admin = createAdminClient()
  const { data: plan } =
    Number.isInteger(id) && id > 0
      ? await admin
          .from('planes_membresia')
          .select('id, nombre, precio, duracion_meses')
          .eq('id', id)
          .eq('activo', true)
          .is('deleted_at', null)
          .maybeSingle()
      : { data: null }

  return (
    <PantallaAcceso
      puerta="activar"
      titular="Crea tu cuenta y elige tu membresía"
      apoyo="Son unos datos y un pago. Tu número de socio llega cuando el pago se confirma."
    >
      {plan ? (
        <FormularioRegistro
          plan={{
            id: plan.id,
            nombre: plan.nombre,
            precioTexto: formatearPesos(Number(plan.precio)),
            duracionMeses: plan.duracion_meses,
          } satisfies PlanRegistro}
        />
      ) : (
        <p>Ese plan no está disponible. Elige otro desde la página de precios.</p>
      )}
    </PantallaAcceso>
  )
}
