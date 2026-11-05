'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { estilosAuth } from '@/components/ui/pantalla-auth'
import { Turnstile, useTurnstile } from '@/components/ui/turnstile'
import { solicitarRecuperacionMiembro, type RecuperarState } from '../actions'

const estadoInicial: RecuperarState = {}

export function RecuperarMiembroForm() {
  const turnstile = useTurnstile()
  const [state, formAction, pending] = useActionState(solicitarRecuperacionMiembro, estadoInicial)

  if (state.enviado) {
    return (
      <div className={estilosAuth.formulario}>
        <Alert tone="success" title="Revisa tu correo">
          Si el número de membresía existe, te enviamos un enlace para restablecer tu contraseña.
          Puede tardar un par de minutos; mira también en spam.
        </Alert>
        <Link href="/miembros/login" className={estilosAuth.enlace}>
          Volver a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className={estilosAuth.formulario} noValidate>
      {state.error && (
        <Alert key={state.error} tone="danger" className={estilosAuth.alerta}>
          {state.error}
        </Alert>
      )}

      <Field
        label="Número de membresía"
        help="Te enviaremos el enlace al correo con el que te registraron."
      >
        <Input
          name="numero_membresia"
          type="text"
          inputMode="numeric"
          autoComplete="username"
          placeholder="00012345"
          required
          autoFocus
        />
      </Field>

      <Turnstile {...turnstile.enlace} reiniciarAl={state} />

      {/* Dorado y en píldora, como el de iniciar sesión: las dos pantallas
          del socio comparten puerta (`PantallaAccesoSocio`). */}
      <Button
        type="submit"
        variant="brand"
        size="lg"
        pildora
        fullWidth
        loading={pending}
        disabled={!turnstile.listo}
        icon={<Mail size={17} />}
      >
        Enviar enlace
      </Button>

      <Link href="/miembros/login" className={estilosAuth.enlace}>
        Volver a iniciar sesión
      </Link>
    </form>
  )
}
