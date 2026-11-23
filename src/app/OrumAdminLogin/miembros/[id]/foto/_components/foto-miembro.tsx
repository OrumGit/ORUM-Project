import { SubidaImagen } from '@/components/imagenes/subida-imagen'
import { LIMITE_AVATARES } from '@/lib/imagenes/validacion'
import { guardarFotoMiembro } from '@/app/OrumAdminLogin/miembros/imagenes-actions'

/**
 * La foto del socio, desde el mostrador.
 *
 * Es la misma que aparece en su carnet, así que el texto de ayuda lo dice: el
 * administrador tiene que saber dónde va a acabar lo que sube.
 *
 * `acento="tinta"`: estamos en Administración.
 */
export function FotoMiembro({
  miembroId,
  nombre,
  fotoUrl,
}: {
  miembroId: number
  nombre: string
  fotoUrl: string | null
}) {
  return (
    <SubidaImagen
      accion={guardarFotoMiembro}
      campos={{ id: miembroId }}
      label="Archivo de la foto"
      help="PNG, JPEG o WebP. Máximo 512 KB. Es la foto que el socio verá en su carnet."
      urlActual={fotoUrl}
      nombre={nombre}
      limite={LIMITE_AVATARES}
      forma="circulo"
      etiquetaAccion="Guardar foto"
      declaracion="Confirmo que el socio me entregó esta foto y tiene derecho a usarla."
      verificarCara
    />
  )
}
