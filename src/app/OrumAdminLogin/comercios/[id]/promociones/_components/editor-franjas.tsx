'use client'

import { useId, useState } from 'react'
import { CalendarClock, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Radio } from '@/components/ui/toggle'
import { DIAS_SEMANA } from '@/lib/comercios/dias-promocion'
import {
  cuandoUsarlo,
  esTodoElDia,
  MAX_FRANJAS,
  normalizarFranjas,
  validarFranjas,
  type FranjaPromocion,
} from '@/lib/comercios/franjas-promocion'
import estilosForm from '@/styles/formulario.module.css'
import styles from './editor-franjas.module.css'

/*
  ¿CUÁNDO SE PUEDE USAR EL BENEFICIO?  ·  segunda versión (29/10/2026)
  ---------------------------------------------------------------------------
  La primera escondía los días tras un interruptor y hablaba de «franjas»:
  un probador no lo entendió. Ahora se pregunta como lo diría una persona:

    ( ) Todos los días, a cualquier hora
    (•) Solo algunos días u horas
        ┌ Días: [Lun][Mar][Mié]…                       [Quitar]
        │ Horas: (•) Todo el día  ( ) Solo de [08:00] a [09:30]
        │                                    + Añadir otra hora
        └
        + Añadir otros días

  Cada «grupo» son unos días con su horario: «martes y miércoles de 8:00 a
  9:30 y de 6:00 a 7:00 p. m.» es UN grupo con dos horas; «el fin de semana,
  todo el día» es otro. Debajo, «Así lo verá el socio».

  Lo que viaja al servidor:
    · todos los días → nada (vale siempre);
    · solo días, todos «todo el día» → las casillas `dias_semana`, como
      antes de las horas;
    · si algún grupo tiene horas → el campo oculto `franjas_horarias` (JSON),
      una franja por hora y grupo; un grupo «todo el día» viaja como 00:00 a
      23:59. El servidor junta los días en `dias_semana`.
*/

type Rango = { clave: number; desde: string; hasta: string }
type Grupo = { clave: number; dias: number[]; todoElDia: boolean; rangos: Rango[] }

let siguienteClave = 1
const clave = () => siguienteClave++
const rango = (desde = '08:00', hasta = '10:00'): Rango => ({ clave: clave(), desde, hasta })

/** Lo guardado, en grupos: las franjas con los mismos días van juntas. */
function gruposIniciales(dias: number[] | null, franjasCrudas: unknown): Grupo[] {
  const franjas = normalizarFranjas(franjasCrudas)
  if (franjas) {
    const porDias = new Map<string, FranjaPromocion[]>()
    for (const f of franjas) porDias.set(f.dias.join(','), [...(porDias.get(f.dias.join(',')) ?? []), f])
    return [...porDias.values()].map((lista) => ({
      clave: clave(),
      dias: lista[0].dias,
      todoElDia: lista.length === 1 && esTodoElDia(lista[0]),
      rangos: lista.some(esTodoElDia) ? [rango()] : lista.map((f) => rango(f.desde, f.hasta)),
    }))
  }
  return [{ clave: clave(), dias: dias ?? [1, 2, 3, 4, 5], todoElDia: true, rangos: [rango()] }]
}

/** Los grupos, como franjas (un grupo «todo el día» = 00:00 a 23:59). */
function aFranjas(grupos: Grupo[]): FranjaPromocion[] {
  return grupos.flatMap((g) =>
    g.todoElDia
      ? [{ dias: g.dias, desde: '00:00', hasta: '23:59' }]
      : g.rangos.map((r) => ({ dias: g.dias, desde: r.desde, hasta: r.hasta })),
  )
}

