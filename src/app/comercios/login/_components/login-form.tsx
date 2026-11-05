'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, InputButton } from '@/components/ui/input'
import { estilosAuth } from '@/components/ui/pantalla-auth'
import { Turnstile, useTurnstile } from '@/components/ui/turnstile'
import { iniciarSesionComercio, type LoginComercioState } from '../actions'

const estadoInicial: LoginComercioState = {}

export function LoginComercioForm({ mensajeInicial }: { mensajeInicial?: string }) {
  const turnstile = useTurnstile()
  const [state, formAction, pending] = useActionState(iniciarSesionComercio, estadoInicial)
  const [verPassword, setVerPassword] = useState(false)

  const error = state.error ?? mensajeInicial

  return (
    <form action={formAction} className={estilosAuth.formulario} noValidate>
      {/*
        Igual que los otros dos accesos: la sacudida la dispara el CSS con
        `:has(.alerta)`. Sin `key` en el <form>, para no remontarlo y borrar
        el correo ya escrito tras cada fallo.
      */}
      {error && (
        <Alert key={error} tone="danger" className={estilosAuth.alerta}>
          {error}
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

      <Field label="Contraseña">
        <Input
          name="password"
          type={verPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          endAdornment={
            <InputButton
              label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setVerPassword((v) => !v)}
            >
              {verPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </InputButton>
          }
        />
      </Field>

      <Link href="/comercios/login/recuperar" className={estilosAuth.enlace}>
        ¿Olvidaste tu contraseña?
      </Link>

      <Turnstile {...turnstile.enlace} reiniciarAl={state} />

      {/* Relleno dorado PLANO (`brand`), nunca el barrido (`gold`): ver la
          nota del acceso de administración. */}
      <Button
        type="submit"
        variant="brand"
        size="lg"
        pildora
        fullWidth
        loading={pending}
        disabled={!turnstile.listo}
        icon={<LogIn size={17} />}
      >
        Iniciar sesión
      </Button>
    </form>
  )
}
