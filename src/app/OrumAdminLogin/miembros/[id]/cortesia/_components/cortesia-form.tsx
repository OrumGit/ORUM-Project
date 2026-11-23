'use client'

import { useActionState } from 'react'
import { Gift } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { useCerrarCuando } from '@/components/shell/overlay-ruta'
import { anadirCortesia, type CortesiaState } from '@/app/OrumAdminLogin/miembros/actions'
import {
  DuracionCortesia,
  ETIQUETAS_CORTESIA,
  REGLAS_CORTESIA,
} from '@/app/OrumAdminLogin/miembros/_components/duracion-cortesia'
import { fechaCorta } from '@/lib/shared/calendario'
import type { DatosCortesia } from './datos'
import styles from '../../ficha.module.css'

/*
  AÑADIR DÍAS DE CORTESÍA  ·  el formulario (13/11/2026)
  ---------------------------------------------------------------------------
  Sin superficie propia: la pone quien lo usa (la ventana o la página). Dice
  primero, en palabras, qué queda igual —lo que pagó— y desde cuándo cuentan
  los días; luego pide cuántos (abre en «Hasta una fecha», el caso que lo
  pidió: «ampliarlo hasta el 31 de diciembre»). Decide el servidor
  (`anadirCortesia`).
*/

const INICIAL: CortesiaState = {}

export function CortesiaForm({ datos }: { datos: DatosCortesia }) {
  const [estado, accion, enviando] = useActionState(anadirCortesia, INICIAL)
  useCerrarCuando(estado.ok)
  const v = useValidacion(REGLAS_CORTESIA)

  return (
    <form action={accion} className={styles.renovar} {...v.propsFormulario}>
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS_CORTESIA} ir={v.ir} />

      <div className={styles.cortesiaAviso}>
        <p className={styles.revocarPlan}>
          {datos.finVigente
            ? `${datos.plan} · ${datos.vigenteEsCortesia ? 'su cortesía' : 'lo que pagó'} vale hasta el ${fechaCorta(datos.finVigente)}`
            : `${datos.plan} · hoy no tiene una membresía vigente`}
        </p>
        <ul className={styles.revocarLista}>
          <li>
            {datos.finVigente
              ? `Los días de cortesía empiezan el ${fechaCorta(datos.inicio)}, cuando termine.`
              : 'Los días de cortesía empiezan hoy.'}
          </li>
          <li>No se cobran ni suman a los ingresos: Métricas sigue contando solo lo que pagó.</li>
          <li>Conserva su plan, su número y su carnet.</li>
        </ul>
      </div>

      <input type="hidden" name="miembro_id" value={datos.miembroId} />
      {/* Las reglas de la duración solo corren con la cortesía marcada. */}
      <input type="hidden" name="es_cortesia" value="on" />

      <DuracionCortesia error={v.error} inicio={datos.inicio} sinPlan />

      <Button type="submit" loading={enviando} icon={<Gift size={16} />} className={styles.renovarBoton}>
        Añadir días de cortesía
      </Button>
    </form>
  )
}
