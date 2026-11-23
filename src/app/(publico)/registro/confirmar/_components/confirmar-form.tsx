'use client'

import { useActionState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { confirmarCorreoRegistro, type EstadoConfirmacion } from '../actions'

const INICIAL: EstadoConfirmacion = { estado: 'pendiente' }

/**
 * El enlace solo se canjea al pulsar el botón. Abrir la página no gasta el
 * token: un escáner de correo que visite el enlace no lo consume.
 */
export function ConfirmarForm({ tokenHash, tipo }: { tokenHash: string; tipo: 'signup' | 'magiclink' }) {
  // Al confirmar, la acción lleva a «Completa tu membresía» (el paso del pago).
  const [estado, accion, cargando] = useActionState(confirmarCorreoRegistro, INICIAL)

  if (!tokenHash) {
    return (
      <Alert tone="warning" title="El enlace no está completo">
        {'El enlace venció o ya se usó. Entra con tu correo y tu contraseña para continuar.'}
      </Alert>
    )
  }

  return (
    <form action={accion}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={tipo} />

      {(estado.estado === 'invalido' || estado.estado === 'error') && (
        <Alert tone="warning" title="No pudimos confirmar tu correo">
          {estado.mensaje}
        </Alert>
      )}

      <Button
        type="submit"
        variant="brand"
        size="lg"
        pildora
        fullWidth
        loading={cargando}
        icon={<ShieldCheck size={17} />}
      >
        Confirmar mi correo
      </Button>
    </form>
  )
}
