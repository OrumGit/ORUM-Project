// src/app/comercios/(portal)/_components/verificacion-tool.tsx
'use client'

import { useActionState, useEffect, useState } from 'react'
import { error as vibrarError } from '@/lib/shared/haptica'
import { buscarMiembro, type BuscarMiembroState } from '../actions'
import { BuscarMiembroForm } from './buscar-miembro-form'
import { VentanaVeredicto } from './ventana-veredicto'
import type { TipoBeneficioCodigo } from '@/lib/supabase/database.types'

type Sucursal = { id: number; nombre: string | null }
type Promocion = {
  id: number
  titulo: string
  tipoCodigo: TipoBeneficioCodigo
  valor: number | null
  disponibleHoy: boolean
  /** «Hoy aplica desde las 6:00 p. m.», «Hoy no aplica»: por qué no se puede elegir ahora. */
  ahoraTexto?: string | null
  diasTexto: string | null
  restricciones: string | null
}

const estadoInicial: BuscarMiembroState = {}

/*
  LA HERRAMIENTA: buscar en la página, y el resultado EN UNA VENTANA ENCIMA
  ---------------------------------------------------------------------------
  Encargo del propietario (04/10/2026): «cuando se lee el QR o se pone el
  número y la persona está activa o no, quiero que sea una ventana encima; no
  quiero que vaya debajo». Antes el veredicto y el formulario de venta
  aparecían bajo la tarjeta de buscar, y en un teléfono había que bajar para
  ver si la membresía valía.

  Aquí vive el estado de la BÚSQUEDA, y por eso no vive en la tarjeta:

    · La tarjeta de buscar se REMONTA al cerrar la ventana (`reinicio`) para
      volver al reposo —sin número escrito, sin cámara—.
    · La ventana tiene que seguir pintando al socio mientras se anima su
      salida. Si el resultado viviera en la tarjeta, desaparecería con ella y
      la ventana se vaciaría a media animación.

  Cerrar la ventana NO borra el resultado: lo marca como `descartada`. Una
  búsqueda nueva trae otro `consultaId` y la ventana vuelve a abrirse, aunque
  sea el mismo carnet.
*/
export function VerificacionTool({
  sucursales,
  promociones,
}: {
  sucursales: Sucursal[]
  promociones: Promocion[]
}) {
  const [state, formAction, pending] = useActionState(buscarMiembro, estadoInicial)
  const [descartada, setDescartada] = useState<number | null>(null)
  const [reinicio, setReinicio] = useState(0)

  const abierta = state.miembro !== undefined && state.consultaId !== descartada

  /* Cierra la ventana y deja la caja lista para el siguiente socio. Vale
     igual para la X, para Escape y para «Verificar otro socio». */
  const cerrar = () => {
    setDescartada(state.consultaId ?? null)
    setReinicio((n) => n + 1)
  }

  /*
    Háptica de «no» (`haptica.ts`, regla de causalidad: en el evento que la
    causa). Se dispara en dos veredictos distintos y suena igual a propósito:
    para el cajero, «no encontrado» y «no vigente» significan lo mismo —no se
    aplica el beneficio—. El «sí» no vibra: esa señal se reserva entera para la
    venta registrada, que es el final feliz de verdad.

    Vive AQUÍ y no en la tarjeta de buscar: aquella se remonta al cerrar la
    ventana, y con el resultado todavía en el estado volvería a vibrar.
  */
  useEffect(() => {
    if (state.error) vibrarError()
  }, [state.error])

  useEffect(() => {
    if (state.miembro && !state.miembro.vigente) vibrarError()
  }, [state.miembro])

  return (
    <>
      <BuscarMiembroForm key={reinicio} state={state} formAction={formAction} pending={pending} />

      <VentanaVeredicto
        abierta={abierta}
        consultaId={state.consultaId ?? 0}
        miembro={state.miembro ?? null}
        metodo={state.metodo ?? 'numero'}
        sucursales={sucursales}
        promociones={promociones}
        onCerrar={cerrar}
      />
    </>
  )
}
