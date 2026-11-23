import { describe, it, expect } from 'vitest'
import {
  BUCKET_VIDEOS,
  DURACION_MAXIMA,
  ENCUADRE_CENTRADO,
  PESO_MAXIMO,
  TASA_AUDIO,
  TASA_VIDEO_MAXIMA,
  TASA_VIDEO_MINIMA,
  claveVideo,
  encuadreDesdePrevia,
  leerEncuadrePrevia,
  presentacionPrevia,
  previaDesdeEncuadre,
  esRutaVideo,
  medidasSalida,
  moverExtremo,
  recorteParaMarco,
  revisarTramo,
  rutaDesdeUrlPublica,
  rutaVideo,
  tasaVideo,
  textoTiempo,
  textoTiempoLargo,
  tramoInicial,
  urlPublicaVideo,
} from './video'

describe('el tiempo', () => {
  it('se escribe en minutos y segundos', () => {
    expect(textoTiempo(0)).toBe('0:00')
    expect(textoTiempo(65.4)).toBe('1:05')
    expect(textoTiempo(300)).toBe('5:00')
    expect(textoTiempoLargo(45)).toBe('45 s')
    expect(textoTiempoLargo(300)).toBe('5 min')
    expect(textoTiempoLargo(93)).toBe('1 min 33 s')
  })
})

describe('el tramo', () => {
  it('abre en todo el video, como mucho cinco minutos', () => {
    expect(tramoInicial(90)).toEqual({ inicio: 0, fin: 90 })
    expect(tramoInicial(600)).toEqual({ inicio: 0, fin: DURACION_MAXIMA })
  })

  it('mover un extremo lo deja dentro del video y con al menos un segundo', () => {
    expect(moverExtremo({ inicio: 0, fin: 60 }, 'inicio', 20, 60)).toEqual({ inicio: 20, fin: 60 })
    expect(moverExtremo({ inicio: 0, fin: 60 }, 'inicio', 70, 60)).toEqual({ inicio: 59, fin: 60 })
    expect(moverExtremo({ inicio: 10, fin: 60 }, 'fin', 5, 60)).toEqual({ inicio: 4, fin: 5 })
    expect(moverExtremo({ inicio: 10, fin: 60 }, 'fin', -3, 60)).toEqual({ inicio: 0, fin: 1 })
  })

  it('el otro extremo sigue para no pasar de cinco minutos', () => {
    // Video de 10 min: llevar el fin a 8:00 con el inicio en 0 arrastra el inicio a 3:00.
    expect(moverExtremo({ inicio: 0, fin: 300 }, 'fin', 480, 600)).toEqual({ inicio: 180, fin: 480 })
    expect(moverExtremo({ inicio: 100, fin: 400 }, 'inicio', 50, 600)).toEqual({ inicio: 50, fin: 350 })
  })

  it('dice por qué un tramo no se puede publicar', () => {
    expect(revisarTramo({ inicio: 0, fin: 30 }, 30)).toBeNull()
    expect(revisarTramo({ inicio: 0, fin: 301 }, 400)).toMatch(/como mucho 5 min/)
    expect(revisarTramo({ inicio: 10, fin: 10.5 }, 30)).toMatch(/al menos un segundo/)
    expect(revisarTramo({ inicio: 0, fin: 10 }, 0)).toMatch(/cuánto dura/)
  })
})

describe('el recorte', () => {
  it('un video 16:9 en un marco 16:9 se queda entero', () => {
    expect(recorteParaMarco({ ancho: 1920, alto: 1080 }, 16 / 9, ENCUADRE_CENTRADO)).toEqual({
      left: 0,
      top: 0,
      width: 1920,
      height: 1080,
    })
  })

  it('un 16:9 en el marco 4:3 del carrusel pierde los lados, centrado', () => {
    expect(recorteParaMarco({ ancho: 1920, alto: 1080 }, 4 / 3, ENCUADRE_CENTRADO)).toEqual({
      left: 240,
      top: 0,
      width: 1440,
      height: 1080,
    })
  })

  it('un vertical en el marco 16:9 pierde arriba y abajo, y el enfoque lo mueve sin salirse', () => {
    const arriba = recorteParaMarco({ ancho: 1080, alto: 1920 }, 16 / 9, { x: 0.5, y: 0, zoom: 1 })
    expect(arriba).toEqual({ left: 0, top: 0, width: 1080, height: 606 })
    const abajo = recorteParaMarco({ ancho: 1080, alto: 1920 }, 16 / 9, { x: 0.5, y: 1, zoom: 1 })
    expect(abajo.top + abajo.height).toBeLessThanOrEqual(1920)
  })

  it('acercar achica el recorte alrededor del enfoque', () => {
    const r = recorteParaMarco({ ancho: 1920, alto: 1080 }, 16 / 9, { x: 0.5, y: 0.5, zoom: 2 })
    expect(r).toEqual({ left: 480, top: 270, width: 960, height: 540 })
  })

  it('la salida no pasa de 720p, no agranda y es par', () => {
    expect(medidasSalida({ ancho: 1920, alto: 1080 })).toEqual({ ancho: 1280, alto: 720 })
    expect(medidasSalida({ ancho: 1440, alto: 1080 })).toEqual({ ancho: 960, alto: 720 })
    expect(medidasSalida({ ancho: 1080, alto: 1920 })).toEqual({ ancho: 720, alto: 1280 })
    expect(medidasSalida({ ancho: 641, alto: 361 })).toEqual({ ancho: 640, alto: 360 })
  })
})

