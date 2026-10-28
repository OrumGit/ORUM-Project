import {
  BarChart3,
  CreditCard,
  Images,
  KeyRound,
  Megaphone,
  ScrollText,
  Store,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { RolCodigo } from '@/lib/supabase/database.types'

/*
  LO QUE SE PUEDE HACER DESDE EL BUSCADOR  ·  destinos y «crear»
  ---------------------------------------------------------------------------
  El buscador de la barra de arriba (`BuscadorPanel`) mezcla dos cosas: los
  miembros que coinciden con lo escrito y estas acciones. Vivían dentro de la
  antigua paleta de comandos; se sacaron aquí al retirarla (15/10/2026: «no
  quiero que aparezcan comandos; además quiero facilidad»).

  El rol filtra lo que se OFRECE, nada más: la autorización real sigue en
  `requireRol` de cada página y acción.
*/

export type AccionPanel = {
  id: string
  label: string
  /** Una pista corta debajo del nombre. */
  hint?: string
  icon: LucideIcon
  href: string
  soloSuperAdmin?: boolean
  /** Palabras que también la encuentran («vender», «socio»…). */
  claves?: string
}

const ACCIONES: AccionPanel[] = [
  {
    id: 'nuevo-miembro',
    label: 'Registrar miembro y vender membresía',
    hint: 'Socio, acceso y primera membresía',
    icon: UserPlus,
    href: '/admin/miembros/nuevo',
    claves: 'vender socio cliente nuevo alta',
  },
  { id: 'miembros', label: 'Ver miembros', icon: Users, href: '/admin/miembros', claves: 'socios' },
  {
    id: 'comercios',
    label: 'Ver comercios',
    icon: Store,
    href: '/admin/comercios',
    soloSuperAdmin: true,
    claves: 'aliados negocios',
  },
  {
    id: 'nuevo-comercio',
    label: 'Nuevo comercio aliado',
    icon: Store,
    href: '/admin/comercios/nuevo',
    soloSuperAdmin: true,
    claves: 'crear aliado negocio',
  },
  {
    id: 'metricas',
    label: 'Ver métricas',
    icon: BarChart3,
    href: '/admin/metricas',
    soloSuperAdmin: true,
    claves: 'estadisticas ventas cifras',
  },
  {
    id: 'bitacora',
    label: 'Ver bitácora',
    hint: 'Quién hizo qué',
    icon: ScrollText,
    href: '/admin/bitacora',
    soloSuperAdmin: true,
    claves: 'historial cambios actividad',
  },
  {
    id: 'planes',
    label: 'Ver planes de membresía',
    icon: CreditCard,
    href: '/admin/planes',
    soloSuperAdmin: true,
    claves: 'precios',
  },
  {
    id: 'usuarios',
    label: 'Ver usuarios del panel',
    icon: UserCog,
    href: '/admin/usuarios',
    soloSuperAdmin: true,
    claves: 'equipo empleados',
  },
  {
    id: 'nuevo-usuario',
    label: 'Nuevo usuario del panel',
    icon: UserCog,
    href: '/admin/usuarios/nuevo',
    soloSuperAdmin: true,
    claves: 'empleado',
  },
  {
    id: 'novedades',
    label: 'Ver novedades',
    icon: Megaphone,
    href: '/admin/anuncios',
    soloSuperAdmin: true,
    claves: 'anuncios noticias',
  },
  {
    id: 'nueva-novedad',
    label: 'Publicar una novedad',
    icon: Megaphone,
    href: '/admin/anuncios/nuevo',
    soloSuperAdmin: true,
    claves: 'anuncio',
  },
  {
    id: 'publicidad',
    label: 'Publicidad de la portada',
    icon: Images,
    href: '/admin/publicidad',
    soloSuperAdmin: true,
    claves: 'carrusel imagenes',
  },
  {
    id: 'password',
    label: 'Cambiar mi contraseña',
    icon: KeyRound,
    href: '/admin/cuenta/password',
    claves: 'clave cuenta',
  },
]

/** Minúsculas y sin tildes, para comparar como lo escribe la gente. */
function plano(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Las acciones que ve un rol, filtradas por lo escrito (todas si no hay nada). */
export function accionesPara(rol: RolCodigo, consulta: string): AccionPanel[] {
  const permitidas = ACCIONES.filter((a) => !a.soloSuperAdmin || rol === 'super_admin')
  const palabras = plano(consulta).split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return permitidas
  return permitidas.filter((a) => {
    const texto = plano(`${a.label} ${a.hint ?? ''} ${a.claves ?? ''}`)
    return palabras.every((p) => texto.includes(p))
  })
}
