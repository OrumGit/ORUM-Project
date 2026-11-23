import { FormCard } from '@/components/ui/form-card'
import { PageHeader } from '@/components/ui/layout'
import { PasswordForm } from './_components/password-form'

export const metadata = { title: 'Mi contraseña · ORUM' }

/**
 * Página completa: solo se ve al llegar por enlace directo o al recargar.
 * Desde dentro del panel, el menú de la cuenta abre la versión interceptada.
 */
export default function CambiarPasswordPage() {
  // La protección la aplica el layout de /admin.
  return (
    <>
      <PageHeader
        title="Mi contraseña"
        description="Cambia tu contraseña de acceso. Deberás usar la nueva la próxima vez que inicies sesión."
      />
      <FormCard>
        <PasswordForm />
      </FormCard>
    </>
  )
}
