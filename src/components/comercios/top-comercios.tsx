'use client'

import Link from 'next/link'
import { useId, useState } from 'react'
import { Star, TrendingUp } from 'lucide-react'
import { ComercioLogo } from '@/components/ui/comercio-logo'
import { SegmentedControl } from '@/components/ui/segmented'
import {
  MENSAJE_VACIO_CALIFICADOS,
  MENSAJE_VACIO_VENTAS,
  type ItemTop,
  type TopComercios,
} from '@/lib/comercios/top-comercios'
import styles from './top-comercios.module.css'

/*
  EL TOP DE COMERCIOS  ·  Inicio del socio (29/10/2026)
  ---------------------------------------------------------------------------
  Dos listas de cinco con pestañas: los mejor calificados y los que más
  ventas hicieron en el último mes. Es el único estado del bloque (qué
  pestaña se ve) y vive aquí; los datos llegan ya listos del servidor
  (`leerTopComercios`).

  Cada fila es un enlace a la ficha del socio. El dato de la derecha se dice
  con texto (estrella + número, «128 ventas»), nunca solo con color, y el
  lector de pantalla oye la versión larga (`datoAccesible`).

  La lista no anima al cambiar de pestaña más que con un fundido corto: es
  algo que el socio hace a menudo (regla cero de movimiento).
*/

type Vista = 'calificados' | 'ventas'

const OPCIONES = [
  { value: 'calificados', label: 'Mejor calificados', icon: <Star size={16} aria-hidden="true" /> },
  { value: 'ventas', label: 'Más ventas', icon: <TrendingUp size={16} aria-hidden="true" /> },
] as const

export function TopComerciosSocio({ top }: { top: TopComercios }) {
  const [vista, setVista] = useState<Vista>('calificados')
  const titulo = useId()
  const items: ItemTop[] = vista === 'calificados' ? top.calificados : top.ventas

  return (
    <section className={styles.top} aria-labelledby={titulo}>
      <div className={styles.cabecera}>
        <h2 id={titulo} className={styles.titulo}>
          Top de comercios
        </h2>
        <SegmentedControl
          options={OPCIONES}
          value={vista}
          onChange={setVista}
          ariaLabel="Ver el top por"
          size="sm"
        />
      </div>

      {items.length === 0 ? (
        <p className={styles.vacio}>
          {vista === 'calificados' ? MENSAJE_VACIO_CALIFICADOS : MENSAJE_VACIO_VENTAS}
        </p>
      ) : (
        <ol className={styles.lista} key={vista}>
          {items.map((item) => (
            <li key={item.comercioId}>
              <Link
                href={`/miembros/comercios/${item.comercioId}`}
                className={styles.fila}
                aria-label={`${item.posicion}. ${item.nombre}. ${item.datoAccesible}`}
              >
                <span className={styles.posicion} aria-hidden="true">
                  {item.posicion}
                </span>
                <ComercioLogo logoUrl={item.logoUrl} nombre={item.nombre} />
                <span className={styles.textos}>
                  <span className={styles.nombre}>{item.nombre}</span>
                  {item.detalle && <span className={styles.detalle}>{item.detalle}</span>}
                </span>
                <span className={styles.dato} aria-hidden="true">
                  {item.dato}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
