import { SubidaImagen } from '@/components/imagenes/subida-imagen'
import { LIMITE_AVATARES } from '@/lib/imagenes/validacion'
import { guardarAvatarUsuario } from '@/app/OrumAdminLogin/usuarios/imagenes-actions'

/**
 * El avatar de un administrador o empleado.
 *
 * `acento="tinta"`: en Administración el primario NO es oro. Es una
 * herramienta de trabajo y el oro ahí sería ruido — la regla no admite
 * excepción por tratarse de un formulario pequeño.
 */
export function AvatarUsuario({
  perfilId,
  nombre,
  avatarUrl,
}: {
  perfilId: string
  nombre: string
  avatarUrl: string | null
}) {
  return (
    <SubidaImagen
      accion={guardarAvatarUsuario}
      campos={{ perfil_id: perfilId }}
      label="Archivo del avatar"
      help="PNG, JPEG o WebP. Máximo 512 KB. Se recorta a un círculo, así que conviene una foto centrada."
      urlActual={avatarUrl}
      nombre={nombre}
      limite={LIMITE_AVATARES}
      forma="circulo"
      etiquetaAccion="Guardar avatar"
    />
  )
}
