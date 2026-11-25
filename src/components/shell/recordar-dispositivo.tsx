'use client'

import { useEffect } from 'react'

/*
  Las sesiones que ya estaban abiertas antes del 25/11/2026 no pasaron por la
  puerta con la marca nueva (`lib/auth/marca-equipo.ts`). El layout del panel
  monta esto SOLO si al dispositivo le falta, y la acción la pone (después de
  comprobar otra vez que la cuenta es del equipo). Una vez por dispositivo:
  no pinta nada.
*/
export function RecordarDispositivo({ recordar }: { recordar: () => Promise<void> }) {
  useEffect(() => {
    recordar().catch(() => {
      // Sin red o sin sesión: lo volverá a intentar la próxima vez que se pinte el panel.
    })
  }, [recordar])
  return null
}
