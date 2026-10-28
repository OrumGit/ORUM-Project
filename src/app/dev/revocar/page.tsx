import { notFound } from 'next/navigation'
import { FormCard } from '@/components/ui/form-card'
import { PageHeader } from '@/components/ui/layout'
import { RevocarForm } from '@/app/admin/miembros/[id]/revocar/_components/revocar-form'
import portal from '@/app/miembros/(portal)/portal.module.css'

export const metadata = { title: 'Vista previa de revocar · ORUM' }

/**
 * La ventana de revocar una membresía con datos FALSOS, solo en desarrollo.
 * Enviar llama a la acción real, que sin sesión de administrador contesta
 * con un error y no toca nada.
 */
export default function VistaPreviaRevocar() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <div className={portal.portal} data-theme="light" style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <PageHeader title="Revocar membresía" description="María Fernanda Gómez" />
      <FormCard>
        <RevocarForm
          datos={{
            miembroId: 1,
            nombre: 'María Fernanda Gómez',
            membresiaId: 1,
            plan: 'Membresía anual',
            fechaFin: '2027-02-14',
            diasRestantes: 108,
          }}
        />
      </FormCard>
    </div>
  )
}
