'use client'

import { useActionState, useState } from 'react'
import { Check, Lock } from 'lucide-react'
import { PasosPago } from '@/components/pago/pasos-pago'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AdornoEstrella } from '@/components/ui/marca/marca'
import type { PlanRegistro } from '../../_components/flujo-registro'
import { iniciarPagoRegistro, type IniciarPagoState } from '../../pagar/actions'
import estilos from './completar-membresia.module.css'

/*
  «COMPLETA TU MEMBRESÍA»  ·  (diseño aprobado el 23/11/2026)
  ---------------------------------------------------------------------------
  Para quien creó su cuenta y confirmó su correo pero no terminó de pagar:
  llega aquí al entrar (login), desde el enlace del correo o al volver de un
  pago rechazado. Los dos pasos hechos, el plan a elegir (el que había
  escogido, marcado) y el botón de pagar con el precio del elegido.
*/

export function CompletarMembresia({
  nombre,
  planes,
  planInicial,
}: {
  nombre: string
  planes: PlanRegistro[]
  planInicial: number
}) {
  const [planId, setPlanId] = useState(planInicial)
  const plan = planes.find((p) => p.id === planId) ?? planes[0]
  const [estado, pagar, abriendo] = useActionState(iniciarPagoRegistro, {} as IniciarPagoState)

  return (
    <main className={estilos.pagina}>
      <section className={estilos.tarjeta} aria-labelledby="titulo-completar">
        <PasosPago actual={3} />

        <div className={estilos.encabezado}>
          <h1 id="titulo-completar" className={estilos.titulo}>
            <span>
              Completa tu <em>membresía</em>
            </span>
            <AdornoEstrella />
          </h1>
          <p className={estilos.texto}>
            {nombre ? `Hola, ${nombre}. ` : ''}Tu cuenta ya está creada: solo falta el pago para activar tu
            carnet y tus beneficios.
          </p>
        </div>

        <div role="radiogroup" aria-label="Elige tu plan" className={estilos.planes}>
          {planes.map((p) => {
            const elegido = p.id === plan.id
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={elegido}
                className={estilos.plan}
                onClick={() => setPlanId(p.id)}
              >
                <span className={estilos.planNombre}>{p.nombre}</span>
                <span className={estilos.planPrecio}>{p.precioTexto}</span>
                <span className={estilos.planPeriodo}>cada {p.periodo}</span>
                {elegido && (
                  <span className={estilos.marca} aria-hidden="true">
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {estado.error && (
          <Alert tone="warning" title="No pudimos abrir el pago">
            {estado.error}
          </Alert>
        )}

        <form action={pagar} className={estilos.pie}>
          <input type="hidden" name="plan_id" value={plan.id} />
          <Button
            type="submit"
            variant="brand"
            size="lg"
            pildora
            fullWidth
            loading={abriendo}
            icon={<Lock size={18} aria-hidden="true" />}
          >
            Pagar {plan.precioTexto} con Mercado Pago
          </Button>
          <p className={estilos.nota}>
            Se renueva sola; puedes apagarlo cuando quieras. Pagas en Mercado Pago, con tarjeta.
          </p>
        </form>
      </section>
    </main>
  )
}
