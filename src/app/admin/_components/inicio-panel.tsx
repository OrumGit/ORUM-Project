import Link from 'next/link'
import { ArrowRight, Megaphone, MessageSquareWarning, RefreshCw, Store, Tag, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Cifra } from '@/components/ui/cifra'
import { EstrellasLectura } from '@/components/ui/estrellas-lectura'
import { textoPorRevisar } from '@/lib/resenas/moderacion'
import { TituloSeccion } from '@/components/ui/titulo-seccion'
import styles from '../inicio.module.css'

/*
  LA PORTADA DEL PANEL  ·  rediseño del 15/10/2026
  ---------------------------------------------------------------------------
  La propuesta aprobada (artifact «ORUM — Rediseño Panel de Administración»,
  pantalla 1). Una pantalla de trabajo: lo que pide atención hoy, arriba.

    · EL SALUDO con el nombre y la fecha.
    · CUATRO CIFRAS, centradas, en tarjetas blancas con sombra.
    · QUIÉN VENCE ESTA SEMANA, con «Renovar» al lado de cada uno. El vencimiento
      va con COLOR SEGÚN LA URGENCIA (encargo: «que tenga colores para
      diferenciar mucho mejor»): rojo hoy, naranja mañana, ámbar en pocos
      días, azul más adelante. Siempre con su texto: el color nunca va solo.
    · CREAR: cuatro botones sueltos (sin panel de fondo ni título, pedido así),
      cada uno con su icono y su color.
    · LA ACTIVIDAD RECIENTE, de la bitácora.

  Sin animaciones de entrada: es la pantalla que más se abre (regla cero de
  «Movimiento»: lo frecuente no anima). Las tarjetas sí responden al ratón.

  No consulta nada: los datos llegan de `page.tsx`, así `/dev/shell` la
  enseña con datos falsos.
*/

/** Días hacia delante en los que una membresía cuenta como «por vencer». */
export const DIAS_POR_VENCER = 30

export type CifrasPanel = {
  miembros: number
  vigentes: number
  porVencer: number
  comercios: number
}

/** La alerta de reseñas bajas por revisar (solo super administrador). */
export type AlertaResenasPanel = {
  total: number
  recientes: { id: number; comercioNombre: string; estrellas: number; autor: string; mensaje: string | null }[]
}

export type VencimientoPanel = {
  miembroId: number
  nombre: string
  numero: string
  fotoUrl: string | null
  /** Días hasta que vence: 0 = hoy. */
  dias: number
}

export type ActividadPanel = {
  id: number
  quien: string
  que: string
  /** Sobre quién, si fue un miembro. */
  miembro: string | null
  cuando: string
}

/** El texto y el tono de un vencimiento, de más a menos urgente. */
function urgencia(dias: number): { texto: string; tono: 'hoy' | 'manana' | 'pronto' | 'semana' } {
  if (dias <= 0) return { texto: 'Vence hoy', tono: 'hoy' }
  if (dias === 1) return { texto: 'Vence mañana', tono: 'manana' }
  if (dias <= 3) return { texto: `En ${dias} días`, tono: 'pronto' }
  return { texto: `En ${dias} días`, tono: 'semana' }
}

const CREAR = [
  {
    href: '/admin/comercios/nuevo',
    nombre: 'Comercio',
    nota: 'Un aliado nuevo',
    icono: Store,
    tono: 'azul',
  },
  {
    href: '/admin/comercios',
    nombre: 'Promoción',
    nota: 'Elige el comercio',
    icono: Tag,
    tono: 'naranja',
  },
  {
    href: '/admin/anuncios/nuevo',
    nombre: 'Novedad',
    nota: 'Para los socios',
    icono: Megaphone,
    tono: 'dorado',
  },
] as const

