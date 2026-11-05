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
import { solicitarRecuperacionComercio, type RecuperarState } from '../actions'

const estadoInicial: RecuperarState = {}

export function RecuperarComercioForm() {
  const turnstile = useTurnstile()
  const [state, formAction, pending] = useActionState(solicitarRecuperacionComercio, estadoInicial)

  if (state.enviado) {
    return (
      <div className={estilosAuth.formulario}>
        <Alert tone="success" title="Revisa tu correo">
          Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.
          Puede tardar un par de minutos; mira también en spam.
        </Alert>
        <Link href="/comercios/login" className={estilosAuth.enlace}>
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

      <Field label="Correo electrónico">
        <Input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="comercio@ejemplo.com"
          required
          autoFocus
        />
      </Field>

      <Turnstile {...turnstile.enlace} reiniciarAl={state} />

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

      <Link href="/comercios/login" className={estilosAuth.enlace}>
        Volver a iniciar sesión
      </Link>
    </form>
  )
}
