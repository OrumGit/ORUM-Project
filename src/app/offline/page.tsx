import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/feedback'
import styles from './offline.module.css'

export const metadata = { title: 'Sin conexión · ORUM' }

/**
 * Pantalla que sirve el service worker cuando falla la red.
 *
 * Vive fuera de `/OrumAdminLogin` a propósito: no puede depender de la sesión ni de
 * ninguna consulta, porque justo entonces no hay conexión con Supabase. Se
 * precarga en la instalación del SW.
 */
export default function OfflinePage() {
  return (
    <div className={styles.pantalla} data-theme="dark">
      <div className={styles.contenido}>
        <span className={styles.wordmark}>ORUM</span>

        <EmptyState
          icon={<WifiOff aria-hidden="true" />}
          title="Sin conexión"
          description="No pudimos conectarnos. Revisa tu red e inténtalo de nuevo; los datos de los miembros necesitan conexión para consultarse."
          actions={
            <Button href="/OrumAdminLogin" variant="secondary">
              Reintentar
            </Button>
          }
        />
      </div>
    </div>
  )
}
