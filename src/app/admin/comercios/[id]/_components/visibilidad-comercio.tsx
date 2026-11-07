'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Alert } from '@/components/ui/alert'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Switch } from '@/components/ui/toggle'
import { textoVisibilidad, type Portal, type Visibilidad } from '@/lib/comercios/visibilidad'
import { cambiarVisibilidadComercio } from '../../actions'
import styles from '../ficha.module.css'

/*
  DÓNDE SE VE  ·  la tercera decisión de la ficha (07/11/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: registrar un comercio y tenerlo oculto hasta
  tener todos sus recursos, eligiendo el portal inicial, el de miembros o
  ambos. Un interruptor por portal que se aplica al tocarlo: el estado
  cambia en el mismo fotograma (`useOptimistic`) y, si el servidor falla,
  vuelve solo y se dice por qué.

  Va encima de «Visible para los socios» (`activo`): un aliado retirado no
  se ve en ningún sitio, marque lo que marque aquí.
*/

function tono(v: Visibilidad): BadgeTone {
  if (v.publico && v.miembros) return 'success'
  if (v.publico || v.miembros) return 'info'
  return 'warning'
}

export function VisibilidadComercio({
  comercioId,
  visible,
  disponible,
  aliadoActivo,
}: {
  comercioId: number
  visible: Visibilidad
  /** `false` = la migración aún no está aplicada: no hay dónde guardarlo. */
  disponible: boolean
  aliadoActivo: boolean
}) {
  const [, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [actual, aplicar] = useOptimistic(
    visible,
    (v: Visibilidad, cambio: { portal: Portal; valor: boolean }) => ({ ...v, [cambio.portal]: cambio.valor }),
  )

  function cambiar(portal: Portal, valor: boolean) {
    setError(null)
    const datos = new FormData()
    datos.set('id', String(comercioId))
    datos.set('portal', portal)
    datos.set('visible', String(valor))
    iniciar(async () => {
      aplicar({ portal, valor })
      try {
        const res = await cambiarVisibilidadComercio({}, datos)
        if (res.error) setError(res.error)
      } catch {
        setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
      }
    })
  }

  return (
    <div className={styles.estado}>
      <div className={styles.estadoTextos}>
        <span className={styles.estadoTitulo}>
          Dónde se ve
          <Badge tone={tono(actual)} size="sm">
            {textoVisibilidad(actual)}
          </Badge>
        </span>
        <span className={styles.estadoNota}>
          {aliadoActivo
            ? 'Ocúltalo mientras le faltan su logotipo, sus fotos o sus promociones. No se borra nada y la caja sigue funcionando.'
            : 'Mientras esté retirado del club no se ve en ningún portal, marques lo que marques aquí.'}
        </span>
      </div>

      <div className={styles.interruptores}>
        <Switch
          label="Portal inicial"
          checked={actual.publico}
          disabled={!disponible}
          onChange={(e) => cambiar('publico', e.currentTarget.checked)}
        />
        <Switch
          label="Portal de miembros"
          checked={actual.miembros}
          disabled={!disponible}
          onChange={(e) => cambiar('miembros', e.currentTarget.checked)}
        />
      </div>

      {!disponible && (
        <span className={styles.estadoNota}>
          Para poder ocultarlo, falta aplicar en Supabase la migración
          20261107120000_comercios_visibilidad.sql. Hasta entonces se ve en los dos.
        </span>
      )}
      {error && (
        <Alert tone="danger" className={styles.estadoError}>
          {error}
        </Alert>
      )}
    </div>
  )
}
