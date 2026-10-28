'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronsUpDown, KeyRound, LogOut, UserPlus } from 'lucide-react'
import {
  BotonInstalar,
  EntradaInstalar,
  GuiaInstalacionIOS,
} from '@/components/pwa/instalar-app'
import { AvisoInstalar } from '@/components/pwa/instalar-movil'
import { Button } from '@/components/ui/button'
import { LogoOrum } from '@/components/ui/marca/marca'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/menu'
import { Sheet } from '@/components/ui/sheet'
import { ToastProvider } from '@/components/ui/toast'
import type { RolCodigo } from '@/lib/supabase/database.types'
import cromo from '@/app/miembros/(portal)/portal.module.css'
import { BuscadorPanel, enfocarBuscador } from './buscador-panel'
import {
  esRutaActiva,
  navegacionPara,
  tabsPara,
  type NavGroup,
  type NavItem,
} from './nav-config'
import styles from './app-shell.module.css'

/*
  EL PANEL DE ADMINISTRACIÓN  ·  rediseño del 15/10/2026
  ---------------------------------------------------------------------------
  Tercera forma del panel. El propietario: «los atajos, el diseño y en
  general todo, no me gusta; la barra de opciones no me gusta; quiero algo
  muy profesional, agradable a la vista y sencillo de entender». La propuesta
  aprobada es el artifact «ORUM — Rediseño Panel de Administración».

    · LA BARRA LATERAL, negra, a la izquierda (≥768 px): el logotipo en
      plata, las secciones en sus grupos y, abajo, la cuenta. La sección en la
      que estás la dice un FILO PLATEADO muy sutil alrededor, con un brillo
      apenas visible, el texto blanco y el icono en plata (encargo: «un borde
      muy sutil y que sea plateado»). Nada de oro ni de rellenos.
    · LA BARRA DE ARRIBA, blanca y pegada al desplazar: dónde estás, el
      buscador (`BuscadorPanel`: miembros y acciones al escribir, sin
      comandos a la vista) y «Registrar miembro» en oro.
    · EL CONTENIDO, sobre blanco, con la paleta de la fachada (`cromo`).
    · EN EL TELÉFONO, sin barra lateral: la barra de arriba con el logotipo y
      la barra inferior negra en la zona del pulgar, con la hoja «Más».

  SIEMPRE EN CLARO (`data-theme="light"`). La barra lateral se pinta negra
  con los tokens de la franja (`--franja-*`), no con `data-theme="dark"`: el
  menú de la cuenta es un popover que se pinta dentro y heredaría el oscuro.
*/

export type ShellUser = {
  nombre: string
  email: string | null
  rolNombre: string
  rolCodigo: RolCodigo
}

type Props = {
  user: ShellUser
  /** Server action de cierre de sesión, inyectada desde el layout. */
  cerrarSesion: () => void | Promise<void>
  /** Fuente de miembros del buscador. Solo se sustituye en `/dev/shell`. */
  buscar?: ComponentProps<typeof BuscadorPanel>['buscar']
  /** La sección que se da por activa. Solo en `/dev/shell`, que no tiene sesión. */
  rutaSimulada?: string
  children: ReactNode
}

/** Dos letras para el círculo de la cuenta: de «ana.restrepo@orum.co», «AR». */
function iniciales(texto: string): string {
  const base = texto.split('@')[0] ?? texto
  const partes = base.split(/[\s._-]+/).filter(Boolean)
  const letras =
    partes.length >= 2 ? partes[0][0] + partes[1][0] : (partes[0] ?? '?').slice(0, 2)
  return letras.toUpperCase()
}

