'use client'

import { useActionState } from 'react'
import { Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { SelectMenu } from '@/components/ui/select-menu'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { obligatorio } from '@/lib/validacion/reglas'
import { useCerrarCuando } from '@/components/shell/overlay-ruta'
import { retirarFotoMiembro } from '@/app/OrumAdminLogin/miembros/imagenes-actions'
import { ESTADO_SUBIDA_INICIAL } from '@/lib/imagenes/estado'
import { ETIQUETA_MOTIVO, MOTIVOS_RETIRADA } from '@/lib/imagenes/derechos'
import styles from '../../../ficha.module.css'

const REGLAS = { motivo: [obligatorio('Elige el motivo por el que se retira la foto.')] }
const ETIQUETAS: Record<string, string> = { motivo: 'Motivo' }

/* Sin `Card`: la superficie la pone quien lo usa (el overlay o la página). */
export function RetirarFotoForm({ miembroId, nombre }: { miembroId: number; nombre: string }) {
  const [estado, accion, enviando] = useActionState(retirarFotoMiembro, ESTADO_SUBIDA_INICIAL)
  useCerrarCuando(estado.ok)
  const v = useValidacion(REGLAS)

  return (
    <form action={accion} className={styles.renovar} {...v.propsFormulario}>
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

      <Alert tone="warning">
        Se borrará la foto de {nombre} y su carnet volverá a mostrar las iniciales. La acción
        queda registrada en la bitácora con el motivo.
      </Alert>

      <input type="hidden" name="id" value={miembroId} />

      <div className={styles.renovarCampos}>
        <Field label="Motivo" error={v.error('motivo')}>
          <SelectMenu
            name="motivo"
            etiqueta="Motivo"
            placeholder="Elige un motivo…"
            opciones={MOTIVOS_RETIRADA.map((m) => ({ value: m, label: ETIQUETA_MOTIVO[m] }))}
          />
        </Field>
      </div>

      <Button
        type="submit"
        loading={enviando}
        icon={<Trash2 size={16} />}
        className={styles.renovarBoton}
      >
        Retirar foto
      </Button>
    </form>
  )
}
