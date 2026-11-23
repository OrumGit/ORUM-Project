'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CodigoVerificacion } from '@/components/pago/codigo-verificacion'
import { Button } from '@/components/ui/button'
import { estilosAuth } from '@/components/ui/pantalla-auth'
import {
  confirmarCodigoRegistro,
  reenviarCodigoRegistro,
  type ConfirmarCodigoState,
  type ReenviarCodigoState,
} from '@/app/(publico)/registro/codigo-actions'

/*
  Quien se registró para pagar y no confirmó su correo entra con su
  contraseña y, en vez de un error, ve las seis casillas del código (el mismo
  paso de la ventana del registro). Al confirmar, sigue a «Completa tu
  membresía».
*/
export function ConfirmarCorreoLogin({ correo }: { correo: string }) {
  const [estado, confirmar, confirmando] = useActionState(confirmarCodigoRegistro, {
    ok: false,
  } as ConfirmarCodigoState)
  const [reenvio, reenviar, reenviando] = useActionState(reenviarCodigoRegistro, {
    enviado: false,
  } as ReenviarCodigoState)

  const router = useRouter()
  useEffect(() => {
    if (estado.ok) router.replace('/registro/completar')
  }, [estado.ok, router])

  return (
    <div className={estilosAuth.formulario}>
      <form id="form-codigo-login" action={confirmar}>
        <input type="hidden" name="correo" value={correo} />
        <CodigoVerificacion
          name="codigo"
          reinicio={estado}
          error={estado.error}
          disabled={confirmando}
          onCompleto={() =>
            (document.getElementById('form-codigo-login') as HTMLFormElement | null)?.requestSubmit()
          }
        />
      </form>
      <Button type="submit" form="form-codigo-login" variant="brand" size="lg" pildora fullWidth loading={confirmando}>
        Confirmar mi correo
      </Button>
      <form action={reenviar}>
        <input type="hidden" name="correo" value={correo} />
        <Button type="submit" variant="ghost" size="md" pildora fullWidth loading={reenviando}>
          {reenvio.enviado ? 'Te enviamos otro código' : 'Pedir otro código'}
        </Button>
      </form>
      {reenvio.error && <p role="alert">{reenvio.error}</p>}
    </div>
  )
}
