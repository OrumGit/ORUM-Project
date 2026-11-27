import { arranqueAppPanel, esLlaveValida, llaveDelArchivo } from '@/lib/auth/app-panel'
import { respuestaManifiesto } from '@/lib/shared/manifiesto-app'

/*
  El manifiesto de la app del PANEL, en una dirección que sale de su llave
  (`lib/auth/app-panel.ts`). Con otra llave, «no encontrado», como cualquier
  dirección inventada. Su dirección de arranque lleva la llave: es lo que
  hace que la app instalada abra siempre.
*/

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const llave = llaveDelArchivo((await params).archivo)
  if (!llave || !(await esLlaveValida(llave))) {
    return new Response('Not Found', { status: 404 })
  }
  return respuestaManifiesto('admin', { start_url: arranqueAppPanel(llave) })
}
