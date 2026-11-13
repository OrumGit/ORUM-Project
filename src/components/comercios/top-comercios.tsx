'use client'

import Link from 'next/link'
import { useId, useState, type CSSProperties } from 'react'
import { Pause, Play, Star, Store } from 'lucide-react'
import { ComercioLogo } from '@/components/ui/comercio-logo'
import { TituloSeccion } from '@/components/ui/titulo-seccion'
import {
  MINIMO_DESFILE,
  repeticionesDesfile,
  type ItemTop,
  type TopComercios,
} from '@/lib/comercios/top-comercios'
import styles from './top-comercios.module.css'

/*
  COMERCIOS DESTACADOS  ·  Inicio del socio
  ---------------------------------------------------------------------------
  29/10/2026 nació como un «Top» con pestañas y posiciones; el 12/11/2026 el
  propietario lo cambió: «no me gusta el diseño, ni que sea un top; como un
  carrusel, que vayan pasando los logos, para no tener preferencias; pero
  que sí sean los 5 más vendidos, y lo mismo con los más calificados;
  podría ser únicamente el logo».

  Lo que hay:
    · UNA CINTA DE LOGOS POR LISTA que pasa sola, despacio: «Donde más se usa
      ORUM» (los cinco con más ventas del mes) y «Los mejor calificados» (los
      cinco con mejor promedio, desde 3 reseñas). Una lista vacía no pinta su
      cinta; hoy nadie llega a 3 reseñas y solo se ve la primera.
    · SIN ORDEN NI NÚMEROS: las listas llegan mezcladas del servidor
      (`mezclarTop`) y no se pinta posición, ventas ni estrellas.
    · SOLO EL LOGO. El nombre lo dice el enlace (lector de pantalla) y un
      rótulo que aparece al apuntar o enfocar; tocarlo abre la ficha.

  El movimiento:
    · Solo `transform`, una capa por cinta: la cinta es la lista repetida
      hasta llenar media cinta (`repeticionesDesfile`) y DOS veces esa
      mitad, así que desplazarla −50 % vuelve exactamente al principio.
    · Se detiene al apuntarla o al enfocar un logo, y con el botón de pausa
      (WCAG 2.2.2: lo que se mueve solo más de 5 s se tiene que poder parar,
      también sin ratón).
    · La segunda cinta va al revés, para que las dos no se lean como una.
    · Con movimiento reducido NO se mueve: queda una fila con un logo por
      comercio que se desliza con el dedo, y el botón de pausa no sale.
    · Con menos de 3 logos tampoco se mueve (un logo dando vueltas solo).

  Accesibilidad: el primer juego de logos es el real (enlaces con nombre);
  las repeticiones son `aria-hidden` e `inert`, así el lector y el
  tabulador recorren cinco logos, no cuarenta.
*/

type Cinta = {
  clave: 'ventas' | 'calificados'
  titulo: string
  Icono: typeof Store
  items: ItemTop[]
}

export function TopComerciosSocio({ top }: { top: TopComercios }) {
  const titulo = useId()
  const [pausado, setPausado] = useState(false)

  const cintas: Cinta[] = [
    { clave: 'ventas' as const, titulo: 'Donde más se usa ORUM', Icono: Store, items: top.ventas },
    { clave: 'calificados' as const, titulo: 'Los mejor calificados', Icono: Star, items: top.calificados },
  ].filter((c) => c.items.length > 0)

  const algunaSeMueve = cintas.some((c) => c.items.length >= MINIMO_DESFILE)

  return (
    <section className={styles.destacados} aria-labelledby={titulo}>
      <div className={styles.cabecera}>
        <div className={styles.textosCabecera}>
          <TituloSeccion id={titulo} como="h2" tamano="bloque" texto="Comercios destacados" />
          <p className={styles.bajada}>Los que más disfrutan los socios este mes.</p>
        </div>
        {algunaSeMueve && (
          <button
            type="button"
            className={styles.pausa}
            onClick={() => setPausado((p) => !p)}
            aria-pressed={pausado}
            aria-label={pausado ? 'Reanudar el paso de los logos' : 'Pausar el paso de los logos'}
          >
            {pausado ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
        )}
      </div>

      {cintas.map((cinta, i) => (
        <CintaLogos
          key={cinta.clave}
          cinta={cinta}
          inversa={i % 2 === 1}
          pausada={pausado}
        />
      ))}
    </section>
  )
}

function CintaLogos({ cinta, inversa, pausada }: { cinta: Cinta; inversa: boolean; pausada: boolean }) {
  const rotulo = useId()
  const { items, Icono } = cinta
  const mueve = items.length >= MINIMO_DESFILE
  // Las dos mitades idénticas de la cinta; la primera repetición de la
  // primera mitad es la única que se lee y se tabula.
  const repeticiones = mueve ? repeticionesDesfile(items.length) * 2 : 1
  const juegos = Array.from({ length: repeticiones }, (_, j) => j)

  return (
    <div className={styles.bloqueCinta}>
      <p id={rotulo} className={styles.rotuloCinta}>
        <Icono size={14} aria-hidden="true" />
        {cinta.titulo}
      </p>
      <div
        className={styles.ventana}
        data-mueve={mueve || undefined}
        data-pausada={pausada || undefined}
      >
        <ul
          className={styles.pista}
          aria-labelledby={rotulo}
          data-inversa={inversa || undefined}
          // Una vuelta recorre MEDIA cinta: su duración es la de los logos de
          // esa mitad, así todas avanzan igual de rápido, tengan 3 o 5.
          style={{ '--logos-cinta': (repeticiones * items.length) / 2 } as CSSProperties}
        >
          {juegos.flatMap((juego) =>
            items.map((item) => {
              const copia = juego > 0
              return (
                <li
                  key={`${juego}-${item.comercioId}`}
                  className={styles.logo}
                  data-copia={copia || undefined}
                  aria-hidden={copia || undefined}
                  inert={copia || undefined}
                >
                  <Link
                    href={`/miembros/comercios/${item.comercioId}`}
                    className={styles.enlace}
                    aria-label={item.nombre}
                  >
                    <ComercioLogo logoUrl={item.logoUrl} nombre={item.nombre} />
                    <span className={styles.nombre} aria-hidden="true">
                      {item.nombre}
                    </span>
                  </Link>
                </li>
              )
            }),
          )}
        </ul>
      </div>
    </div>
  )
}
