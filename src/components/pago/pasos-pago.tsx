import { Check } from 'lucide-react'
import estilos from './pasos-pago.module.css'

/*
  LOS TRES PASOS DEL REGISTRO  ·  (diseño aprobado el 23/11/2026,
  «ORUM — Pago con Mercado Pago»)
  ---------------------------------------------------------------------------
  «Tus datos → Tu correo → Pago», a la izquierda de la cabecera. Colores de
  la paleta CLARA de ORUM (lo pidió el propietario: nada negro al completar,
  nada de oro oscuro): lo hecho, dorado muy claro con la ✓ en oro; el paso
  de ahora, el mismo dorado claro con filo del oro de marca; lo que falta,
  un filo gris suave. En el teléfono, una línea de texto y una barra de tres.
*/

export const PASOS = ['Tus datos', 'Tu correo', 'Pago'] as const

export function PasosPago({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <>
      <ol className={estilos.pasos} aria-label="Pasos del registro">
        {PASOS.map((nombre, i) => {
          const n = i + 1
          const estado = n < actual ? 'hecho' : n === actual ? 'ahora' : 'falta'
          return (
            <li
              key={nombre}
              className={estilos.paso}
              data-estado={estado}
              aria-current={estado === 'ahora' ? 'step' : undefined}
            >
              {i > 0 && <span className={estilos.linea} aria-hidden="true" />}
              <span className={estilos.circulo} aria-hidden="true">
                {estado === 'hecho' ? <Check size={14} strokeWidth={2.6} /> : n}
              </span>
              <span className={estilos.nombre}>
                {nombre}
                {estado === 'hecho' && <span className={estilos.oculto}> (hecho)</span>}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Teléfono: el mismo dato, compacto. El lector ya lo oye en la lista. */}
      <div className={estilos.compacto} aria-hidden="true">
        <p className={estilos.compactoTexto}>
          Paso {actual} de 3 · <span>{PASOS[actual - 1]}</span>
        </p>
        <span className={estilos.barra}>
          {PASOS.map((nombre, i) => (
            <span
              key={nombre}
              data-estado={i + 1 < actual ? 'hecho' : i + 1 === actual ? 'ahora' : 'falta'}
            />
          ))}
        </span>
      </div>
    </>
  )
}
