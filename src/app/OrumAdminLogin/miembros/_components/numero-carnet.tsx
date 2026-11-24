'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react'
import { Check, CreditCard, Search } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  buscarNumeros,
  numerosCoinciden,
  pareceTextoPegado,
  soloCifras,
} from '@/lib/miembros/numeros-registro'
import estilos from './numero-carnet.module.css'

/*
  EL NÚMERO DEL CARNÉ, CON DOBLE VERIFICACIÓN  ·  (24/11/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: al registrar un miembro, el número se elegía de
  una lista larga con el PRIMERO ya marcado, y a veces el carné entregado no
  era el del número registrado. Ahora:

    1. Una advertencia pide tener a la mano la tarjeta que se va a entregar.
    2. El número se BUSCA escribiéndolo: la lista de números libres se filtra
       al teclear (los que empiezan así primero; «12345» encuentra
       «00012345»). Nada sale elegido de antemano. Si se escribe el número
       completo y está libre, queda elegido; si no está libre, lo dice.
    3. Debajo, se escribe OTRA VEZ mirando la tarjeta. Los dos tienen que
       coincidir; el formulario no se envía si no, y el servidor lo vuelve a
       comprobar.

  NI COPIAR NI PEGAR en este apartado (24/11/2026: «no quiero que el
  usuario pueda copiar y pegar»): copiar el elegido y pegarlo abajo dejaría
  la segunda verificación sin sentido. Se cierra por cuatro lados, porque
  cada uno deja pasar algo que los otros no:
    · `copy`/`cut`/`paste`/`drop` en todo el bloque (ratón, teclado y el
      menú del botón derecho);
    · `beforeinput` con `insertFromPaste`/`insertFromDrop` en cada campo
      (lo que algunos navegadores insertan sin disparar `paste`);
    · y si aun así entran DOS cifras o más de golpe —el portapapeles del
      teclado del teléfono las mete como si se tecleasen— se rechazan
      (`pareceTextoPegado`): tecleando, llegan de una en una.
  Al intentarlo, la ayuda de los dos campos lo dice (y se anuncia).

  El combobox sigue el patrón de ARIA (`role="combobox"` + `listbox`, con
  `aria-activedescendant`): flechas para moverse, Intro para elegir, Escape
  para cerrar. La lista va EN EL FLUJO, no flotando: dentro de la ventana
  del formulario no la recorta nada, y en el teléfono empuja el contenido.

  El valor viaja en un campo oculto (`numero_registro`) que avisa con un
  `input` que burbujea, como `SelectMenu`: así lo oye `useValidacion`.
*/

type Props = {
  /** Los números libres del pozo, en orden. */
  numeros: string[]
  /** El error de cada campo (de `useValidacion`). */
  error: (campo: string) => string | null
}

