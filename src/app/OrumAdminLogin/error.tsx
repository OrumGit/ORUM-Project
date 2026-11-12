'use client'

import { useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/feedback'

/**
 * Frontera de error del portal administrativo.
 *
 * Cubre cualquier fallo no controlado de una página o de una carga de datos.
 * Muestra qué pasó en lenguaje llano y ofrece salida: `reset()` reintenta el
 * render sin perder la sesión ni recargar toda la aplicación.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Deja rastro en la consola del servidor/navegador para poder depurar.
    // Al usuario nunca se le enseña el stack.
    console.error('[admin] error no controlado:', error)
  }, [error])

  return (
    <Card padding="none">
      <ErrorState
        title="No pudimos cargar esta pantalla"
        description="El problema puede ser temporal. Vuelve a intentarlo; si persiste, avisa al administrador."
        // `digest` identifica el error en los registros del servidor sin
        // revelar detalles internos.
        detail={error.digest ? `Referencia: ${error.digest}` : undefined}
        actions={
          <>
            <Button onClick={reset} icon={<RotateCcw size={16} />}>
              Reintentar
            </Button>
            <Button href="/OrumAdminLogin" variant="secondary">
              Volver al inicio
            </Button>
          </>
        }
      />
    </Card>
  )
}
