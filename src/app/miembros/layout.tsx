import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { RUTA_MANIFIESTO } from '@/lib/shared/manifiesto-app'

/*
  LA RAÍZ DE `/miembros`  ·  solo metadatos (29/10/2026)
  ---------------------------------------------------------------------------
  No pinta nada: existe para que el portal del socio y su pantalla de acceso
  enlacen la aplicación del SOCIO (abre en `/miembros`, la «O» dorada sobre
  blanco). Antes la enlazaba todo el sitio desde `app/manifest.ts`, también
  la portada pública, que no se instala. Lo que dice el manifiesto está en
  `lib/shared/manifiesto-app.ts`; su icono de iOS es el `apple-icon.png` de
  esta carpeta.
*/
export const metadata: Metadata = {
  manifest: RUTA_MANIFIESTO.socio,
}

export default function MiembrosRaiz({ children }: { children: ReactNode }) {
  return children
}
