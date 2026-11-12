import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { AvatarUsuario } from './_components/avatar-usuario'
import { cargarAvatarUsuario } from './_components/datos'

export const metadata = { title: 'Avatar del usuario · ORUM' }

export default async function AvatarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin')
  const { id } = await params

  const datos = await cargarAvatarUsuario(id)
  if (!datos) notFound()

  return (
    <>
      <PageHeader title="Avatar del usuario" description={datos.nombre} />
      <FormCard>
        <AvatarUsuario
          perfilId={datos.perfilId}
          nombre={datos.nombre}
          avatarUrl={datos.avatarUrl}
        />
      </FormCard>
    </>
  )
}
