'use client'

import Link from 'next/link'
import { useId, useState } from 'react'
import { Star, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComercioLogo } from '@/components/ui/comercio-logo'
import { SegmentedControl } from '@/components/ui/segmented'
import { TituloSeccion } from '@/components/ui/titulo-seccion'
import { DIAS_VENTAS, MINIMO_RESENAS, type ItemTop, type TopComercios } from '@/lib/comercios/top-comercios'
import styles from './top-comercios.module.css'

/*
  EL TOP DE COMERCIOS  ·  Inicio del socio (29/10/2026; rediseño del 12/11/2026)
  ---------------------------------------------------------------------------
  Dos listas de cinco con pestañas: los mejor calificados y los que más
  ventas hicieron en el último mes. Es el único estado del bloque (qué
  pestaña se ve) y vive aquí; los datos llegan ya listos del servidor
  (`leerTopComercios`).

  El rediseño («valida el diseño de este apartado y mejóralo con el estilo
  existente»):
    · el título es el de la marca (`TituloSeccion` de bloque: serif, la
      estrella y la última palabra en cursiva dorada), como Reseñas o
      Beneficios, y debajo una línea dice QUÉ mide la lista que se ve;
    · ABRE EN LA LISTA QUE TIENE DATOS: «Mejor calificados» pide 3 reseñas
      por comercio y, mientras nadie llega, abrir ahí era enseñar un vacío
      con la otra lista llena al lado;
    · el vacío ya no es una línea gris: su icono en el aro dorado, qué falta
      y, si la otra lista tiene comercios, un botón para verla;
    · la posición va en un aro dorado (las tres primeras, en oro pleno), y
      en ancho la lista se reparte en dos columnas.

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

const BAJADA: Record<Vista, string> = {
  calificados: 'Los que mejor califican los socios.',
  ventas: `Donde más se usó la membresía en los últimos ${DIAS_VENTAS} días.`,
}

const VACIO: Record<Vista, { titulo: string; texto: string; otra: string }> = {
  calificados: {
    titulo: 'Aún no hay un top de calificaciones',
    texto: `Un comercio entra aquí cuando reúne ${MINIMO_RESENAS} reseñas o más. Califica los que visitas: tu opinión ayuda a otros socios.`,
    otra: 'Ver los de más ventas',
  },
  ventas: {
    titulo: 'Aún no hay ventas este mes',
    texto: `Cuando los socios usen su membresía, aquí verás los comercios con más ventas de los últimos ${DIAS_VENTAS} días.`,
    otra: 'Ver los mejor calificados',
  },
}

export function TopComerciosSocio({ top }: { top: TopComercios }) {
  // Abre en la lista que tiene algo que enseñar.
  const [vista, setVista] = useState<Vista>(
    top.calificados.length === 0 && top.ventas.length > 0 ? 'ventas' : 'calificados',
  )
  const titulo = useId()
  const items: ItemTop[] = vista === 'calificados' ? top.calificados : top.ventas
  const otra: Vista = vista === 'calificados' ? 'ventas' : 'calificados'
  const otraTieneDatos = (otra === 'calificados' ? top.calificados : top.ventas).length > 0
  const Icono = vista === 'calificados' ? Star : TrendingUp

  return (
    <section className={styles.top} aria-labelledby={titulo}>
      <div className={styles.cabecera}>
        <div className={styles.textosCabecera}>
          <TituloSeccion id={titulo} como="h2" tamano="bloque" texto="Top de comercios" />
          <p className={styles.bajada} aria-live="polite">
            {BAJADA[vista]}
          </p>
        </div>
        <SegmentedControl
          options={OPCIONES}
          value={vista}
          onChange={setVista}
          ariaLabel="Ver el top por"
          size="sm"
        />
      </div>

      {items.length === 0 ? (
        <div className={styles.vacio} key={`vacio-${vista}`}>
          <span className={styles.vacioIcono} aria-hidden="true">
            <Icono size={20} />
          </span>
          <div className={styles.vacioTextos}>
            <p className={styles.vacioTitulo}>{VACIO[vista].titulo}</p>
            <p className={styles.vacioTexto}>{VACIO[vista].texto}</p>
          </div>
          {otraTieneDatos && (
            <Button variant="secondary" size="sm" pildora onClick={() => setVista(otra)}>
              {VACIO[vista].otra}
            </Button>
          )}
        </div>
      ) : (
        <ol className={styles.lista} key={vista}>
          {items.map((item) => (
            <li key={item.comercioId}>
              <Link
                href={`/miembros/comercios/${item.comercioId}`}
                className={styles.fila}
                aria-label={`${item.posicion}. ${item.nombre}. ${item.datoAccesible}`}
              >
                <span
                  className={styles.posicion}
                  data-podio={item.posicion <= 3 || undefined}
                  aria-hidden="true"
                >
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
