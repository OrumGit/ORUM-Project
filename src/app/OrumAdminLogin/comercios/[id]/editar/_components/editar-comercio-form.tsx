'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Save } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Switch } from '@/components/ui/toggle'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { correo, largo, obligatorio } from '@/lib/validacion/reglas'
import { useCerrarCuando, useCerrarOverlay } from '@/components/shell/overlay-ruta'
import { editarComercio, type EditarComercioState } from '../../../actions'
import type { CategoriaConSubcategorias } from '@/lib/comercios/categorias-admin'
import type { FilaCategoriaComercio } from '@/lib/comercios/categorias-comercio'
import { CamposCategoria } from '../../../_components/campos-categoria'
import formStyles from '@/styles/formulario.module.css'
import styles from './editar-comercio-form.module.css'

type ComercioInicial = {
  id: number
  perfil_id: string | null
  nombre: string
  descripcion: string | null
  /** Sus categorías (1–3) con su subcategoría opcional, en orden. */
  categorias: FilaCategoriaComercio[]
  indexable: boolean
  /** Correo real de Auth, o cadena vacía si no tiene cuenta. */
  correo: string
}

const estadoInicial: EditarComercioState = {}

const DESCRIPCION_MAXIMA = 280

/* El correo puede quedar vacío: un comercio sin cuenta de acceso. */
const REGLAS = {
  nombre: [obligatorio('Escribe el nombre del comercio.'), largo(2, 80, 'El nombre')],
  descripcion: [largo(3, DESCRIPCION_MAXIMA, 'La descripción')],
  correo: [correo],
}

const ETIQUETAS: Record<string, string> = {
  nombre: 'Nombre',
  descripcion: 'Descripción',
  correo: 'Correo de acceso',
}

type Props = {
  comercio: ComercioInicial
  categorias: CategoriaConSubcategorias[]
  /**
   * En la pestaña «Datos» de la ficha, y no en una ventana: «Cancelar»
   * descarta lo escrito (no hay ventana que cerrar) y al guardar se queda
   * donde está, con un aviso.
   */
  enPagina?: boolean
}

/** Esta capa solo remonta el formulario (vía `key`) para descartar lo escrito. */
export function EditarComercioForm(props: Props) {
  const [instancia, setInstancia] = useState(0)
  return <Formulario key={instancia} {...props} onDescartar={() => setInstancia((n) => n + 1)} />
}

function Formulario({
  comercio,
  categorias,
  enPagina = false,
  onDescartar,
}: Props & { onDescartar: () => void }) {
  const [state, formAction, pending] = useActionState(editarComercio, estadoInicial)
  const cerrar = useCerrarOverlay()
  useCerrarCuando(enPagina ? false : state.ok)
  const v = useValidacion(REGLAS)
  const { toast } = useToast()
  const [largoDescripcion, setLargoDescripcion] = useState((comercio.descripcion ?? '').length)

  // En la página, guardar no cierra nada: se avisa y lo guardado pasa a ser lo original.
  const anunciado = useRef<EditarComercioState | null>(null)
  const { marcarGuardado } = v
  useEffect(() => {
    if (!enPagina || !state.ok || anunciado.current === state) return
    anunciado.current = state
    marcarGuardado()
    toast({ tone: 'success', title: 'Cambios guardados' })
  }, [enPagina, state, toast, marcarGuardado])

  return (
    <form
      action={formAction}
      className={[formStyles.formulario, styles.formulario].join(' ')}
      {...v.propsFormulario}
    >
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

      <input type="hidden" name="id" value={comercio.id} />
      <input type="hidden" name="perfil_id" value={comercio.perfil_id ?? ''} />
      <input type="hidden" name="correo_original" value={comercio.correo} />

      <fieldset className={styles.bloque}>
        <legend className={styles.titulo}>El comercio</legend>
        <Field label="Nombre" error={v.error('nombre')}>
          <Input name="nombre" defaultValue={comercio.nombre} required autoFocus={!enPagina} />
        </Field>

        <CamposCategoria categorias={categorias} filasIniciales={comercio.categorias} />

        <Field
          label="Descripción"
          optional
          help={`Se ve en la ficha del comercio. ${largoDescripcion} / ${DESCRIPCION_MAXIMA}`}
          error={v.error('descripcion')}
        >
          <Textarea
            name="descripcion"
            defaultValue={comercio.descripcion ?? ''}
            rows={3}
            maxLength={DESCRIPCION_MAXIMA}
            onChange={(e) => setLargoDescripcion(e.target.value.length)}
          />
        </Field>
      </fieldset>

      <fieldset className={styles.bloque}>
        <legend className={styles.titulo}>Acceso</legend>
        <Field
          label="Correo de acceso"
          help="Con él entra el comercio a su herramienta. Cambiarlo cambia su usuario."
          error={v.error('correo')}
        >
          <Input name="correo" type="email" defaultValue={comercio.correo} autoComplete="email" />
        </Field>
      </fieldset>

      <fieldset className={styles.bloque}>
        <legend className={styles.titulo}>Buscadores</legend>
        <Switch
          name="indexable"
          defaultChecked={comercio.indexable}
          label="Aparecer en buscadores"
          description="Google y Bing podrán mostrar la ficha pública de este comercio. Apágalo mientras sean datos de prueba."
        />
      </fieldset>

      <div className={styles.pie} data-en-pagina={enPagina || undefined}>
        {/* Se anuncia al aparecer: quien edita sabe que aún no está guardado. */}
        <span className={styles.aviso} role="status">
          {v.sinGuardar && (
            <>
              <span className={styles.punto} aria-hidden="true" />
              Tienes cambios sin guardar
            </>
          )}
        </span>
        <Button
          type="button"
          variant="secondary"
          onClick={enPagina ? onDescartar : cerrar}
          disabled={enPagina && !v.sinGuardar}
          className={styles.descartar}
        >
          {enPagina ? 'Descartar' : 'Cancelar'}
        </Button>
        <Button
          type="submit"
          variant="brand"
          loading={pending}
          icon={<Save size={16} />}
          className={styles.guardar}
        >
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}
