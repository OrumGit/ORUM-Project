'use client'

import { useState } from 'react'
import { Clock, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox, Switch } from '@/components/ui/toggle'
import { DIAS_SEMANA } from '@/lib/comercios/dias-promocion'
import {
  lineasFranjas,
  MAX_FRANJAS,
  normalizarFranjas,
  validarFranjas,
  type FranjaPromocion,
} from '@/lib/comercios/franjas-promocion'
import estilosForm from '@/styles/formulario.module.css'
import styles from './editor-franjas.module.css'

/*
  CUÁNDO APLICA LA PROMOCIÓN  ·  28/10/2026
  ---------------------------------------------------------------------------
  Encargo: «si los descuentos aplican únicamente en horarios fijos, que
  también se pueda poner». Dos modos, con un interruptor:

    · TODO EL DÍA (apagado, como siempre): las casillas de los días en que
      vale; ninguna = todos los días. Viajan como `dias_semana`.
    · SOLO EN CIERTOS HORARIOS (encendido): una lista de franjas, cada una
      con SUS días y sus horas, porque los turnos cambian de un día a otro
      («martes y miércoles de 8:00 a 9:30 y de 6:00 a 7:00 p. m.; el fin de
      semana de 8:00 a 9:00»). Viajan en UN campo oculto,
      `franjas_horarias`, con el JSON; los días de la promoción los calcula
      el servidor juntando los de las franjas.

  Debajo, en una línea, cómo lo leerá el socio. El estado es de interfaz; lo
  que decide es el servidor (`leerFranjasDelFormulario`).
*/

type Fila = { clave: number; dias: number[]; desde: string; hasta: string }

let siguienteClave = 1
const nuevaFila = (f: Omit<Fila, 'clave'>): Fila => ({ ...f, clave: siguienteClave++ })

/** La franja que se añade: los días de la última y, si cabe, a continuación de ella. */
function filaSugerida(previa: Fila | undefined): Fila {
  if (!previa) return nuevaFila({ dias: [1, 2, 3, 4, 5], desde: '08:00', hasta: '10:00' })
  const h = Number(previa.hasta.slice(0, 2))
  return h <= 20
    ? nuevaFila({
        dias: [...previa.dias],
        desde: `${String(h + 2).padStart(2, '0')}:00`,
        hasta: `${String(h + 3).padStart(2, '0')}:00`,
      })
    : nuevaFila({ dias: [6, 7], desde: '08:00', hasta: '10:00' })
}

export function EditorFranjas({
  diasIniciales,
  franjasIniciales,
}: {
  diasIniciales: number[] | null
  franjasIniciales: unknown
}) {
  const iniciales = normalizarFranjas(franjasIniciales)
  const [conHorario, setConHorario] = useState(Boolean(iniciales))
  const [filas, setFilas] = useState<Fila[]>(() =>
    iniciales ? iniciales.map((f) => nuevaFila(f)) : [filaSugerida(undefined)],
  )

  const franjas: FranjaPromocion[] = filas.map(({ dias, desde, hasta }) => ({ dias, desde, hasta }))
  const normalizadas = normalizarFranjas(franjas)
  const error = conHorario ? validarFranjas(normalizadas ?? []) : null
  const lineas = conHorario && !error ? lineasFranjas(normalizadas) : []

  const cambiar = (clave: number, cambio: Partial<Fila>) =>
    setFilas((actuales) => actuales.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)))

  const alternarDia = (fila: Fila, dia: number) =>
    cambiar(fila.clave, {
      dias: fila.dias.includes(dia) ? fila.dias.filter((d) => d !== dia) : [...fila.dias, dia].sort(),
    })

  return (
    <fieldset className={estilosForm.grupoDias}>
      <legend className={estilosForm.grupoDiasTitulo}>Cuándo aplica</legend>

      <Switch
        label="Solo en ciertos horarios"
        description={
          conHorario
            ? 'Fuera de estas franjas, la caja no deja aplicar la promoción.'
            : 'Apagado, vale todo el día en los días que marques.'
        }
        checked={conHorario}
        onChange={(e) => setConHorario(e.target.checked)}
      />

      {/* Lo que viaja: el JSON de las franjas, o nada (todo el día). */}
      <input type="hidden" name="franjas_horarias" value={conHorario ? JSON.stringify(franjas) : ''} />

      {!conHorario ? (
        <>
          <p className={estilosForm.grupoDiasAyuda}>
            Si no marcas ninguno, la promoción vale todos los días. Se cuenta el día en Colombia.
          </p>
          <div className={estilosForm.dias}>
            {DIAS_SEMANA.map((d) => (
              <Checkbox
                key={d.numero}
                name="dias_semana"
                value={d.numero}
                label={d.corto}
                defaultChecked={diasIniciales?.includes(d.numero) ?? false}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className={estilosForm.grupoDiasAyuda}>
            Cada franja tiene sus días y sus horas (hora de Colombia). Para dos turnos el mismo día,
            añade otra franja con esos días.
          </p>

          <ol className={styles.franjas}>
            {filas.map((fila, i) => (
              <li key={fila.clave} className={styles.franja}>
                <div className={styles.cabeza}>
                  <span className={styles.numero}>
                    <Clock size={14} aria-hidden="true" />
                    Franja {i + 1}
                  </span>
                  {filas.length > 1 && (
                    <button
                      type="button"
                      className={styles.quitar}
                      onClick={() => setFilas((actuales) => actuales.filter((f) => f.clave !== fila.clave))}
                      aria-label={`Quitar la franja ${i + 1}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className={styles.dias} role="group" aria-label={`Días de la franja ${i + 1}`}>
                  {DIAS_SEMANA.map((d) => {
                    const marcado = fila.dias.includes(d.numero)
                    return (
                      <button
                        key={d.numero}
                        type="button"
                        className={styles.dia}
                        aria-pressed={marcado}
                        aria-label={d.largo}
                        onClick={() => alternarDia(fila, d.numero)}
                      >
                        {d.corto}
                      </button>
                    )
                  })}
                </div>

                <div className={styles.horas}>
                  <label className={styles.hora}>
                    <span>Desde</span>
                    <Input
                      type="time"
                      value={fila.desde}
                      onChange={(e) => cambiar(fila.clave, { desde: e.target.value })}
                      aria-label={`Hora de inicio de la franja ${i + 1}`}
                    />
                  </label>
                  <label className={styles.hora}>
                    <span>Hasta</span>
                    <Input
                      type="time"
                      value={fila.hasta}
                      onChange={(e) => cambiar(fila.clave, { hasta: e.target.value })}
                      aria-label={`Hora de fin de la franja ${i + 1}`}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ol>

          {filas.length < MAX_FRANJAS && (
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Plus size={15} aria-hidden="true" />}
                onClick={() => setFilas((actuales) => [...actuales, filaSugerida(actuales[actuales.length - 1])])}
              >
                Añadir franja
              </Button>
            </div>
          )}

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : (
            lineas.length > 0 && (
              <div className={styles.vista}>
                <span className={styles.vistaRotulo}>Así lo verá el socio</span>
                {lineas.map((l) => (
                  <span key={l} className={styles.vistaLinea}>
                    {l}
                  </span>
                ))}
              </div>
            )
          )}
        </>
      )}
    </fieldset>
  )
}
