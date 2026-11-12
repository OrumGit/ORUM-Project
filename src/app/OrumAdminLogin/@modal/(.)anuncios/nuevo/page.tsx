import { requireRol } from '@/lib/auth/auth'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { AnuncioForm } from '@/app/OrumAdminLogin/anuncios/_components/anuncio-form'

export default async function NuevaAnuncioInterceptada() {
  await requireRol('super_admin')

  return (
    <OverlayRuta
      title="Nueva novedad"
      description="Nace publicada. Puedes retirarla después sin borrarla."
      detent="large"
      width="640px"
    >
      <AnuncioForm />
    </OverlayRuta>
  )
}
