import { Skeleton } from '@/components/ui/feedback'
import styles from './_components/verificar.module.css'

/**
 * Esqueleto de la Herramienta de Comercios.
 *
 * `page.tsx` es un Server Component que espera a varias consultas (sucursales,
 * promociones, tipos de beneficio) antes de pintar una sola letra, así que en
 * una conexión de caja —las del punto de venta suelen ser la peor red del
 * local— el cajero veía la pantalla anterior congelada sin ninguna señal de
 * que algo estaba pasando, y volvía a tocar.
 *
 * El banner (foto, logotipo y nombre del comercio) lo pone el layout y ya
 * está pintado: aquí solo van las DOS tarjetas que montan sobre su canto, con
 * la misma rejilla y las mismas clases que la página real. Un esqueleto que
 * no se parece a lo que llega después desplaza el contenido al resolverse, y
 * ese salto se percibe peor que no haber puesto nada.
 *
 * Los rellenos usan `--surface-hueco`, que es uno de los dos únicos sitios del
 * sistema donde el relleno sigue siendo información: perfilar un esqueleto
 * dibujaría el contorno exacto de un contenido que todavía no ha llegado.
 * `Skeleton` ya trae `data-motion-esencial`, así que su pulso sobrevive a
 * `prefers-reduced-motion` — un esqueleto congelado deja de informar de que
 * algo ocurre.
 */
export default function Loading() {
  return (
    <div className={styles.cuerpo} aria-busy="true">
      <div className={styles.columnas}>
        <div className={styles.herramienta}>
          <div className={`${styles.tarjeta} ${styles.principal}`}>
            <div className={styles.esqueletoLineas}>
              {/* El título del bloque y su bajada. */}
              <Skeleton width="min(240px, 70%)" height="28px" />
              <Skeleton width="min(320px, 90%)" height="14px" />
            </div>
            {/* El botón único de reposo: «Escanear código QR», en píldora. */}
            <Skeleton width="100%" height="52px" radius="var(--radius-full)" />
            {/* La salida en texto, centrada bajo él como en la pantalla real. */}
            <Skeleton width="min(220px, 70%)" height="14px" />
          </div>
        </div>

        <div className={styles.lateral}>
          <div className={styles.tarjeta}>
            <Skeleton width="min(200px, 70%)" height="28px" />
            <div className={styles.esqueletoLineas}>
              <Skeleton width="100%" height="22px" />
              <Skeleton width="85%" height="22px" />
              <Skeleton width="92%" height="22px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
