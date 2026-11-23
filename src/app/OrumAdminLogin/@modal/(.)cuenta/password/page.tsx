import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { PasswordForm } from '@/app/OrumAdminLogin/cuenta/password/_components/password-form'

/**
 * Cambiar contraseña, interceptado.
 *
 * Cambiar la contraseña no es ir a otro sitio: es una tarea corta que se hace
 * y se cierra. Antes navegaba a su propia página y, al terminar, dejaba al
 * usuario en una pantalla que no era la suya.
 *
 * `detent="medium"`: son tres campos y el medidor de fortaleza. No necesita
 * la pantalla entera, y dejar ver el fondo recuerda que se vuelve a lo que
 * se estaba haciendo.
 */
export default function PasswordInterceptado() {
  // La protección la aplica el layout de /admin.
  return (
    <OverlayRuta
      title="Mi contraseña"
      description="Deberás usar la nueva la próxima vez que inicies sesión."
      width="480px"
      detent="medium"
    >
      <PasswordForm />
    </OverlayRuta>
  )
}