export function InicioPanel({
  esSuperAdmin,
  saludo,
  nombre,
  fecha,
  cifras,
  vencen,
  actividad,
  resenas = { total: 0, recientes: [] },
}: {
  esSuperAdmin: boolean
  /** «Buenos días», según la hora del negocio. */
  saludo: string
  /** El nombre de quien entra, si el panel lo conoce. */
  nombre: string | null
  /** «miércoles 15 de octubre». */
  fecha: string
  cifras: CifrasPanel
  vencen: VencimientoPanel[]
  actividad: ActividadPanel[]
  /** Reseñas de menos de 4 estrellas sin revisar (29/10/2026). */
  resenas?: AlertaResenasPanel
}) {
  const numero = (n: number) => n.toLocaleString('es-CO')
  const porcentaje = cifras.miembros > 0 ? Math.round((cifras.vigentes / cifras.miembros) * 100) : 0

  return (
    <div className={styles.inicio}>
      <header className={styles.cabeza}>
        <div className={styles.saludo}>
          <TituloSeccion
            como="h1"
            tamano="pagina"
            texto={nombre ? `${saludo}, ${nombre}` : saludo}
          />
          <p className={styles.fecha}>
            <span className={styles.fechaDia}>{fecha}</span>. Esto es lo que pide atención hoy.
          </p>
        </div>
        <div className={styles.cabezaAcciones}>
          <Button href="/admin/miembros?estado=pronto" variant="secondary" icon={<RefreshCw size={16} aria-hidden="true" />}>
            Renovar membresía
          </Button>
        </div>
      </header>

      {/* ── La alerta de reseñas bajas (29/10/2026) ──────────────────────
          «Que aparezca una alerta cuando una reseña es menor a 4 estrellas,
          para que se pueda validar». Arriba de todo: es lo que pide atención.
          Sale solo si hay alguna por revisar; se va al marcarlas como
          revisadas (o al responderlas como ORUM) en `/admin/resenas`. */}
      {resenas.total > 0 && (
        <section className={styles.alerta} aria-labelledby="titulo-alerta-resenas">
          <div className={styles.alertaCabeza}>
            <span className={styles.alertaIcono} aria-hidden="true">
              <MessageSquareWarning size={20} />
            </span>
            <div className={styles.alertaTextos}>
              <h2 id="titulo-alerta-resenas" className={styles.alertaTitulo}>
                {textoPorRevisar(resenas.total)}
              </h2>
              <p className={styles.alertaNota}>
                {resenas.total === 1 ? 'Tiene' : 'Tienen'} menos de 4 estrellas. Revísalas y, si hace falta,
                responde como ORUM.
              </p>
            </div>
            <Link href="/admin/resenas?ver=por_revisar" className={styles.enlace}>
              Revisar
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ul className={styles.alertaLista}>
            {resenas.recientes.map((r) => (
              <li key={r.id} className={styles.alertaResena}>
                <EstrellasLectura valor={r.estrellas} />
                <span className={styles.alertaComercio}>{r.comercioNombre}</span>
                <span className={styles.alertaMensaje}>
                  {r.mensaje ? `«${r.mensaje}»` : 'Sin mensaje'} · {r.autor}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Las cifras ─────────────────────────────────────────────────── */}
      <section aria-label="Estado del club" className={styles.cifras}>
        <article className={styles.cifra}>
          <Cifra size="display" etiqueta="Miembros registrados" valor={numero(cifras.miembros)} />
        </article>
        <article className={styles.cifra}>
          <Cifra size="display" etiqueta="Membresías vigentes" valor={numero(cifras.vigentes)} />
          <span className={styles.barraProgreso} aria-hidden="true">
            <span className={styles.barraRelleno} style={{ '--p': `${porcentaje}%` } as React.CSSProperties} />
          </span>
          <span className={styles.cifraNota}>{porcentaje} % de los miembros</span>
        </article>
        <article className={styles.cifra} data-tono="aviso">
          <Cifra size="display" etiqueta={`Vencen en ${DIAS_POR_VENCER} días`} valor={numero(cifras.porVencer)} />
          <Link href="/admin/miembros?estado=pronto" className={styles.enlace}>
            Ver la lista
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </article>
        <article className={styles.cifra}>
          <Cifra size="display" etiqueta="Comercios activos" valor={numero(cifras.comercios)} />
        </article>
      </section>

      <div className={styles.dosColumnas}>
        {/* ── Vencen esta semana ───────────────────────────────────────── */}
        <section className={styles.tarjeta} aria-labelledby="titulo-vencen">
          <div className={styles.tarjetaCabeza}>
            <h2 id="titulo-vencen" className={styles.tarjetaTitulo}>
              Vencen esta semana
            </h2>
            <Link href="/admin/miembros?estado=pronto" className={styles.enlace}>
              Ver todos
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {vencen.length === 0 ? (
            <p className={styles.vacio}>Nadie vence esta semana.</p>
          ) : (
            <ul className={styles.vencen}>
              {vencen.map((v) => {
                const u = urgencia(v.dias)
                return (
                  <li key={v.miembroId} className={styles.vence}>
                    <Link href={`/admin/miembros/${v.miembroId}`} className={styles.venceMiembro}>
                      <Avatar nombre={v.nombre} src={v.fotoUrl} size="sm" decorativo />
                      <span className={styles.venceTextos}>
                        <span className={styles.venceNombre}>{v.nombre}</span>
                        <span className={styles.venceNumero}>Nº {v.numero}</span>
                      </span>
                    </Link>
                    <span className={styles.chip} data-tono={u.tono}>
                      <span className={styles.chipPunto} aria-hidden="true" />
                      {u.texto}
                    </span>
                    <Button
                      href={`/admin/miembros/${v.miembroId}/renovar`}
                      variant="secondary"
                      size="sm"
                      aria-label={`Renovar la membresía de ${v.nombre}`}
                    >
                      Renovar
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className={styles.lateral}>
          {/* ── Crear ──────────────────────────────────────────────────── */}
          <section aria-label="Crear" className={styles.crear}>
            {esSuperAdmin ? (
              CREAR.map((c) => (
                <Link key={c.nombre} href={c.href} className={styles.crearBoton}>
                  <span className={styles.crearIcono} data-tono={c.tono} aria-hidden="true">
                    <c.icono size={19} />
                  </span>
                  <span className={styles.crearNombre}>{c.nombre}</span>
                  <span className={styles.crearNota}>{c.nota}</span>
                </Link>
              ))
            ) : (
              <Link href="/admin/miembros/nuevo" className={styles.crearBoton}>
                <span className={styles.crearIcono} data-tono="azul" aria-hidden="true">
                  <UserPlus size={19} />
                </span>
                <span className={styles.crearNombre}>Miembro</span>
                <span className={styles.crearNota}>Registrar y vender</span>
              </Link>
            )}
          </section>

          {/* ── Actividad reciente ─────────────────────────────────────── */}
          {esSuperAdmin && (
            <section className={styles.tarjeta} aria-labelledby="titulo-actividad">
              <div className={styles.tarjetaCabeza}>
                <h2 id="titulo-actividad" className={styles.tarjetaTitulo}>
                  Actividad reciente
                </h2>
                <Link href="/admin/bitacora" className={styles.enlace}>
                  Ver la bitácora
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              {actividad.length === 0 ? (
                <p className={styles.vacio}>Todavía no hay actividad.</p>
              ) : (
                <ol className={styles.actividad}>
                  {actividad.map((a) => (
                    <li key={a.id} className={styles.evento}>
                      <span className={styles.eventoPunto} aria-hidden="true" />
                      <span className={styles.eventoTextos}>
                        <span>
                          <strong className={styles.eventoQuien}>{a.quien}</strong> · {a.que}
                          {a.miembro && <> · {a.miembro}</>}
                        </span>
                        <span className={styles.eventoCuando}>{a.cuando}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
