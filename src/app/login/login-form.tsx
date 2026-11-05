'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, InputButton } from '@/components/ui/input'
import { estilosAuth } from '@/components/ui/pantalla-auth'
import { Turnstile, useTurnstile } from '@/components/ui/turnstile'
import { iniciarSesion, type LoginState } from './actions'

const estadoInicial: LoginState = {}

export function LoginForm({ mensajeInicial }: { mensajeInicial?: string }) {
  const turnstile = useTurnstile()
  const [state, formAction, pending] = useActionState(iniciarSesion, estadoInicial)
  const [verPassword, setVerPassword] = useState(false)

  const error = state.error ?? mensajeInicial

  return (
    <form action={formAction} className={estilosAuth.formulario} noValidate>
      {/*
        La sacudida la dispara el CSS con `:has(.alerta)` al aparecer este
        aviso. NO se pone `key` en el <form>: eso lo remontaría y borraría el
        correo ya escrito, obligando a teclearlo de nuevo tras cada fallo.
        Ninguna animación vale perder lo que el usuario escribió.
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
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
          required
          // El foco entra directo al primer campo: una pantalla de login sin
          // autofocus obliga a un clic que nadie quiere dar.
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

      <Turnstile {...turnstile.enlace} reiniciarAl={state} />

      {/*
        `brand` es el relleno dorado PLANO. Nunca `gold`: ese es el barrido
        metálico, y en tema claro su parada del 62% da 2,34:1 contra la tinta.
        La variante es la misma en todas las puertas.
      */}
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
