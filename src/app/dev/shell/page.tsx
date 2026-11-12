import { notFound } from 'next/navigation'
import { ShellPreview } from './preview'

export const metadata = {
  title: 'Vista previa del shell · ORUM',
}

/**
 * Vista previa del app shell, solo en desarrollo.
 *
 * El shell real vive en `/OrumAdminLogin`, protegido por sesión de Supabase. Aquí se
 * monta con datos falsos para poder revisar navegación, indicador activo,
 * barra inferior y paleta de comandos sin credenciales.
 */
export default function DevShellPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <ShellPreview />
}
