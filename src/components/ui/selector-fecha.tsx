'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useField } from './field'
import { DropdownMenu } from './menu'
import { useInstanteAlMinuto } from '@/components/comercios/use-minuto'
import {
  acotar,
  CABECERA_SEMANA,
  compararMeses,
  dentroDeLimites,
  fechaCorta,
  fechaLarga,
  fechaPorTecla,
  mesDe,
  moverMeses,
  nombreMes,
  semanasDelMes,
  type Mes,
} from '@/lib/shared/calendario'
import campo from './select-menu.module.css'
import styles from './selector-fecha.module.css'

/*
  UN CALENDARIO CON DISEÑO  ·  12/11/2026
  ---------------------------------------------------------------------------
  Encargo del propietario, sobre «Hasta una fecha» de la cortesía: «ponle
  diseño al calendario». El `<input type="date">` abre el calendario del
  NAVEGADOR —en Chrome, un recuadro gris con el día en azul— y ese
  calendario no se puede vestir con CSS. Es el mismo caso que `SelectMenu`.

  El campo se ve como cualquier otro (la métrica de `SelectMenu`) y lo que se
  abre es la capa flotante del sitio (`DropdownMenu como="dialogo"`): el mes
  con su nombre, flechas para cambiarlo, la semana de lunes a domingo y los
  días. El elegido, en RELLENO `--gold-500` con el número en tinta (8,5:1;
  el `--gold-600` «se veía muy oscuro»); hoy, con un punto debajo y en peso
  (nunca solo el color); fuera de los límites, apagado y sin poder elegirse.
  Al apuntar un día NO hay tinte: sube 1px (regla del 29/09/2026).

  Teclado, el de las pautas de ARIA para una cuadrícula de fechas: flechas,
  Inicio/Fin, RePág/AvPág (con Mayús, un año), Intro o Espacio para elegir y
  Escape para cerrar. Un solo día es tabulable a la vez (tabindex itinerante).

  El valor viaja en un campo oculto con su `name`, 'YYYY-MM-DD', como el de
  un `<input type="date">`, y al cambiar avisa con un `input` que burbujea
  (así lo oye `useValidacion`). No valida solo: quien lo usa lo comprueba.
*/

type Props = {
  name: string
  /** El texto del `Field` que lo envuelve: forma parte del nombre accesible. */
  etiqueta: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** Límites, 'YYYY-MM-DD', incluidos. */
  min?: string
  max?: string
  placeholder?: string
}

