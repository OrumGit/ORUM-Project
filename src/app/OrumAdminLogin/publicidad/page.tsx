// src/app/admin/publicidad/page.tsx
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Alert } from '@/components/ui/alert'
import { PageHeader } from '@/components/ui/layout'
import type { PiezaPublicidad } from '@/lib/publicidad/publicidad'
import { GestorPublicidad } from './_components/gestor-portada'

export const metadata = { title: 'Publicidad · ORUM' }

export default async function PublicidadPage() {
  await requireRol('super_admin')

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('publicidad')
    .select('id, imagen_url, descripcion, activo')
    .order('orden', { ascending: true })
    .order('id', { ascending: true })

  const piezas: PiezaPublicidad[] = (data ?? []).map((p) => ({
    id: p.id,
    url: p.imagen_url,
    descripcion: p.descripcion,
    activa: p.activo,
  }))

  return (
    <>
      <PageHeader
        title="Publicidad"
        description="Las imágenes del carrusel de la portada, junto a «Una red de valor que se nota». Tú decides cuáles salen y en qué orden."
      />

      {error ? (
        /* La tabla todavía no existe (falta ejecutar su archivo de
           `supabase/migrations`) o la base no respondió: se dice, en vez de
           pintar una rejilla vacía que parecería «no hay imágenes». */
        <Alert tone="danger" title="No se pudo leer la publicidad">
          Si es la primera vez que abres esta sección, falta aplicar en la base de datos el
          archivo «20261013120000_publicidad.sql». Mientras tanto, la portada sigue enseñando las
          fotos de los comercios.
        </Alert>
      ) : (
        <GestorPublicidad piezas={piezas} />
      )}
    </>
  )
}