export function NumeroCarnet({ numeros, error }: Props) {
  const [consulta, setConsulta] = useState('')
  const [elegido, setElegido] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const [repetido, setRepetido] = useState('')
  const [sinCopiar, setSinCopiar] = useState(false)
  const idLista = useId()
  const oculto = useRef<HTMLInputElement>(null)
  const montado = useRef(false)
  const bloque = useRef<HTMLDivElement>(null)

  /** Cualquier intento de copiar, cortar, pegar o soltar: no, y se dice. */
  function bloquear(e: SyntheticEvent | Event) {
    e.preventDefault()
    setSinCopiar(true)
  }

  // Lo que el navegador inserta «pegando» sin disparar `paste`. `beforeinput`
  // burbujea: basta con escucharlo en el bloque, para los dos campos.
  useEffect(() => {
    const alInsertar = (e: InputEvent) => {
      if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop' || e.inputType === 'insertFromYank') {
        e.preventDefault()
        setSinCopiar(true)
      }
    }
    const el = bloque.current
    el?.addEventListener('beforeinput', alInsertar)
    return () => el?.removeEventListener('beforeinput', alInsertar)
  }, [])

  // El campo oculto avisa al formulario cuando cambia (no al montar).
  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      return
    }
    oculto.current?.dispatchEvent(new Event('input', { bubbles: true }))
  }, [elegido])

  const { numeros: sugerencias, total } = buscarNumeros(numeros, consulta)
  const noLibre = consulta.length === 8 && !numeros.includes(consulta)
  const coinciden = numerosCoinciden(elegido, repetido)
  const noCoincide = repetido.length === 8 && elegido !== '' && !coinciden

  function elegir(numero: string) {
    setElegido(numero)
    setConsulta(numero)
    setAbierto(false)
  }

  function escribir(texto: string) {
    // Dos cifras o más de golpe: vienen del portapapeles, no del teclado.
    if (pareceTextoPegado(consulta, texto)) {
      setSinCopiar(true)
      return
    }
    const cifras = soloCifras(texto)
    setConsulta(cifras)
    setActivo(0)
    // El número completo y libre queda elegido; cualquier otra cosa, no.
    if (cifras.length === 8 && numeros.includes(cifras)) {
      setElegido(cifras)
      setAbierto(false)
    } else {
      setElegido('')
      setAbierto(true)
    }
  }

  function alTeclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!abierto) setAbierto(true)
      else setActivo((i) => Math.min(i + 1, sugerencias.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && abierto && !elegido) {
      // Con la lista abierta, Intro elige; no envía el formulario.
      e.preventDefault()
      if (sugerencias[activo]) elegir(sugerencias[activo])
    } else if (e.key === 'Escape' && abierto) {
      // Cierra la lista, no la ventana.
      e.preventDefault()
      e.stopPropagation()
      setAbierto(false)
    }
  }

  const mostrarLista = abierto && !elegido
  const idActivo = mostrarLista && sugerencias[activo] ? `${idLista}-${activo}` : undefined

  // Con las flechas, la señalada se queda a la vista dentro de la lista.
  useEffect(() => {
    if (idActivo) document.getElementById(idActivo)?.scrollIntoView({ block: 'nearest' })
  }, [idActivo])

  return (
    <div
      ref={bloque}
      className={estilos.bloque}
      onCopy={bloquear}
      onCut={bloquear}
      onPaste={bloquear}
      onDrop={bloquear}
      onDragStart={bloquear}
    >
      <Alert tone="warning" title="Revisa la tarjeta antes de registrar">
        Ten en la mano el carné que vas a entregar. El número que elijas aquí tiene que ser
        exactamente el que está impreso en esa tarjeta.
      </Alert>

      <Field
        label="Número de registro"
        help={
          sinCopiar
            ? AVISO_SIN_COPIAR
            : 'Escribe el número del carné y elígelo en la lista de números libres.'
        }
        error={error('numero_registro')}
      >
        <div className={estilos.combo} data-campo="">
          <input ref={oculto} type="hidden" name="numero_registro" value={elegido} />
          <Input
            role="combobox"
            aria-expanded={mostrarLista}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={idActivo}
            numeric
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            maxLength={12}
            placeholder="Buscar número…"
            startIcon={<Search size={16} />}
            value={consulta}
            onChange={(e) => escribir(e.target.value)}
            onKeyDown={alTeclear}
            onFocus={() => setAbierto(true)}
            onClick={() => setAbierto(true)}
            onBlur={() => setAbierto(false)}
          />

          <div className={estilos.panel} hidden={!mostrarLista}>
            <ul id={idLista} role="listbox" aria-label="Números libres" className={estilos.lista} data-barra="">
              {sugerencias.map((n, i) => (
                <li
                  key={n}
                  id={`${idLista}-${i}`}
                  role="option"
                  aria-selected={i === activo}
                  className={estilos.opcion}
                  data-activo={i === activo ? '' : undefined}
                  // No le roba el foco al campo: el teclado del teléfono no se cierra.
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => elegir(n)}
                  onPointerEnter={() => setActivo(i)}
                >
                  <Resaltado numero={n} consulta={consulta} />
                </li>
              ))}
            </ul>
            {sugerencias.length === 0 && (
              <p className={estilos.vacio}>
                {noLibre
                  ? `El ${consulta} no está libre: ya lo tiene otro miembro o no se ha cargado.`
                  : 'Ningún número libre coincide con lo escrito.'}
              </p>
            )}
            {total > sugerencias.length && (
              <p className={estilos.mas}>
                Hay {total - sugerencias.length} más. Sigue escribiendo para encontrarlo.
              </p>
            )}
          </div>
        </div>
      </Field>

      <Field
        label="Escribe otra vez el número"
        help={
          sinCopiar
            ? AVISO_SIN_COPIAR
            : 'Míralo en la tarjeta y escríbelo a mano. Los dos números tienen que coincidir.'
        }
        error={
          error('numero_confirmacion') ??
          (noCoincide ? 'No coincide con el número elegido. Revisa la tarjeta.' : null)
        }
      >
        <Input
          name="numero_confirmacion"
          numeric
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={8}
          placeholder="8 cifras"
          startIcon={<CreditCard size={16} />}
          value={repetido}
          onChange={(e) => {
            if (pareceTextoPegado(repetido, e.target.value)) {
              setSinCopiar(true)
              return
            }
            setRepetido(soloCifras(e.target.value))
          }}
        />
      </Field>

      <p role="status" className={estilos.oculto}>
        {sinCopiar ? AVISO_SIN_COPIAR : ''}
      </p>

      <p role="status" className={coinciden ? estilos.coinciden : estilos.oculto}>
        {coinciden && (
          <>
            <Check size={16} strokeWidth={2.6} aria-hidden="true" />
            Los dos números coinciden. Entrega el carné {elegido}.
          </>
        )}
      </p>
    </div>
  )
}

const AVISO_SIN_COPIAR = 'Aquí no se puede copiar ni pegar: escribe el número mirando la tarjeta.'

/** El número con la parte buscada en negrita. */
function Resaltado({ numero, consulta }: { numero: string; consulta: string }) {
  const i = consulta ? numero.indexOf(consulta) : -1
  if (i < 0) return <>{numero}</>
  return (
    <>
      {numero.slice(0, i)}
      <strong className={estilos.coincidencia}>{numero.slice(i, i + consulta.length)}</strong>
      {numero.slice(i + consulta.length)}
    </>
  )
}