export function SelectorFecha({
  name,
  etiqueta,
  value: controlado,
  defaultValue = '',
  onChange,
  min,
  max,
  placeholder = 'Elige un día',
}: Props) {
  const { id, describedBy, invalid } = useField()
  const [propio, setPropio] = useState(defaultValue)
  const value = controlado ?? propio
  const oculto = useRef<HTMLInputElement>(null)
  const disparador = useRef<HTMLButtonElement>(null)
  const cuadricula = useRef<HTMLTableElement>(null)
  const montado = useRef(false)

  // Hoy, en Colombia. `null` en el servidor: el calendario solo se abre en el navegador.
  const ahora = useInstanteAlMinuto()
  const hoy = ahora ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(ahora) : null

  const [abierto, setAbierto] = useState(false)
  // El día que tiene el foco del teclado y el mes que se ve.
  const [foco, setFoco] = useState<string | null>(null)
  const [mes, setMes] = useState<Mes | null>(null)
  // Hacia dónde se movió el mes: la cuadrícula entra deslizándose desde ese lado.
  const [sentido, setSentido] = useState<'antes' | 'despues' | null>(null)

  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      return
    }
    oculto.current?.dispatchEvent(new Event('input', { bubbles: true }))
  }, [value])

  /*
    El foco va al día que toca al ABRIR y al moverse con el TECLADO; no al
    cambiar de mes con las flechas de la cabecera, que se quedan con él (si
    no, el segundo clic en «Mes siguiente» caería en un día).
  */
  const enfocarDia = useRef(false)
  useEffect(() => {
    if (!abierto || !foco || !enfocarDia.current) return
    enfocarDia.current = false
    cuadricula.current?.querySelector<HTMLElement>(`[data-fecha="${foco}"]`)?.focus({ preventScroll: true })
  }, [abierto, foco, mes])

  function alAlternar(abre: boolean) {
    setAbierto(abre)
    if (!abre) return
    const inicial = acotar(value || hoy || min || '2026-01-01', min, max)
    enfocarDia.current = true
    setFoco(inicial)
    setMes(mesDe(inicial))
    setSentido(null)
  }

  /** Lleva el foco a `fecha` (dentro de los límites) y el mes con él. */
  function irA(fecha: string, conTeclado: boolean) {
    const destino = acotar(fecha, min, max)
    enfocarDia.current = conTeclado
    setFoco(destino)
    const nuevo = mesDe(destino)
    if (mes && compararMeses(nuevo, mes) !== 0) {
      setSentido(compararMeses(nuevo, mes) > 0 ? 'despues' : 'antes')
      setMes(nuevo)
    }
  }

  function elegir(fecha: string) {
    if (!dentroDeLimites(fecha, min, max)) return
    if (controlado === undefined) setPropio(fecha)
    onChange?.(fecha)
    // El panel es hermano del disparador, dentro del mismo envoltorio.
    disparador.current?.closest('[data-campo]')?.querySelector<HTMLElement>('[popover]')?.hidePopover()
    disparador.current?.focus()
  }

  function alPulsarTecla(e: KeyboardEvent<HTMLTableElement>) {
    if (!foco) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      elegir(foco)
      return
    }
    const destino = fechaPorTecla(foco, e.key, e.shiftKey)
    if (!destino) return
    e.preventDefault()
    irA(destino, true)
  }

  const minMes = min ? mesDe(min) : null
  const maxMes = max ? mesDe(max) : null
  const puedeAntes = !!mes && (!minMes || compararMeses(mes, minMes) > 0)
  const puedeDespues = !!mes && (!maxMes || compararMeses(mes, maxMes) < 0)
  const hoyElegible = !!hoy && dentroDeLimites(hoy, min, max)

  return (
    <span className={campo.envoltorio} data-campo="">
      <input ref={oculto} type="hidden" name={name} value={value} />

      <DropdownMenu
        align="start"
        como="dialogo"
        etiqueta={`${etiqueta}: elige un día`}
        className={styles.panel}
        onAlternar={alAlternar}
        trigger={
          <button
            ref={disparador}
            type="button"
            id={id || undefined}
            className={campo.control}
            aria-haspopup="dialog"
            aria-label={`${etiqueta}: ${value ? fechaLarga(value) : placeholder}`}
            aria-describedby={describedBy}
            data-invalido={invalid || undefined}
          >
            <span className={value ? campo.valor : campo.placeholder}>
              {value ? fechaCorta(value) : placeholder}
            </span>
            <CalendarDays className={styles.icono} aria-hidden="true" />
          </button>
        }
      >
        {mes && (
          <div className={styles.calendario}>
            <div className={styles.cabecera}>
              <button
                type="button"
                className={styles.flechaMes}
                onClick={() => foco && irA(moverMeses(foco, -1), false)}
                disabled={!puedeAntes}
                aria-label="Mes anterior"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <p className={styles.mes} aria-live="polite">
                {nombreMes(mes)}
              </p>
              <button
                type="button"
                className={styles.flechaMes}
                onClick={() => foco && irA(moverMeses(foco, 1), false)}
                disabled={!puedeDespues}
                aria-label="Mes siguiente"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>

            <table
              ref={cuadricula}
              key={`${mes.anio}-${mes.mes}`}
              className={styles.dias}
              data-sentido={sentido ?? undefined}
              role="grid"
              aria-label={nombreMes(mes)}
              onKeyDown={alPulsarTecla}
            >
              <thead>
                <tr>
                  {CABECERA_SEMANA.map((d) => (
                    <th key={d.nombre} scope="col" abbr={d.nombre} className={styles.diaSemana}>
                      {d.corto}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semanasDelMes(mes).map((semana, i) => (
                  <tr key={i}>
                    {semana.map((fecha, j) => {
                      if (!fecha) return <td key={j} />
                      const elegible = dentroDeLimites(fecha, min, max)
                      const elegido = fecha === value
                      /* Tabindex itinerante: solo el día con el foco entra con el
                         tabulador; a los demás se llega con las flechas (es una
                         cuadrícula, no una lista de botones sueltos). */
                      const tabulable = fecha === foco
                      return (
                        <td key={fecha} role="gridcell" aria-selected={elegido}>
                          <button
                            type="button"
                            className={styles.dia}
                            data-fecha={fecha}
                            data-elegido={elegido || undefined}
                            data-hoy={fecha === hoy || undefined}
                            tabIndex={tabulable ? 0 : -1}
                            disabled={!elegible}
                            aria-label={`${fechaLarga(fecha)}${fecha === hoy ? ', hoy' : ''}`}
                            aria-current={fecha === hoy ? 'date' : undefined}
                            onClick={() => elegir(fecha)}
                            onFocus={() => setFoco(fecha)}
                          >
                            {Number(fecha.slice(8))}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {hoyElegible && hoy && (
              <div className={styles.pie}>
                <button type="button" className={styles.hoy} onClick={() => elegir(hoy)}>
                  Hoy
                </button>
              </div>
            )}
          </div>
        )}
      </DropdownMenu>
    </span>
  )
}
