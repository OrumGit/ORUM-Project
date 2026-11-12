'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { CampoContrasenaNueva } from '@/components/auth/campo-contrasena-nueva'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, InputButton } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { revisarContrasena } from '@/lib/auth/contrasena-segura'
import { cambiarPassword, type PasswordState } from '../../actions'
import styles from './password-form.module.css'

const estadoInicial: PasswordState = {}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(cambiarPassword, estadoInicial)
  const { toast } = useToast()

  const [actual, setActual] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [ver, setVer] = useState(false)
  // La contraseña que se envió: el aviso del servidor sobre ella se va en
  // cuanto se escribe otra cosa.
  const [enviada, setEnviada] = useState<string | null>(null)

  const valida = revisarContrasena(password).ok

  // El éxito se anuncia con un toast y se limpian los campos: dejar la
  // contraseña escrita después de guardarla no aporta nada y la deja a la
  // vista de quien pase por detrás.
  const anunciado = useRef<PasswordState | null>(null)
  useEffect(() => {
    if (!state.ok || anunciado.current === state) return
    anunciado.current = state

    toast({
      tone: 'success',
      title: 'Contraseña actualizada',
      description: 'Úsala la próxima vez que inicies sesión.',
    })
    setActual('')
    setPassword('')
    setConfirmar('')
  }, [state, toast])

  // Solo se avisa de que no coinciden cuando ya se escribió algo en el segundo
  // campo: marcarlo desde la primera tecla sería regañar por adelantado.
  const noCoinciden = confirmar.length > 0 && password !== confirmar

  return (
    /* Sin `Card`: la superficie la pone quien usa el formulario —el overlay o
       la página—, nunca el formulario. */
    <form
      action={formAction}
      onSubmit={() => setEnviada(password)}
      className={styles.formulario}
      noValidate
    >
      {/* Los errores sin `campo` (sesión caducada, fallo del servidor) van en el
          último campo que se escribe, como hasta ahora. */}
      <Field
        label="Contraseña actual"
        error={state.campo === 'actual' ? state.error : undefined}
      >
        <Input
          name="actual"
          type={ver ? 'text' : 'password'}
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          required
          autoFocus
          endAdornment={
            <InputButton
              label={ver ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
              onClick={() => setVer((v) => !v)}
            >
              {ver ? <EyeOff size={17} /> : <Eye size={17} />}
            </InputButton>
          }
        />
      </Field>

      {/* La guía (medidor y requisitos) y lo que diga el servidor —se parece
          a tu nombre, está filtrada— viven en el campo compartido. */}
      <CampoContrasenaNueva
        label="Nueva contraseña"
        value={password}
        onChange={setPassword}
        error={state.campo !== 'actual' && enviada === password ? state.error : undefined}
        ver={ver}
      />

      <Field
        label="Confirmar nueva contraseña"
        error={noCoinciden ? 'Las contraseñas no coinciden.' : undefined}
      >
        <Input
          name="confirmar"
          type={ver ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          // El interruptor vive en el primer campo y afecta a los dos: dos
          // ojos independientes invitarían a dejar uno visible sin querer.
        />
      </Field>

      <div className={styles.acciones}>
        <Button
          type="submit"
          loading={pending}
          disabled={actual.length === 0 || !valida || noCoinciden}
          icon={<ShieldCheck size={16} />}
        >
          Cambiar contraseña
        </Button>
      </div>
    </form>
  )
}
