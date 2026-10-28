import {
  BarChart3,
  CreditCard,
  Home,
  Images,
  LayoutGrid,
  Megaphone,
  MessageSquareText,
  Search,
  ScrollText,
  Store,
  UserPlus,
  Users,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import type { RolCodigo } from '@/lib/supabase/database.types'

/*
  Fuente única de la navegación del portal administrativo.

  Los destinos se filtran por rol AQUÍ, pero eso es solo presentación: la
  autorización real sigue viviendo en `requireRol` dentro de cada página y en
  cada server action. Ocultar un enlace no protege nada.

  Los ítems se nombran por lo que CONTIENEN ("Miembros", "Comercios"), no con
  paraguas vagos: la especificidad hace la navegación predecible.
*/

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /**
   * Prefijo que marca este ítem como activo. Por defecto es `href`.
   * `/admin` necesita coincidencia exacta o estaría siempre activo.
   */
  match?: string
  exact?: boolean
}

export type NavGroup = {
  /** Encabezado del grupo. Se omite en el primero, que no necesita título. */
  label?: string
  items: NavItem[]
}

/** Destino de la barra inferior en móvil. */
export type TabItem =
  | ({ kind: 'link' } & NavItem)
  | { kind: 'search'; label: string; icon: LucideIcon }
  | { kind: 'more'; label: string; icon: LucideIcon }

const INICIO: NavItem = { href: '/admin', label: 'Inicio', icon: Home, exact: true }
const MIEMBROS: NavItem = { href: '/admin/miembros', label: 'Miembros', icon: Users }
const COMERCIOS: NavItem = { href: '/admin/comercios', label: 'Comercios', icon: Store }
const USUARIOS: NavItem = { href: '/admin/usuarios', label: 'Usuarios', icon: UserCog }
const PLANES: NavItem = { href: '/admin/planes', label: 'Planes', icon: CreditCard }
const ANUNCIOS: NavItem = { href: '/admin/anuncios', label: 'Novedades', icon: Megaphone }
const RESENAS: NavItem = { href: '/admin/resenas', label: 'Reseñas', icon: MessageSquareText }
const PUBLICIDAD: NavItem = { href: '/admin/publicidad', label: 'Publicidad', icon: Images }
const METRICAS: NavItem = { href: '/admin/metricas', label: 'Métricas', icon: BarChart3 }
const BITACORA: NavItem = { href: '/admin/bitacora', label: 'Bitácora', icon: ScrollText }

/*
  "Mi contraseña" NO está aquí a propósito.

  La barra de opciones es para los sitios donde se trabaja —miembros,
  comercios, métricas—, y cambiar la contraseña se hace una vez cada muchos
  meses. Tenerla fija ocupaba un hueco de la barra para una tarea que además
  YA vive en el menú de la cuenta: la misma acción listada dos veces en la
  misma pantalla.

  Vive en el menú de la cuenta (escritorio) y en la hoja "Más" (móvil), que es
  donde la gente busca lo suyo. Ambos son parte del shell, no de esta lista.
*/

/**
 * Grupos de la barra de opciones (rediseño del 04/10/2026; antes, la barra
 * lateral), según el rol. Cada grupo se separa del siguiente con un filo.
 */
export function navegacionPara(rol: RolCodigo): NavGroup[] {
  if (rol === 'super_admin') {
    return [
      // Reseñas, con los comercios: se revisan a diario (29/10/2026).
      { items: [INICIO, MIEMBROS, COMERCIOS, RESENAS] },
      // Consultar, no operar. Métricas va primero: se mira a diario; la
      // bitácora solo cuando hay que averiguar quién hizo algo.
      { label: 'Análisis', items: [METRICAS, BITACORA] },
      { label: 'El club', items: [PLANES, ANUNCIOS, PUBLICIDAD, USUARIOS] },
    ]
  }

  // Empleado: solo opera con miembros.
  return [{ items: [INICIO, MIEMBROS] }]
}

/**
 * Barra inferior de móvil. Máximo 5 destinos, en la zona del pulgar.
 *
 * Para el empleado, "Vender" apunta directo al flujo estrella —registrar
 * cliente y venderle la membresía—, que es lo que hace todo el día.
 */
export function tabsPara(rol: RolCodigo): TabItem[] {
  const buscar = { kind: 'search', label: 'Buscar', icon: Search } as const
  const mas = { kind: 'more', label: 'Más', icon: LayoutGrid } as const

  if (rol === 'super_admin') {
    return [
      { kind: 'link', ...INICIO },
      { kind: 'link', ...MIEMBROS },
      { kind: 'link', ...COMERCIOS },
      buscar,
      mas,
    ]
  }

  return [
    { kind: 'link', ...INICIO },
    { kind: 'link', ...MIEMBROS },
    buscar,
    {
      kind: 'link',
      href: '/admin/miembros/nuevo',
      label: 'Vender',
      icon: UserPlus,
    },
    mas,
  ]
}

/**
 * ¿Está activa esta ruta?
 *
 * Coincidencia por prefijo para que `/admin/miembros/123/editar` mantenga
 * "Miembros" resaltado, salvo cuando el ítem pide coincidencia exacta.
 */
export function esRutaActiva(item: NavItem, pathname: string): boolean {
  const base = item.match ?? item.href
  if (item.exact) return pathname === base
  return pathname === base || pathname.startsWith(`${base}/`)
}
