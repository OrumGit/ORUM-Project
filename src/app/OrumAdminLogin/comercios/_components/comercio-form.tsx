'use client'

import { useActionState, useState } from 'react'
import { Store } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Copiar } from '@/components/ui/copiar'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { correo, largo, obligatorio } from '@/lib/validacion/reglas'
import { Stack } from '@/components/ui/layout'
import { Switch } from '@/components/ui/toggle'
import { useCerrarOverlay } from '@/components/shell/overlay-ruta'
import { crearComercio, type CrearComercioState } from '../actions'
import type { CategoriaConSubcategorias } from '@/lib/comercios/categorias-admin'
import { CamposCategoria } from './campos-categoria'
import styles from '@/styles/formulario.module.css'

const estadoInicial: CrearComercioState = {}

const REGLAS = {
  correo: [obligatorio('Escribe el correo: será su usuario de acceso.'), correo],
  nombre: [obligatorio('Escribe el nombre del comercio.'), largo(2, 80, 'El nombre')],
  descripcion: [largo(3, 280, 'La descripción')],
}

const ETIQUETAS: Record<string, string> = {
  correo: 'Correo electrónico',
  nombre: 'Nombre del comercio',
  descripcion: 'Descripción',
}

/**
 * El estado vive en `FormularioComercio`; esta capa solo lo remonta (vía `key`)
 * al pulsar «Crear otro», para volver a un formulario limpio sin navegar.
 */
export function ComercioForm(props: { categorias: CategoriaConSubcategorias[] }) {
  const [instancia, setInstancia] = useState(0)
  return (
    <FormularioComercio
      key={instancia}
      {...props}
      onCrearOtro={() => setInstancia((n) => n + 1)}
    />
  )
}

function FormularioComercio({
  categorias,
  onCrearOtro,
}: {
  categorias: CategoriaConSubcategorias[]
  onCrearOtro: () => void
}) {
  const cerrar = useCerrarOverlay()
  const [state, formAction, pending] = useActionState(crearComercio, estadoInicial)
  const v = useValidacion(REGLAS)

  if (state.ok && state.email) {
    return <Credenciales estado={state} onCerrar={cerrar} onCrearOtro={onCrearOtro} />
  }

  return (
    <>
      <form action={formAction} className={styles.formulario} {...v.propsFormulario}>
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

        <Stack gap={5}>
          <Field
            label="Correo electrónico"
            help="Será el usuario con el que el comercio inicia sesión en su herramienta."
            error={v.error('correo')}
          >
            <Input name="correo" type="email" autoComplete="email" required autoFocus />
          </Field>

          <Field label="Nombre del comercio" error={v.error('nombre')}>
            <Input name="nombre" required />
          </Field>

          <Field label="Descripción" optional error={v.error('descripcion')}>
            <Input name="descripcion" />
          </Field>

          <CamposCategoria categorias={categorias} />

          {/* Dónde se ve (07/11/2026): un comercio recién creado aún no tiene
              logotipo, fotos ni promociones, así que arranca OCULTO y el
              administrador lo muestra cuando esté listo, desde su ficha. */}
          <fieldset className={styles.grupoDias}>
            <legend className={styles.grupoDiasTitulo}>¿Dónde se ve?</legend>
            <p className={styles.grupoDiasAyuda}>
              Déjalo oculto mientras cargas su logotipo, sus fotos y sus promociones. Podrás
              mostrarlo después desde su ficha.
            </p>
            <Switch
              name="visible_publico"
              label="Portal inicial"
              description="La portada y el directorio que ve cualquier persona."
            />
            <Switch
              name="visible_miembros"
              label="Portal de miembros"
              description="El inicio de los socios, donde usan sus beneficios."
            />
          </fieldset>

          <Switch
            name="indexable"
            defaultChecked
            label="Aparecer en buscadores"
            description="Google y Bing podrán mostrar la ficha pública de este comercio. Apágalo mientras sean datos de prueba."
          />

          <p className={styles.nota}>
            Al guardar se envía un correo con un enlace de un solo uso para activar
            el acceso.
          </p>
        </Stack>

        <div className={styles.acciones}>
          <Button type="submit" loading={pending} icon={<Store size={16} />}>
            Crear comercio
          </Button>
          <Button type="button" variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  )
}

function Credenciales({
  estado,
  onCerrar,
  onCrearOtro,
}: {
  estado: CrearComercioState
  onCerrar: () => void
  onCrearOtro: () => void
}) {
  return (
    <>
      <div className={styles.credenciales}>
        <Alert tone="success" title="Comercio creado" />

        {estado.aviso && <Alert tone="warning">{estado.aviso}</Alert>}

        <Alert tone="success" title="Correo de activación enviado">
          Se envió un enlace de un solo uso a {estado.email} para que el comercio
          elija su propia contraseña.
        </Alert>

        <div className={styles.credencial}>
          <span className={styles.credencialEtiqueta}>Correo de acceso</span>
          <Copiar valor={estado.email ?? ''} label="Copiar correo">
            <span className={styles.credencialValor}>{estado.email}</span>
          </Copiar>
        </div>

        <div className={styles.acciones}>
          <Button type="button" onClick={onCerrar}>
            Ir a la lista
          </Button>
          <Button type="button" variant="secondary" onClick={onCrearOtro}>
            Crear otro
          </Button>
        </div>
      </div>
    </>
  )
}
