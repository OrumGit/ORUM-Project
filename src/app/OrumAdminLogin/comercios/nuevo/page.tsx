import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { cargarCategoriasConSubcategorias } from '@/lib/comercios/categorias-admin'
import { ComercioForm } from '../_components/comercio-form'

export const metadata = { title: 'Crear comercio · ORUM' }

export default async function NuevoComercioPage() {
  await requireRol('super_admin')

  const admin = createAdminClient()
  const categorias = await cargarCategoriasConSubcategorias(admin)

  return (
    <>
      <PageHeader
        title="Crear comercio"
        description="Se crea el comercio y su cuenta de acceso a la herramienta de ventas."
      />
      <FormCard><ComercioForm categorias={categorias} /></FormCard>
    </>
  )
}
