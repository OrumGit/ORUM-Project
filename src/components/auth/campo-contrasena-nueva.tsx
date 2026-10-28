'use client'

import { Check, Eye, EyeOff } from 'lucide-react'
import { Field } from '@/components/ui/field'
import { Input, InputButton } from '@/components/ui/input'
import {
  evaluarFortaleza,
  requisitos,
  type NivelFortaleza,
} from '@/lib/auth/contrasena-segura'
import estilos from './campo-contrasena-nueva.module.css'

/*
  EL CAMPO DE UNA CONTRASEÑA NUEVA  ·  27/10/2026
  ---------------------------------------------------------------------------
  Lo comparten las dos puertas por las que se crea una contraseña: activar
  la cuenta o restablecerla (socios, comercios y personal) y «Cambiar
  contraseña» del panel. Antes cada una tenía su propio aviso de «mínimo 8».

  Debajo del campo, SIEMPRE a la vista —NIST pide guiar, no solo rechazar—:
    · cuatro segmentos que se llenan con la fuerza de la contraseña y su
      nombre (Insegura · Aceptable · Buena · Excelente);
    · los tres requisitos con su marca, que se encienden al cumplirse.
  No se pide «una mayúscula, un número y un símbolo»: NIST prohíbe exigir
  mezclas, y lo que de verdad hace fuerte una contraseña es el largo. El
  consejo es una frase.

  Lo que el navegador no puede saber —si la contraseña está filtrada o se
  parece al nombre de quien la elige— lo dice el servidor, y llega aquí como
  `error`, en el campo. Se puede pegar y lo rellenan los gestores de
  contraseñas (`autoComplete="new-password"`).
*/

const NOMBRE_NIVEL: Record<NivelFortaleza, string> = {
  vacia: '',
  insegura: 'Insegura',
  aceptable: 'Aceptable',
  buena: 'Buena',
  excelente: 'Excelente',
}

type Props = {
  name?: string
  label: string
  value: string
  onChange: (valor: string) => void
  /** El error que devolvió el servidor (o el de enviar con algo que falta). */
  error?: string | null
  /** Mostrar la contraseña. Lo lleva quien usa el campo: afecta también a «Confirmar». */
  ver: boolean
  /** Si se pasa, el ojo vive en este campo. */
  onVer?: () => void
  autoFocus?: boolean
  /** Palabras propias que la persona no debería usar, si ya se conocen. */
  contexto?: readonly string[]
}

export function CampoContrasenaNueva({
  name = 'password',
  label,
  value,
  onChange,
  error,
  ver,
  onVer,
  autoFocus,
  contexto = [],
}: Props) {
  // Si el servidor la rechazó (filtrada, parecida al nombre), el medidor no
  // puede seguir diciendo «Aceptable»: lo que vale es su veredicto.
  const fortaleza = error
    ? { nivel: 'insegura' as const, puntuacion: 1 }
    : evaluarFortaleza(value, contexto)
  const lista = requisitos(value, contexto)

  return (
    <div className={estilos.campo}>
      <Field label={label} error={error ?? null}>
        <Input
          name={name}
          type={ver ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="none"
          endAdornment={
            onVer ? (
              <InputButton label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={onVer}>
                {ver ? <EyeOff size={17} /> : <Eye size={17} />}
              </InputButton>
            ) : undefined
          }
        />
      </Field>

      <div className={estilos.guia} data-nivel={fortaleza.nivel}>
        <div className={estilos.medidor}>
          <div className={estilos.segmentos} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={estilos.segmento} data-lleno={i < fortaleza.puntuacion || undefined} />
            ))}
          </div>
          <span className={estilos.nivel}>
            {fortaleza.nivel === 'vacia' ? (
              'Usa una frase que recuerdes'
            ) : (
              <>
                <span className="sr-only">Seguridad de la contraseña: </span>
                {NOMBRE_NIVEL[fortaleza.nivel]}
              </>
            )}
          </span>
        </div>

        <ul className={estilos.requisitos}>
          {lista.map((r) => (
            <li key={r.clave} className={estilos.requisito} data-cumple={r.cumple || undefined}>
              <span className={estilos.marca} aria-hidden="true">
                <Check size={12} strokeWidth={3} />
              </span>
              <span>
                {r.texto}
                <span className="sr-only">{r.cumple ? ': cumple' : ': falta'}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
