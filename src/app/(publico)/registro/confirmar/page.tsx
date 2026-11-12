import { PantallaAcceso } from '@/components/ui/pantalla-acceso'
import { ConfirmarForm } from './_components/confirmar-form'

export default async function ConfirmarRegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>
}) {
  const { token_hash } = await searchParams

  return (
    <PantallaAcceso
      puerta="activar"
      titular="Confirma tu correo"
      apoyo="Un paso más para completar tu membresía de ORUM."
    >
      <ConfirmarForm tokenHash={token_hash ?? ''} />
    </PantallaAcceso>
  )
}
