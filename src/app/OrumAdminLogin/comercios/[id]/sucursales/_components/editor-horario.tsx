'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Radio, Switch } from '@/components/ui/toggle'
import { DIAS_SEMANA } from '@/lib/comercios/dias-promocion'
import {
  almuerzoCabe,
  DIA_FESTIVOS,
  validarHorario,
  type DiaHorario,
  type HorarioSucursal,
} from '@/lib/comercios/horario'
import estilosForm from '@/styles/formulario.module.css'
import styles from './editor-horario.module.css'

/*
  Editor del horario de una sucursal.

  El estado es de interfaz (qué interruptores y qué horas se ven); lo que viaja
  al servidor es UN campo oculto, `horario`, con el JSON de `HorarioSucursal`.
  Apagado el interruptor general, viaja `[]`: «sin horario cargado». Un día
  cerrado es una fila explícita (`abre null`), no un día ausente.

  El almuerzo es una sola franja que vale para todos los días abiertos; la
  base lo guarda por día, pero esta pantalla no ofrece almuerzos distintos.
*/

type Dia = { abierto: boolean; abre: string; cierra: string }
type Festivos = { modo: 'igual' | 'cerrado' | 'abierto'; abre: string; cierra: string }
type Almuerzo = { activo: boolean; desde: string; hasta: string }

type Estado = {
  activo: boolean
  dias: Dia[]
  almuerzo: Almuerzo
  festivos: Festivos
}

const ABRE = '09:00'
const CIERRA = '18:00'
const ALMUERZO_DESDE = '12:00'
const ALMUERZO_HASTA = '13:00'

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function estadoInicial(inicial: HorarioSucursal): Estado {
  if (inicial.length === 0) {
    return {
      activo: false,
      dias: DIAS_SEMANA.map((d) => ({
        abierto: d.numero <= 5,
        abre: ABRE,
        cierra: CIERRA,
      })),
      almuerzo: { activo: false, desde: ALMUERZO_DESDE, hasta: ALMUERZO_HASTA },
      festivos: { modo: 'igual', abre: ABRE, cierra: CIERRA },
    }
  }

  const fila = (n: number) => inicial.find((f) => f.dia === n)
  const conAlmuerzo = inicial.find((f) => f.almuerzoDesde && f.almuerzoHasta)
  const festivos = fila(DIA_FESTIVOS)

  return {
    activo: true,
    dias: DIAS_SEMANA.map((d) => {
      const f = fila(d.numero)
      return f?.abre && f.cierra
        ? { abierto: true, abre: f.abre, cierra: f.cierra }
        : { abierto: false, abre: ABRE, cierra: CIERRA }
    }),
    almuerzo: {
      activo: Boolean(conAlmuerzo),
      desde: conAlmuerzo?.almuerzoDesde ?? ALMUERZO_DESDE,
      hasta: conAlmuerzo?.almuerzoHasta ?? ALMUERZO_HASTA,
    },
    festivos: !festivos
      ? { modo: 'igual', abre: ABRE, cierra: CIERRA }
      : festivos.abre && festivos.cierra
        ? { modo: 'abierto', abre: festivos.abre, cierra: festivos.cierra }
        : { modo: 'cerrado', abre: ABRE, cierra: CIERRA },
  }
}

/** Lo que se guarda: `[]` si el horario está apagado. */
function construir(e: Estado): HorarioSucursal {
  if (!e.activo) return []
  const filas: DiaHorario[] = e.dias.map((d, i) => {
    /* Solo en los días donde la franja cabe: un sábado corto no bloquea el
       guardado, simplemente no lleva pausa. */
    const conAlmuerzo =
      d.abierto &&
      e.almuerzo.activo &&
      almuerzoCabe(d.abre, d.cierra, e.almuerzo.desde, e.almuerzo.hasta)
    return {
      dia: i + 1,
      abre: d.abierto ? d.abre : null,
      cierra: d.abierto ? d.cierra : null,
      almuerzoDesde: conAlmuerzo ? e.almuerzo.desde : null,
      almuerzoHasta: conAlmuerzo ? e.almuerzo.hasta : null,
    }
  })
  if (e.festivos.modo !== 'igual') {
    const abierto = e.festivos.modo === 'abierto'
    filas.push({
      dia: DIA_FESTIVOS,
      abre: abierto ? e.festivos.abre : null,
      cierra: abierto ? e.festivos.cierra : null,
      almuerzoDesde: null,
      almuerzoHasta: null,
    })
  }
  return filas
}