describe('el peso', () => {
  it('cinco minutos con audio caben en el tope', () => {
    const tasa = tasaVideo(300, true)
    const bytes = ((tasa + TASA_AUDIO) * 300) / 8
    expect(bytes).toBeLessThan(PESO_MAXIMO)
  })

  it('un video corto usa el techo de calidad y uno larguísimo, el suelo', () => {
    expect(tasaVideo(20, true)).toBe(TASA_VIDEO_MAXIMA)
    expect(tasaVideo(10_000, false)).toBe(TASA_VIDEO_MINIMA)
  })
})

describe('las rutas', () => {
  it('solo acepta una ruta de video de su destino', () => {
    const clave = claveVideo(1_700_000_000_000, 0.123456)
    expect(esRutaVideo(rutaVideo('portada', clave), 'portada')).toBe(true)
    expect(esRutaVideo(rutaVideo('portada', clave), 'novedades')).toBe(false)
    expect(esRutaVideo('portada/../secreto.mp4', 'portada')).toBe(false)
    expect(esRutaVideo('portada/abc.mov', 'portada')).toBe(false)
  })

  it('arma la dirección pública y la vuelve a leer', () => {
    const url = urlPublicaVideo('https://x.supabase.co/', 'portada/abc-def.mp4')
    expect(url).toBe(`https://x.supabase.co/storage/v1/object/public/${BUCKET_VIDEOS}/portada/abc-def.mp4`)
    expect(rutaDesdeUrlPublica(url)).toBe('portada/abc-def.mp4')
  })

  it('saca la ruta de la dirección pública', () => {
    const url = `https://x.supabase.co/storage/v1/object/public/${BUCKET_VIDEOS}/novedades/abc-def.mp4`
    expect(rutaDesdeUrlPublica(url)).toBe('novedades/abc-def.mp4')
    expect(rutaDesdeUrlPublica('https://otro.com/a.mp4')).toBeNull()
  })
})

describe('la vista previa ajustada', () => {
  const v169 = { ancho: 1920, alto: 1080 }

  it('se guarda en fracciones del video entero', () => {
    expect(previaDesdeEncuadre(v169, 4 / 3, ENCUADRE_CENTRADO)).toEqual({ x: 0.125, y: 0, w: 0.75, h: 1 })
    expect(previaDesdeEncuadre(v169, 16 / 9, ENCUADRE_CENTRADO)).toEqual({ x: 0, y: 0, w: 1, h: 1 })
  })

  it('al volver a editar, el encuadre guardado vuelve igual', () => {
    const encuadre = { x: 0.3, y: 0.4, zoom: 1.8 }
    const previa = previaDesdeEncuadre(v169, 4 / 3, encuadre)
    const vuelta = encuadreDesdePrevia(previa, v169, 4 / 3)
    const otra = previaDesdeEncuadre(v169, 4 / 3, vuelta)
    expect(otra.x).toBeCloseTo(previa.x, 3)
    expect(otra.y).toBeCloseTo(previa.y, 3)
    expect(otra.w).toBeCloseTo(previa.w, 3)
  })

  it('sin encuadre, centrada y sin acercar', () => {
    expect(presentacionPrevia(null, 4 / 3)).toEqual({ posX: 50, posY: 50, escala: 1, origenX: 50, origenY: 50 })
  })

  it('el encuadre de un 16:9 en el marco 4:3, pegado a la izquierda', () => {
    const previa = previaDesdeEncuadre(v169, 4 / 3, { x: 0, y: 0.5, zoom: 1 })
    expect(presentacionPrevia(previa, 4 / 3)).toMatchObject({ posX: 0, escala: 1 })
  })

  it('acercado al doble en el centro: escala 2 alrededor del centro', () => {
    const previa = previaDesdeEncuadre(v169, 16 / 9, { x: 0.5, y: 0.5, zoom: 2 })
    expect(presentacionPrevia(previa, 16 / 9)).toEqual({ posX: 50, posY: 50, escala: 2, origenX: 50, origenY: 50 })
  })

  it('acercado en una esquina: el origen va a esa esquina', () => {
    const previa = previaDesdeEncuadre(v169, 16 / 9, { x: 0, y: 0, zoom: 2 })
    expect(presentacionPrevia(previa, 16 / 9)).toMatchObject({ escala: 2, origenX: 0, origenY: 0 })
  })

  it('lee el encuadre del formulario y rechaza lo que no vale', () => {
    expect(leerEncuadrePrevia('{"x":0.1,"y":0,"w":0.75,"h":1}')).toEqual({ x: 0.1, y: 0, w: 0.75, h: 1 })
    expect(leerEncuadrePrevia({ x: 0, y: 0, w: 1, h: 1 })).toEqual({ x: 0, y: 0, w: 1, h: 1 })
    expect(leerEncuadrePrevia('')).toBeNull()
    expect(leerEncuadrePrevia('no es json')).toBeNull()
    expect(leerEncuadrePrevia({ x: 0.5, y: 0, w: 0.75, h: 1 })).toBeNull()
    expect(leerEncuadrePrevia({ x: 0, y: 0, w: 0, h: 1 })).toBeNull()
    expect(leerEncuadrePrevia(null)).toBeNull()
  })
})
