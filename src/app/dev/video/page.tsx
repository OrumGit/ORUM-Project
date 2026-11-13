import { notFound } from 'next/navigation'
import portal from '@/app/miembros/(portal)/portal.module.css'
import { VistaEditorVideo } from './vista'

export const metadata = { title: 'Vista previa del editor de video · ORUM' }

/**
 * El editor de video con un video de PRUEBA que se fabrica en el navegador
 * (12 s, o `?segundos=`; 1280 × 720, un círculo que cruza y un reloj), solo en desarrollo.
 * `?destino=portada` usa el marco 4:3 del carrusel; por defecto, el 16:9 de
 * novedades. Preparar funciona de verdad; subir pide la dirección firmada a
 * la acción real, que sin sesión de administrador contesta con un error y
 * no sube nada.
 */
export default async function VistaPreviaVideo({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string; segundos?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { destino, segundos } = await searchParams
  // `?segundos=60`: un video más largo, para ver el contador de cuánto falta.
  const duracion = Math.min(300, Math.max(4, Number(segundos) || 12))
  return (
    <div className={portal.portal} data-theme="light" style={{ padding: 24, maxWidth: 780, margin: '0 auto' }}>
      <VistaEditorVideo destino={destino === 'portada' ? 'portada' : 'novedades'} segundos={duracion} />
    </div>
  )
}