export function EditorHorario({
  inicial,
  error,
}: {
  inicial: HorarioSucursal
  /** El aviso del formulario (al enviar); si no hay, el del propio editor. */
  error?: string | null
}) {
  const [estado, setEstado] = useState<Estado>(() => estadoInicial(inicial))

  const filas = construir(estado)
  const errorLocal = estado.activo ? validarHorario(filas) : null
  const aviso = error ?? errorLocal

  function cambiarDia(indice: number, parcial: Partial<Dia>) {
    setEstado((e) => ({
      ...e,
      dias: e.dias.map((d, i) => (i === indice ? { ...d, ...parcial } : d)),
    }))
  }

  function copiarATodos(indice: number) {
    setEstado((e) => {
      const origen = e.dias[indice]
      return {
        ...e,
        dias: e.dias.map((d) =>
          d.abierto ? { ...d, abre: origen.abre, cierra: origen.cierra } : d,
        ),
      }
    })
  }

  return (
    <div className={styles.editor}>
      <input type="hidden" name="horario" value={JSON.stringify(filas)} />

      <Switch
        label="Mostrar horario de atención"
        description="Si lo apagas, la ficha no dice nada del horario de esta sucursal."
        checked={estado.activo}
        onChange={(ev) => setEstado((e) => ({ ...e, activo: ev.target.checked }))}
      />

      {estado.activo && (
        <>
          <ul className={styles.dias} aria-label="Horario por día">
            {DIAS_SEMANA.map((d, i) => {
              const dia = estado.dias[i]
              const nombre = capital(d.largo)
              return (
                <li key={d.numero} className={styles.dia}>
                  <Switch
                    label={nombre}
                    checked={dia.abierto}
                    onChange={(ev) => cambiarDia(i, { abierto: ev.target.checked })}
                    className={styles.interruptorDia}
                  />
                  {dia.abierto ? (
                    <div className={styles.horas}>
                      <Input
                        type="time"
                        aria-label={`Hora de apertura del ${d.largo}`}
                        value={dia.abre}
                        onChange={(ev) => cambiarDia(i, { abre: ev.target.value })}
                        numeric
                      />
                      <span aria-hidden="true">–</span>
                      <Input
                        type="time"
                        aria-label={`Hora de cierre del ${d.largo}`}
                        value={dia.cierra}
                        onChange={(ev) => cambiarDia(i, { cierra: ev.target.value })}
                        numeric
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={<Copy size={14} />}
                        onClick={() => copiarATodos(i)}
                        aria-label={`Copiar el horario del ${d.largo} a los demás días abiertos`}
                      >
                        Copiar
                      </Button>
                    </div>
                  ) : (
                    <span className={styles.cerrado}>Cerrado</span>
                  )}
                </li>
              )
            })}
          </ul>

          <div className={styles.bloque}>
            <Switch
              label="Pausa de almuerzo"
              description="Una misma franja para los días abiertos. Se omite en los días donde no cabe."
              checked={estado.almuerzo.activo}
              onChange={(ev) =>
                setEstado((e) => ({ ...e, almuerzo: { ...e.almuerzo, activo: ev.target.checked } }))
              }
            />
            {estado.almuerzo.activo && (
              <div className={styles.horas}>
                <Input
                  type="time"
                  aria-label="Inicio del almuerzo"
                  value={estado.almuerzo.desde}
                  onChange={(ev) =>
                    setEstado((e) => ({ ...e, almuerzo: { ...e.almuerzo, desde: ev.target.value } }))
                  }
                  numeric
                />
                <span aria-hidden="true">–</span>
                <Input
                  type="time"
                  aria-label="Fin del almuerzo"
                  value={estado.almuerzo.hasta}
                  onChange={(ev) =>
                    setEstado((e) => ({ ...e, almuerzo: { ...e.almuerzo, hasta: ev.target.value } }))
                  }
                  numeric
                />
              </div>
            )}
          </div>

          <fieldset className={`${estilosForm.grupoDias} ${styles.bloque}`}>
            <legend className={estilosForm.grupoDiasTitulo}>Festivos</legend>
            <p className={estilosForm.grupoDiasAyuda}>
              Una sola regla para todos los festivos de Colombia.
            </p>
            <Radio
              name="festivos-modo"
              label="Igual que ese día de la semana"
              checked={estado.festivos.modo === 'igual'}
              onChange={() => setEstado((e) => ({ ...e, festivos: { ...e.festivos, modo: 'igual' } }))}
            />
            <Radio
              name="festivos-modo"
              label="Cerrado"
              checked={estado.festivos.modo === 'cerrado'}
              onChange={() =>
                setEstado((e) => ({ ...e, festivos: { ...e.festivos, modo: 'cerrado' } }))
              }
            />
            <Radio
              name="festivos-modo"
              label="Abierto con horario propio"
              checked={estado.festivos.modo === 'abierto'}
              onChange={() =>
                setEstado((e) => ({ ...e, festivos: { ...e.festivos, modo: 'abierto' } }))
              }
            />
            {estado.festivos.modo === 'abierto' && (
              <div className={styles.horas}>
                <Input
                  type="time"
                  aria-label="Hora de apertura en festivos"
                  value={estado.festivos.abre}
                  onChange={(ev) =>
                    setEstado((e) => ({ ...e, festivos: { ...e.festivos, abre: ev.target.value } }))
                  }
                  numeric
                />
                <span aria-hidden="true">–</span>
                <Input
                  type="time"
                  aria-label="Hora de cierre en festivos"
                  value={estado.festivos.cierra}
                  onChange={(ev) =>
                    setEstado((e) => ({ ...e, festivos: { ...e.festivos, cierra: ev.target.value } }))
                  }
                  numeric
                />
              </div>
            )}
          </fieldset>

          <p className={estilosForm.nota}>
            Si un comercio cierra pasada la medianoche, pon la hora de cierre del día siguiente
            (por ejemplo, de 10:00 p. m. a 2:00 a. m.).
          </p>
        </>
      )}

      {aviso && (
        <div role="alert">
          <Alert tone="danger">{aviso}</Alert>
        </div>
      )}
    </div>
  )
}
