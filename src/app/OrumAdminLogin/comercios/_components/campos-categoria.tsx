'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { SelectMenu } from '@/components/ui/select-menu'
import type { CategoriaConSubcategorias } from '@/lib/comercios/categorias-admin'
import {
  MAX_CATEGORIAS_COMERCIO,
  type FilaCategoriaComercio,
} from '@/lib/comercios/categorias-comercio'
import formulario from '@/styles/formulario.module.css'
import estilos from './campos-categoria.module.css'

type Props = {
  categorias: CategoriaConSubcategorias[]
  filasIniciales?: FilaCategoriaComercio[]
}

type FilaEstado = { clave: number; categoriaId: string; subcategoriaInicial: string }

/**
 * De 1 a 3 categorías de un comercio, cada una con su subcategoría opcional;
 * la comparten «Crear» y «Editar». Cada fila envía `categoria_id` y
 * `subcategoria_id` (siempre los dos, aunque vayan vacíos) para que el
 * servidor los empareje por posición. La subcategoría depende de la categoría:
 * al cambiar esta se reinicia. El servidor es quien decide (mínimo 1, sin
 * repetir, subcategoría de su categoría).
 */
export function CamposCategoria({ categorias, filasIniciales }: Props) {
  const [filas, setFilas] = useState<FilaEstado[]>(() =>
    filasIniciales && filasIniciales.length > 0
      ? filasIniciales.map((f, i) => ({
          clave: i,
          categoriaId: String(f.categoriaId),
          subcategoriaInicial: f.subcategoriaId ? String(f.subcategoriaId) : '',
        }))
      : [{ clave: 0, categoriaId: '', subcategoriaInicial: '' }],
  )
  const [siguiente, setSiguiente] = useState(filas.length)

  const elegidas = new Set(filas.map((f) => f.categoriaId).filter(Boolean))

  const cambiarCategoria = (clave: number, categoriaId: string) =>
    setFilas((fs) =>
      fs.map((f) => (f.clave === clave ? { ...f, categoriaId, subcategoriaInicial: '' } : f)),
    )
  const quitar = (clave: number) => setFilas((fs) => fs.filter((f) => f.clave !== clave))
  const anadir = () => {
    setFilas((fs) => [...fs, { clave: siguiente, categoriaId: '', subcategoriaInicial: '' }])
    setSiguiente((n) => n + 1)
  }

  return (
    <div className={estilos.lista}>
      {filas.map((fila, i) => {
        const subcategorias = categorias.find((c) => String(c.id) === fila.categoriaId)?.subcategorias ?? []
        // Solo se conserva la inicial mientras siga siendo de la categoría elegida.
        const inicial = subcategorias.some((s) => String(s.id) === fila.subcategoriaInicial)
          ? fila.subcategoriaInicial
          : ''
        const ayuda = !fila.categoriaId
          ? 'Elige primero una categoría.'
          : subcategorias.length === 0
            ? 'Esta categoría aún no tiene subcategorías.'
            : undefined
        const numero = filas.length > 1 ? ` ${i + 1}` : ''

        return (
          <div key={fila.clave} className={estilos.fila}>
            <div className={formulario.pareja}>
              <Field label={`Categoría${numero}`} optional={i > 0}>
                <SelectMenu
                  name="categoria_id"
                  etiqueta={`Categoría${numero}`}
                  placeholder="Elige una categoría"
                  value={fila.categoriaId}
                  onChange={(valor) => cambiarCategoria(fila.clave, valor)}
                  opciones={[
                    ...(i > 0 ? [{ value: '', label: 'Sin elegir' }] : []),
                    ...categorias
                      .filter((c) => String(c.id) === fila.categoriaId || !elegidas.has(String(c.id)))
                      .map((c) => ({ value: String(c.id), label: c.nombre })),
                  ]}
                />
              </Field>

              <Field label={`Subcategoría${numero}`} optional help={ayuda}>
                <SelectMenu
                  key={fila.categoriaId}
                  name="subcategoria_id"
                  etiqueta={`Subcategoría${numero}`}
                  placeholder="Sin subcategoría"
                  defaultValue={inicial}
                  opciones={[
                    { value: '', label: 'Sin subcategoría' },
                    ...subcategorias.map((s) => ({ value: String(s.id), label: s.nombre })),
                  ]}
                />
              </Field>
            </div>

            {filas.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<X size={14} aria-hidden="true" />}
                onClick={() => quitar(fila.clave)}
              >
                Quitar categoría{numero}
              </Button>
            )}
          </div>
        )
      })}

      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<Plus size={14} aria-hidden="true" />}
          disabled={filas.length >= MAX_CATEGORIAS_COMERCIO}
          onClick={anadir}
        >
          Añadir otra categoría
        </Button>
        <p className={estilos.nota}>
          Hasta {MAX_CATEGORIAS_COMERCIO} categorías, cada una con su subcategoría.
        </p>
      </div>
    </div>
  )
}