export function AppShell({ user, cerrarSesion, buscar, rutaSimulada, children }: Props) {
  const rutaReal = usePathname()
  const pathname = rutaSimulada ?? rutaReal
  const [mas, setMas] = useState(false)
  const [guiaIOS, setGuiaIOS] = useState(false)
  const formCerrarSesion = useRef<HTMLFormElement>(null)

  const grupos = navegacionPara(user.rolCodigo)
  const tabs = tabsPara(user.rolCodigo)
  const actual = grupos.flatMap((g) => g.items).find((i) => esRutaActiva(i, pathname))

  // Destinos que no caben en la barra inferior: van a la hoja «Más».
  const enTabs = new Set(tabs.filter((t) => t.kind === 'link').map((t) => (t as NavItem).href))
  const extras = grupos.flatMap((g) => g.items).filter((item) => !enTabs.has(item.href))

  return (
    // El provider envuelve todo el panel: cualquier pantalla puede confirmar
    // una acción con un toast sin montar su propio contenedor.
    <ToastProvider>
      <div className={[cromo.portal, styles.panel].join(' ')} data-theme="light">
        {/* ── LA BARRA LATERAL ────────────────────────────────────────── */}
        <aside className={styles.lateral}>
          <Link href="/admin" className={styles.marca} aria-label="ORUM, ir al inicio del panel">
            <LogoOrum variante="plata" className={styles.logo} preload />
            <span className={styles.marcaPanel} aria-hidden="true">
              Panel
            </span>
          </Link>

          <Secciones grupos={grupos} pathname={pathname} />

          <div className={styles.cuenta}>
            <DropdownMenu
              trigger={
                <button type="button" className={styles.cuentaBoton} aria-label="Cuenta y sesión">
                  <span className={styles.cuentaCirculo} aria-hidden="true">
                    {iniciales(user.email ?? user.nombre)}
                  </span>
                  <span className={styles.cuentaTextos}>
                    <span className={styles.cuentaNombre}>{user.email ?? user.nombre}</span>
                    <span className={styles.cuentaRol}>{user.rolNombre}</span>
                  </span>
                  <ChevronsUpDown size={15} aria-hidden="true" className={styles.cuentaFlecha} />
                </button>
              }
            >
              <MenuItem href="/admin/cuenta/password" icon={<KeyRound size={16} />}>
                Mi contraseña
              </MenuItem>
              {/* Acceso PERMANENTE a la instalación de la app. */}
              <BotonInstalar onPedirGuiaIOS={() => setGuiaIOS(true)} />
              <MenuSeparator />
              <MenuItem
                destructive
                icon={<LogOut size={16} />}
                onSelect={() => {
                  // La server action se dispara desde un formulario oculto:
                  // un `MenuItem` es un botón y no puede enviar otro formulario.
                  formCerrarSesion.current?.requestSubmit()
                }}
              >
                Cerrar sesión
              </MenuItem>
            </DropdownMenu>
            <form ref={formCerrarSesion} action={cerrarSesion} hidden />
          </div>
        </aside>

        {/* ── LA COLUMNA DEL TRABAJO ──────────────────────────────────── */}
        <div className={styles.columna}>
          <header className={styles.barra}>
            {/* En el teléfono no hay barra lateral: el logotipo va aquí,
                en oro (sobre blanco, oro). */}
            <Link href="/admin" className={styles.marcaMovil} aria-label="ORUM, ir al inicio del panel">
              <LogoOrum variante="dorado" className={styles.logoMovil} />
            </Link>

            <nav className={styles.ruta} aria-label="Dónde estás">
              <Link href="/admin" className={styles.rutaInicio}>
                Panel
              </Link>
              {actual && actual.href !== '/admin' && (
                <>
                  <span className={styles.rutaSeparador} aria-hidden="true">
                    /
                  </span>
                  <span className={styles.rutaActual}>{actual.label}</span>
                </>
              )}
            </nav>

            <BuscadorPanel rol={user.rolCodigo} buscar={buscar} className={styles.buscador} />

            {/* El flujo estrella, a un clic desde cualquier pantalla. En el
                teléfono queda solo el icono; el nombre lo dice `aria-label`. */}
            <Button
              href="/admin/miembros/nuevo"
              variant="brand"
              pildora
              icon={<UserPlus size={16} aria-hidden="true" />}
              aria-label="Registrar miembro y vender membresía"
              className={styles.registrar}
            >
              <span className={styles.registrarTexto}>Registrar miembro</span>
            </Button>
          </header>

          <main className={styles.main}>{children}</main>
        </div>

        <TabBar
          tabs={tabs}
          pathname={pathname}
          onBuscar={enfocarBuscador}
          onMas={() => setMas(true)}
        />

        <Sheet open={mas} onClose={() => setMas(false)} title="Más opciones">
          <nav className={styles.masLista} aria-label="Más secciones">
            {extras.map((item) => {
              const activo = esRutaActiva(item, pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.masItem}
                  data-activo={activo}
                  aria-current={activo ? 'page' : undefined}
                  onClick={() => setMas(false)}
                >
                  <item.icon className={styles.masItemIcono} aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}

            {/* En el teléfono no hay menú de la cuenta: esta hoja es la
                ÚNICA puerta a la cuenta. Se lista aquí a mano. */}
            <Link
              href="/admin/cuenta/password"
              className={styles.masItem}
              data-activo={pathname.startsWith('/admin/cuenta/password')}
              onClick={() => setMas(false)}
            >
              <KeyRound className={styles.masItemIcono} aria-hidden="true" />
              Mi contraseña
            </Link>

            <EntradaInstalar
              className={styles.masItem}
              iconClassName={styles.masItemIcono}
              onInstalar={() => setMas(false)}
              onPedirGuiaIOS={() => {
                // Una hoja se va, la otra llega: no se apilan.
                setMas(false)
                setGuiaIOS(true)
              }}
            />
          </nav>

          <form action={cerrarSesion} className={styles.masSalir}>
            <Button type="submit" variant="secondary" pildora fullWidth icon={<LogOut size={16} />}>
              Cerrar sesión
            </Button>
          </form>
        </Sheet>

        {/* HERMANA de la hoja «Más», no hija: un `<dialog>` cerrado arrastra
            a sus descendientes, y cerrar «Más» para mostrarla la ocultaría. */}
        <GuiaInstalacionIOS abierta={guiaIOS} onCerrar={() => setGuiaIOS(false)} />

        {/* El botón redondo de descarga en el celular, como en el portal de
            miembros (29/10/2026: «tiene que aparecer el botón de descarga
            como en el usuario»). Aquí no hay WhatsApp: va sobre la barra
            inferior. Instala la app del PANEL (su manifiesto lo enlaza
            `admin/layout.tsx`). */}
        <AvisoInstalar sobre="barra" />
      </div>
    </ToastProvider>
  )
}

/* ========================================================================== */

/** Las secciones de la barra lateral, en sus grupos. */
function Secciones({ grupos, pathname }: { grupos: NavGroup[]; pathname: string }) {
  return (
    <nav className={styles.secciones} aria-label="Secciones del panel">
      {grupos.map((grupo, i) => (
        <div key={grupo.label ?? i} className={styles.grupo}>
          {grupo.label && <span className={styles.grupoTitulo}>{grupo.label}</span>}
          <ul className={styles.grupoLista}>
            {grupo.items.map((item) => {
              const activo = esRutaActiva(item, pathname)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={styles.seccion}
                    data-activo={activo}
                    aria-current={activo ? 'page' : undefined}
                  >
                    <item.icon className={styles.seccionIcono} aria-hidden="true" />
                    <span className={styles.seccionTexto}>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/* ========================================================================== */

function TabBar({
  tabs,
  pathname,
  onBuscar,
  onMas,
}: {
  tabs: ReturnType<typeof tabsPara>
  pathname: string
  onBuscar: () => void
  onMas: () => void
}) {
  return (
    <nav className={styles.tabbar} aria-label="Navegación">
      {tabs.map((tab) => {
        if (tab.kind === 'link') {
          const activo = esRutaActiva(tab, pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={styles.tab}
              data-activo={activo}
              aria-current={activo ? 'page' : undefined}
            >
              <tab.icon className={styles.tabIcono} aria-hidden="true" />
              {tab.label}
            </Link>
          )
        }

        const alPulsar = tab.kind === 'search' ? onBuscar : onMas
        return (
          <button key={tab.kind} type="button" className={styles.tab} onClick={alPulsar}>
            <tab.icon className={styles.tabIcono} aria-hidden="true" />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
