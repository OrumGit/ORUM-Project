import { respuestaManifiesto } from '@/lib/shared/manifiesto-app'

/*
  El manifiesto de la aplicación instalable de `/admin`. Lo que dice y por
  qué hay tres está en `lib/shared/manifiesto-app.ts`. Estático: no lee la
  sesión.
*/

export const dynamic = 'force-static'

export function GET() {
  return respuestaManifiesto('admin')
}
