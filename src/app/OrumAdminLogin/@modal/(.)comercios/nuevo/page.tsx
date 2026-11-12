import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { cargarCategoriasConSubcategorias } from '@/lib/comercios/categorias-admin'
import { ComercioForm } from '@/app/OrumAdminLogin/comercios/_components/comercio-form'

export default async function NuevoComercioInterceptado() {
  await requireRol('super_admin')

  const admin = createAdminClient()
  const categorias = await cargarCategoriasConSubcategorias(admin)

  return (
    <OverlayRuta
      title="Crear comercio"
      description="Se crea el comercio y su cuenta de acceso a la herramienta de ventas."
      width="640px"
    >
      <ComercioForm categorias={categorias} />
    </OverlayRuta>
  )
}