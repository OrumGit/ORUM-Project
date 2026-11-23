'use client'

import { useEffect, useState } from 'react'
import { EditorVideo } from '@/components/videos/editor-video'
import { exportarVideo } from '@/components/videos/exportar-video'
import { CarruselFotos } from '@/components/ui/carrusel-fotos'
import { VideoNovedad } from '@/components/novedades/video-novedad'
import {
  PROPORCION_DESTINO,
  medidasSalida,
  previaDesdeEncuadre,
  type DestinoVideo,
} from '@/lib/videos/video'

/** Fabrica el video de prueba con Mediabunny: no depende de que la pestaña pinte. */
async function videoDePrueba(segundos: number): Promise<File> {
  const mb = await import('mediabunny')
  const lienzo = document.createElement('canvas')
  lienzo.width = 1280
  lienzo.height = 720
  const ctx = lienzo.getContext('2d')!
  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() })
  // Por software: el de hardware se queda esperando si la pestaña no se ve.
  const fuente = new mb.CanvasSource(lienzo, {
    codec: 'avc',
    quality: new mb.Quality('medium'),
    hardwareAcceleration: 'prefer-software',
  })
  output.addVideoTrack(fuente, { frameRate: 30 })
  await output.start()
  const cuadros = segundos * 30
  for (let i = 0; i < cuadros; i++) {
    const t = i / 30
    ctx.fillStyle = '#1d3557'
    ctx.fillRect(0, 0, 1280, 720)
    ctx.fillStyle = '#e9c46a'
    ctx.beginPath()
    ctx.arc(80 + (t / segundos) * 1120, 360, 90, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 72px sans-serif'
    ctx.fillText(`${t.toFixed(1)} s`, 520, 140)
    await fuente.add(t, 1 / 30)
  }
  await output.finalize()
  return new File([output.target.buffer!], 'prueba.mp4', { type: 'video/mp4' })
}

export function VistaEditorVideo({ destino, segundos }: { destino: DestinoVideo; segundos: number }) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)
  const [preparado, setPreparado] = useState<string | null>(null)

  /** Solo prepara (de 2 a 8 s, centrado, sin sonido) y enseña el MP4: comprueba la salida sin subir nada. */
  async function soloPreparar() {
    if (!archivo) return
    setResultado('Preparando…')
    // ENTERO, como se prepara ahora: la vista previa se encuadra aparte.
    const salida = medidasSalida({ ancho: 1280, alto: 720 })
    const mp4 = await exportarVideo(archivo, {
      tramo: { inicio: 2, fin: 8 },
      recorte: null,
      salida,
      sinSonido: true,
      alProgresar: () => {},
    })
    const url = URL.createObjectURL(mp4)
    const v = document.createElement('video')
    v.src = url
    await new Promise((ok) => v.addEventListener('loadedmetadata', ok, { once: true }))
    setPreparado(url)
    setResultado(`MP4 ${v.videoWidth}×${v.videoHeight} · ${v.duration.toFixed(2)} s · ${(mp4.size / 1024).toFixed(0)} KB`)
  }

  useEffect(() => {
    let vivo = true
    void videoDePrueba(segundos).then((f) => vivo && setArchivo(f))
    return () => {
      vivo = false
    }
  }, [segundos])

  if (!archivo) return <p>Fabricando el video de prueba…</p>
  return (
    <>
      <EditorVideo
        archivo={archivo}
        destino={destino}
        onListo={(v) => setResultado(`Subido: ${v.ruta} · ${v.duracion.toFixed(1)} s`)}
        onCancelar={() => setResultado('Cancelado')}
        onElegirOtro={() => setResultado('Elegir otro')}
      />
      <button type="button" onClick={soloPreparar} data-solo-preparar="">
        Solo preparar (sin subir)
      </button>
      {resultado && <p data-resultado="">{resultado}</p>}
      {preparado && <video src={preparado} controls muted data-preparado="" style={{ width: '100%' }} />}
      {/* Y como en una tarjeta de Novedades (16:9), con otro encuadre. */}
      {preparado && (
        <div style={{ position: 'relative', maxWidth: 480, aspectRatio: '16 / 9', marginTop: 24 }} data-novedad-prueba="">
          <VideoNovedad
            video={preparado}
            portada={null}
            encuadre={previaDesdeEncuadre({ ancho: 1280, alto: 720 }, PROPORCION_DESTINO.novedades, {
              x: 0.5,
              y: 0.5,
              zoom: 1.4,
            })}
            titulo="Video de prueba"
          />
        </div>
      )}
      {/* El MP4 preparado dentro del carrusel de la portada, entre dos fotos. */}
      {preparado && (
        <div style={{ maxWidth: 480, aspectRatio: '4 / 3', marginTop: 24 }} data-carrusel-prueba="">
          <CarruselFotos
            etiqueta="Prueba del carrusel con video"
            fotos={[
              { url: '/icons/socio-512.png', alt: 'Foto 1' },
              {
                url: '/icons/socio-512.png?2',
                alt: 'Video de prueba',
                video: preparado,
                // Un encuadre de ejemplo: a la izquierda y acercado.
                encuadre: previaDesdeEncuadre({ ancho: 1280, alto: 720 }, PROPORCION_DESTINO.portada, {
                  x: 0.3,
                  y: 0.5,
                  zoom: 1.5,
                }),
              },
              { url: '/icons/socio-512.png?3', alt: 'Foto 3' },
            ]}
          />
        </div>
      )}
    </>
  )
}
