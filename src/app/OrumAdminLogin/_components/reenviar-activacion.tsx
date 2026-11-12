'use client'

import { useTransition } from 'react'
import { MailPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MenuItem } from '@/components/ui/menu'
import { useToast } from '@/components/ui/toast'
import { reenviarActivacion } from '../reenviar-activacion-actions'

/**
 * «Reenviar correo de activación» para una cuenta que aún no se ha activado.
 * Quien la use solo la pinta mientras esté pendiente: una cuenta activada
 * recupera la contraseña por su cuenta y no necesita este correo.
 *
 * `boton` va en las fichas; `menu` es una fila del menú de acciones de una
 * lista. El resultado llega siempre como aviso: el menú se cierra al pulsar y
 * no hay dónde dejar un mensaje fijo.
 */
export function ReenviarActivacion({
  perfilId,
  variante = 'boton',
  tamano,
}: {
  perfilId: string
  variante?: 'boton' | 'menu'
  tamano?: 'sm' | 'md'
}) {
  const { toast } = useToast()
  const [pendiente, iniciar] = useTransition()

  function reenviar() {
    iniciar(async () => {
      const r = await reenviarActivacion(perfilId)
      if (r.ok) {
        toast({
          title: 'Correo reenviado',
          description: `Enviamos un enlace nuevo a ${r.correo}.`,
          tone: 'success',
        })
      } else {
        toast({ title: 'No se pudo reenviar', description: r.error, tone: 'danger' })
      }
    })
  }

  if (variante === 'menu') {
    return (
      <MenuItem icon={<MailPlus size={16} />} onSelect={reenviar} disabled={pendiente}>
        Reenviar correo de activación
      </MenuItem>
    )
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size={tamano}
      icon={<MailPlus size={16} />}
      loading={pendiente}
      onClick={reenviar}
    >
      Reenviar correo de activación
    </Button>
  )
}
