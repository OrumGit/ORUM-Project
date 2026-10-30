'use client'

import { useRef, useState, type FocusEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { CampoContrasenaNueva } from '@/components/auth/campo-contrasena-nueva'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { estilosAuth } from '@/components/ui/pantalla-auth'
import { createClient } from '@/lib/supabase/client'
import { MENSAJE_ENLACE_INVALIDO, MENSAJE_ENLACE_VENCIDO, textosActivacion } from '@/lib/auth/activacion'
import { MENSAJE_FILTRADA, revisarContrasena } from '@/lib/auth/contrasena-segura'
import { guardarContrasenaNueva, revisarAntesDeCanjear } from '../actions'

type Estado = 'listo' | 'invalido' | 'guardando'

/** A dónde entra el usuario una vez activada la cuenta. */
const DESTINO_POR_ROL: Record<string, string> = {
  staff: '/admin',
  comercio: '/comercios',
}

/**
 * A dónde se le manda cuando el enlace ya no sirve.
 *
 * Un enlace caducado sin salida es un callejón, y esta pantalla lo era: un
 * aviso rojo y nada más. No hay ninguna acción que el usuario pueda ejecutar
 * aquí que resuelva el problema, así que la salida es un enlace secundario y
 * NO una acción principal: un botón grande que no arregla nada es peor que
 * ninguno.
 */
const LOGIN_POR_ROL: Record<string, string> = {
  staff: '/login',
  comercio: '/comercios/login',
}

type Errores = {
  password?: string
  confirmar?: string
  global?: string
}

export function ActivarForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rol = searchParams.get('rol') ?? ''
  const destino = DESTINO_POR_ROL[rol] ?? '/miembros'
  const login = LOGIN_POR_ROL[rol] ?? '/miembros/login'
  // Activar una invitación o restablecer una contraseña: mismo formulario,
  // otros textos (`?modo=recuperar`).
  const textos = textosActivacion(searchParams.get('modo') ?? undefined)
  const tokenHash = searchParams.get('token_hash')
  const tipo = searchParams.get('type')

  // Sin llamada al montar: basta con que la URL traiga token_hash + type. El
  // canje real (verifyOtp) ocurre recién al enviar el formulario — ver
  // activar() — así un GET pasivo (un escaneo automático de enlaces, el
  // propio Gmail revisando el correo) no gasta el token antes de que la
  // persona lo use de verdad.
  const [estado, setEstado] = useState<Estado>(tokenHash && tipo ? 'listo' : 'invalido')
  const [errores, setErrores] = useState<Errores>({})
  const [mensajeInvalido, setMensajeInvalido] = useState(MENSAJE_ENLACE_INVALIDO)
  const [verPassword, setVerPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  // El enlace sirve UNA vez. Si ya se canjeó y el servidor rechazó la
  // contraseña (por ejemplo, se parece al nombre), el reintento solo guarda.
  const canjeado = useRef(false)

  /*
    Los dos errores de contraseña son de CLIENTE y aquí sí sabemos cuál campo
    falló, así que el mensaje va AL CAMPO —`Field` ya lo cablea con
    `aria-describedby` y `aria-invalid`— en vez de al banner global. En los
    accesos por credenciales se queda el banner porque el servidor devuelve una
    frase y no dice qué campo la causó.
  */
  async function activar(formData: FormData) {
    const nueva = String(formData.get('password') ?? '')
    const repetida = String(formData.get('confirmar') ?? '')

    // Lo que se ve ya en la guía, dicho en el campo al enviar.
    const revision = revisarContrasena(nueva)
    if (!revision.ok) {
      setErrores({ password: revision.mensaje })
      return
    }
    if (nueva !== repetida) {
      setErrores({ confirmar: 'Las contraseñas no coinciden.' })
      return
    }
    if (!tokenHash || !tipo) {
      setEstado('invalido')
      return
    }

    setErrores({})
    setEstado('guardando')

    if (!canjeado.current) {
      // Antes de gastar el enlace: lo que decide el servidor (filtraciones
      // incluidas). Un rechazo aquí no quema el enlace.
      const previa = await revisarAntesDeCanjear(nueva)
      if (!previa.ok) {
        setEstado('listo')
        setErrores({ password: previa.error })
        return
      }

      // El token se canjea justo aquí, al enviar el formulario — nunca al
      // cargar la página. Así un GET pasivo (un escaneo automático de enlaces,
      // el propio Gmail revisando el correo) no lo gasta antes de que la
      // persona lo use de verdad.
      const supabase = createClient()
      const { error: errVerify } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: tipo as 'invite' | 'recovery',
      })
      if (errVerify) {
        setMensajeInvalido(errVerify.code === 'otp_expired' ? MENSAJE_ENLACE_VENCIDO : MENSAJE_ENLACE_INVALIDO)
        setEstado('invalido')
        return
      }
      canjeado.current = true
    }

    // Con la sesión del enlace: el servidor revisa con los datos de la
    // cuenta (nombre, correo, cédula) y guarda.
    const resultado = await guardarContrasenaNueva(nueva)
    if (!resultado.ok) {
      if (resultado.sinSesion) {
        /*
          RESPALDO. El enlace se acaba de canjear en ESTE navegador, pero el
          servidor no reconoce la sesión (la cookie no llegó, o Supabase anotó
          el canje de otra forma). Antes que dejar a la persona sin poder
          entrar, se guarda como se hacía antes: desde el navegador, con la
          sesión del enlace. La contraseña ya pasó las reglas y la revisión
          de filtraciones (`revisarAntesDeCanjear`).
        */
        const { error: errUpdate } = await createClient().auth.updateUser({ password: nueva })
        if (errUpdate) {
          /*
            SESIÓN PERDIDA ENTRE INTENTOS (pestaña cerrada o dormida, sesión
            caducada tras un rechazo de contraseña). El enlace ya se gastó y
            no hay sesión con la que guardar: reintentar no puede funcionar,
            y decir «vuelve a intentarlo» dejaba a la persona en un bucle.
            Se vuelve a permitir canjear y se manda a pedir un enlace nuevo.
          */
          if (errUpdate.name === 'AuthSessionMissingError' || errUpdate.code === 'session_not_found') {
            canjeado.current = false
            setMensajeInvalido(MENSAJE_ENLACE_VENCIDO)
            setEstado('invalido')
            return
          }
          setEstado('listo')
          setErrores(
            errUpdate.code === 'weak_password'
              ? { password: MENSAJE_FILTRADA }
              : { global: 'No se pudo guardar la contraseña. Vuelve a intentarlo.' },
          )
          return
        }
        router.push(destino)
        return
      }
      setEstado('listo')
      setErrores({ password: resultado.error })
      return
    }

    router.push(destino)
  }

  /*
    La confirmación se revisa AL SALIR del campo, no solo al enviar.

    Con el teclado abierto en una pantalla de 667px, un error que aparece al
    enviar empuja el botón fuera de la vista justo cuando el usuario lo está
    buscando. Al validar en el blur, el desplazamiento ocurre mientras todavía
    mira ese campo. No se llama a `scrollIntoView`: mover la vista bajo los
    dedos de quien escribe es peor que un desplazamiento voluntario.
  */
  function revisarConfirmacion(evento: FocusEvent<HTMLInputElement>) {
    const repetida = evento.currentTarget.value
    const formulario = evento.currentTarget.form
    if (!formulario || !repetida) return

    const nueva = String(new FormData(formulario).get('password') ?? '')
    setErrores((previos) => ({
      ...previos,
      confirmar: nueva === repetida ? undefined : 'Las contraseñas no coinciden.',
    }))
  }

  if (estado === 'invalido') {
    return (
      // `pila`, no `formulario`: la sacudida es para un envío fallido. Este
      // enlace llega ya roto y sacudir al aterrizar regaña al usuario por algo
      // que no hizo.
      <div className={estilosAuth.pila}>
        <Alert tone="danger" className={estilosAuth.alerta}>
          {mensajeInvalido}
        </Alert>

        <Button href={login} variant="secondary" size="lg" pildora fullWidth>
          Ir a iniciar sesión
        </Button>
      </div>
    )
  }

  return (
    <form action={activar} className={estilosAuth.formulario} noValidate>
      {/*
        La sacudida la dispara el CSS con `:has(.alerta)`. NO se pone `key` en
        el <form>: eso lo remontaría y borraría lo ya tecleado.
      */}
      {errores.global && (
        <Alert key={errores.global} tone="danger" className={estilosAuth.alerta}>
          {errores.global}
        </Alert>
      )}

      <CampoContrasenaNueva
        label={textos.etiquetaPassword}
        value={password}
        onChange={(valor) => {
          setPassword(valor)
          // Al corregir, el aviso del servidor se va: ya no habla de esto.
          if (errores.password) setErrores((previos) => ({ ...previos, password: undefined }))
        }}
        error={errores.password ?? null}
        ver={verPassword}
        onVer={() => setVerPassword((v) => !v)}
        autoFocus
      />

      <Field label="Confirma tu contraseña" error={errores.confirmar ?? null}>
        <Input
          name="confirmar"
          type={verPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          // Controlado, como el de la contraseña: un formulario con `action`
          // vacía al volver los campos no controlados, y un rechazo del
          // servidor obligaba a escribir la confirmación otra vez.
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          /*
            Con la submisión implícita, el usuario NUNCA necesita alcanzar el
            botón: envía desde el teclado. Es el arreglo real al botón que
            queda bajo el teclado en 667px, y cuesta un atributo.
          */
          enterKeyHint="done"
          onBlur={revisarConfirmacion}
        />
      </Field>

      <Button
        type="submit"
        variant="brand"
        size="lg"
        pildora
        fullWidth
        loading={estado === 'guardando'}
        icon={<ShieldCheck size={17} />}
      >
        {textos.boton}
      </Button>
    </form>
  )
}
