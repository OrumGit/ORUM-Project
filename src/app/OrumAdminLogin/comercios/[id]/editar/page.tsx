import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { cargarCategoriasConSubcategorias, cargarFilasCategoria } from '@/lib/comercios/categorias-admin'
import { EditarComercioForm } from './_components/editar-comercio-form'

export const metadata = { title: 'Editar comercio · ORUM' }

export default async function EditarComercioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRol('super_admin')
  const { id } = await params
  const comercioId = Number(id)

  const admin = createAdminClient()
  const [{ data: comercio }, categorias, filasCategoria] = await Promise.all([
    admin
      .from('comercios')
      .select('id, perfil_id, nombre, descripcion, indexable')
      .eq('id', comercioId)
      .is('deleted_at', null)
      .maybeSingle(),
    cargarCategoriasConSubcategorias(admin),
    cargarFilasCategoria(admin, comercioId),
  ])
  if (!comercio) notFound()

  // Cadena vacía y no '—': el valor va directo a un campo de formulario, y un
  // guión se enviaría como si fuera un correo real.
  let correo = ''
  if (comercio.perfil_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(comercio.perfil_id)
    correo = authUser.user?.email ?? ''
  }

  return (
    <>
      <PageHeader title="Editar comercio" description={comercio.nombre} />
      <FormCard>
        <EditarComercioForm
          comercio={{ ...comercio, correo, categorias: filasCategoria }}
          categorias={categorias}
        />
      </FormCard>
    </>
  )
}