export function EditorFranjas({
  diasIniciales,
  franjasIniciales,
}: {
  diasIniciales: number[] | null
  franjasIniciales: unknown
}) {
  // Nombres de los grupos de opciones: estables entre servidor y navegador
  // (las `clave` de las filas no lo son, y el nombre llega al HTML).
  const base = useId()
  const [siempre, setSiempre] = useState(!diasIniciales && !normalizarFranjas(franjasIniciales))
  const [grupos, setGrupos] = useState<Grupo[]>(() => gruposIniciales(diasIniciales, franjasIniciales))

  const franjas = aFranjas(grupos)
  const conHoras = grupos.some((g) => !g.todoElDia)
  const sinDias = grupos.some((g) => g.dias.length === 0)
  // Solo con horas se revisan cruces: sin horas, los días viajan juntos.
  const error = siempre
    ? null
    : sinDias
      ? 'Marca al menos un día en cada grupo.'
      : conHoras
        ? validarFranjas(normalizarFranjas(franjas))
        : null
  const vista = siempre
    ? cuandoUsarlo(null, null)
    : conHoras
      ? cuandoUsarlo(null, normalizarFranjas(franjas))
      : cuandoUsarlo([...new Set(grupos.flatMap((g) => g.dias))], null)
  // Solo días, sin horas: viajan como `dias_semana`, como siempre.
  const diasSolos = [...new Set(grupos.flatMap((g) => g.dias))].sort()

  const cambiarGrupo = (k: number, cambio: Partial<Grupo>) =>
    setGrupos((gs) => gs.map((g) => (g.clave === k ? { ...g, ...cambio } : g)))
  const cambiarRango = (g: Grupo, k: number, cambio: Partial<Rango>) =>
    cambiarGrupo(g.clave, { rangos: g.rangos.map((r) => (r.clave === k ? { ...r, ...cambio } : r)) })
  const alternarDia = (g: Grupo, dia: number) =>
    cambiarGrupo(g.clave, {
      dias: g.dias.includes(dia) ? g.dias.filter((d) => d !== dia) : [...g.dias, dia].sort(),
    })

  return (
    <fieldset className={estilosForm.grupoDias}>
      <legend className={estilosForm.grupoDiasTitulo}>¿Cuándo se puede usar?</legend>

      {/* Lo que viaja. */}
      {!siempre && conHoras && <input type="hidden" name="franjas_horarias" value={JSON.stringify(franjas)} />}
      {!siempre && !conHoras && diasSolos.map((d) => <input key={d} type="hidden" name="dias_semana" value={d} />)}

      <div className={styles.modos} role="radiogroup" aria-label="Cuándo se puede usar">
        <Radio
          name={`${base}-modo`}
          label="Todos los días, a cualquier hora"
          checked={siempre}
          onChange={() => setSiempre(true)}
        />
        <Radio
          name={`${base}-modo`}
          label="Solo algunos días u horas"
          description="Elige los días y, si quieres, las horas (hora de Colombia)."
          checked={!siempre}
          onChange={() => setSiempre(false)}
        />
      </div>

      {!siempre && (
        <>
          <ol className={styles.grupos}>
            {grupos.map((g, i) => (
              <li key={g.clave} className={styles.grupo}>
                <div className={styles.cabeza}>
                  <span className={styles.rotulo}>Días</span>
                  {grupos.length > 1 && (
                    <button
                      type="button"
                      className={styles.quitar}
                      onClick={() => setGrupos((gs) => gs.filter((x) => x.clave !== g.clave))}
                      aria-label={`Quitar el grupo ${i + 1}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className={styles.dias} role="group" aria-label={`Días del grupo ${i + 1}`}>
                  {DIAS_SEMANA.map((d) => (
                    <button
                      key={d.numero}
                      type="button"
                      className={styles.dia}
                      aria-pressed={g.dias.includes(d.numero)}
                      aria-label={d.largo}
                      onClick={() => alternarDia(g, d.numero)}
                    >
                      {d.corto}
                    </button>
                  ))}
                </div>

                <span className={styles.rotulo}>Horas</span>
                <div className={styles.horasModo}>
                  <Radio
                    name={`${base}-horas-${i}`}
                    label="Todo el día"
                    checked={g.todoElDia}
                    onChange={() => cambiarGrupo(g.clave, { todoElDia: true })}
                  />
                  <Radio
                    name={`${base}-horas-${i}`}
                    label="Solo en estas horas"
                    checked={!g.todoElDia}
                    onChange={() => cambiarGrupo(g.clave, { todoElDia: false })}
                  />
                </div>

                {!g.todoElDia && (
                  <div className={styles.rangos}>
                    {g.rangos.map((r, j) => (
                      <div key={r.clave} className={styles.rango}>
                        <span className={styles.de}>De</span>
                        <Input
                          type="time"
                          value={r.desde}
                          onChange={(e) => cambiarRango(g, r.clave, { desde: e.target.value })}
                          aria-label={`Desde, hora ${j + 1} del grupo ${i + 1}`}
                        />
                        <span className={styles.de}>a</span>
                        <Input
                          type="time"
                          value={r.hasta}
                          onChange={(e) => cambiarRango(g, r.clave, { hasta: e.target.value })}
                          aria-label={`Hasta, hora ${j + 1} del grupo ${i + 1}`}
                        />
                        {g.rangos.length > 1 && (
                          <button
                            type="button"
                            className={styles.quitar}
                            onClick={() => cambiarGrupo(g.clave, { rangos: g.rangos.filter((x) => x.clave !== r.clave) })}
                            aria-label={`Quitar la hora ${j + 1}`}
                          >
                            <X size={15} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                    {franjas.length < MAX_FRANJAS && (
                      <button
                        type="button"
                        className={styles.enlace}
                        onClick={() => {
                          const ultima = g.rangos[g.rangos.length - 1]
                          const h = Number(ultima.hasta.slice(0, 2))
                          const desde = h <= 20 ? `${String(h + 1).padStart(2, '0')}:00` : '18:00'
                          const hasta = h <= 20 ? `${String(h + 2).padStart(2, '0')}:00` : '19:00'
                          cambiarGrupo(g.clave, { rangos: [...g.rangos, rango(desde, hasta)] })
                        }}
                      >
                        <Plus size={14} aria-hidden="true" />
                        Añadir otra hora para estos días
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>

          {franjas.length < MAX_FRANJAS && (
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Plus size={15} aria-hidden="true" />}
                onClick={() =>
                  setGrupos((gs) => {
                    // Arranca con los días que ningún grupo tiene todavía.
                    const usados = new Set(gs.flatMap((g) => g.dias))
                    const libres = DIAS_SEMANA.map((d) => d.numero).filter((n) => !usados.has(n))
                    return [...gs, { clave: clave(), dias: libres, todoElDia: true, rangos: [rango()] }]
                  })
                }
                aria-label="Añadir otros días con otro horario"
              >
                {/* Corto: el largo no cabía en un teléfono de 320 px. */}
                Añadir otros días
              </Button>
            </div>
          )}
        </>
      )}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : (
        <div className={styles.vista}>
          <span className={styles.vistaRotulo}>
            <CalendarClock size={13} aria-hidden="true" />
            Así lo verá el socio
          </span>
          <dl className={styles.vistaLista}>
            {vista.map((v) => (
              <div key={v.dias} className={styles.vistaFila}>
                <dt>{v.dias}</dt>
                <dd>{v.horas.join(' · ')}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </fieldset>
  )
}
