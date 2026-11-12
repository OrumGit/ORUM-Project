'use client'

import { useState, type ReactNode } from 'react'
import {
  CreditCard,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge, StatusBadge, VenceEn } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card'
import { DataList, type Column } from '@/components/ui/data-list'
import {
  EmptyState,
  ErrorState,
  ProgressBar,
  Skeleton,
  SkeletonText,
} from '@/components/ui/feedback'
import { EstrellasSelector } from '@/components/ui/estrellas'
import { EstrellasLectura } from '@/components/ui/estrellas-lectura'
import { Field } from '@/components/ui/field'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Divider, Grid, PageHeader, Section, Stack } from '@/components/ui/layout'
import { DropdownMenu, MenuItem, MenuLabel, MenuSeparator } from '@/components/ui/menu'
import { ConfirmDialog, Modal } from '@/components/ui/modal'
import { SegmentedControl } from '@/components/ui/segmented'
import { Sheet } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Checkbox, Radio, Switch } from '@/components/ui/toggle'
import { derivarEstadoMembresia } from '@/lib/miembros/membresias'
import styles from './gallery.module.css'

/* ========================================================================== */

function Seccion({
  titulo,
  nota,
  children,
}: {
  titulo: string
  nota?: string
  children: ReactNode
}) {
  return (
    <section className={styles.seccion}>
      <h2 className={styles.tituloSeccion}>{titulo}</h2>
      {nota && <p className={styles.notaSeccion}>{nota}</p>}
      {children}
    </section>
  )
}

function Grupo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.grupo}>
      <span className={styles.etiquetaGrupo}>{label}</span>
      <div className={styles.fila}>{children}</div>
    </div>
  )
}

function Rampa({
  tokens,
  textoClaro,
}: {
  tokens: readonly string[]
  textoClaro?: boolean
}) {
  return (
    <div className={styles.rampa}>
      {tokens.map((t) => (
        <div
          key={t}
          className={styles.muestra}
          style={{
            background: `var(--${t})`,
            color: textoClaro ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.55)',
          }}
        >
          {t.replace(/^(n|w|gold)-/, '')}
        </div>
      ))}
    </div>
  )
}

/* ========================================================================== */

const HOY = '2026-08-08'

type MiembroDemo = {
  id: number
  numero: string
  nombre: string
  plan: string
  destacado: boolean
  estado: 'activa' | 'vencida' | 'cancelada' | 'suspendida'
  fechaFin: string
}

const MIEMBROS: MiembroDemo[] = [
  {
    id: 1,
    numero: '00184472',
    nombre: 'María Fernanda Ospina',
    plan: 'Oro',
    destacado: true,
    estado: 'activa',
    fechaFin: '2027-02-14',
  },
  {
    id: 2,
    numero: '00190038',
    nombre: 'Carlos Andrés Betancur',
    plan: 'Oro',
    destacado: true,
    estado: 'activa',
    fechaFin: '2026-08-20',
  },
  {
    id: 3,
    numero: '00201155',
    nombre: 'Juliana del Pilar Rojas',
    plan: 'Base',
    destacado: false,
    // Activa en la BD pero con fecha pasada: sin derivar, la interfaz diría
    // "Activa" sobre alguien que no paga. Es el caso que motiva E0.
    estado: 'activa',
    fechaFin: '2026-05-30',
  },
  {
    id: 4,
    numero: '00211902',
    nombre: 'Santiago Herrera',
    plan: 'Base',
    destacado: false,
    estado: 'suspendida',
    fechaFin: '2026-12-01',
  },
]

const COLUMNAS: ReadonlyArray<Column<MiembroDemo>> = [
  {
    key: 'nombre',
    header: 'Miembro',
    primary: true,
    cell: (m) => (
      <Stack direction="row" gap={3} align="center">
        <Avatar nombre={m.nombre} size="sm" />
        {m.nombre}
      </Stack>
    ),
  },
  {
    key: 'numero',
    header: 'Nº membresía',
    numeric: true,
    cell: (m) => m.numero,
  },
  {
    key: 'plan',
    header: 'Plan',
    hideOnMobile: false,
    cell: (m) => m.plan,
  },
  {
    key: 'estado',
    header: 'Estado',
    cell: (m) => {
      const derivado = derivarEstadoMembresia(m.estado, m.fechaFin, HOY)
      return (
        <Stack direction="row" gap={2} align="center" wrap>
          <StatusBadge estado={derivado} size="sm" />
          <VenceEn estado={derivado} />
        </Stack>
      )
    },
  },
]

/* ========================================================================== */

function Contenido() {
  const { toast } = useToast()

  const [modal, setModal] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [hoja, setHoja] = useState(false)
  const [conError, setConError] = useState(false)
  const [vista, setVista] = useState<'tabla' | 'tarjetas'>('tabla')

  return (
    <div className={styles.contenido}>
      <PageHeader
        title="Sistema de diseño"
        description="Todos los componentes, variantes y estados en una pantalla. Cambia el tema arriba y reduce el ancho de la ventana para ver el comportamiento responsive."
        actions={
          <>
            <Button variant="secondary" icon={<Download size={16} />}>
              Exportar
            </Button>
            <Button icon={<Plus size={16} />}>Nuevo miembro</Button>
          </>
        }
      />

      {/* --- Color ---------------------------------------------------------- */}
      <Seccion
        titulo="Color"
        nota="Neutrales con un susurro de frío para que el oro se lea como metal y no como beige. El oro es color de MARCA: nunca rellena botones de la app ni codifica estados."
      >
        <Grupo label="Neutrales oscuros">
          <Rampa
            textoClaro
            tokens={['n-1000', 'n-950', 'n-900', 'n-850', 'n-800', 'n-700', 'n-600', 'n-500']}
          />
        </Grupo>
        <Grupo label="Neutrales claros">
          <Rampa tokens={['w-0', 'w-50', 'w-100', 'w-200', 'w-300', 'w-400']} />
        </Grupo>
        <Grupo label="Oro">
          <Rampa
            tokens={['gold-200', 'gold-300', 'gold-400', 'gold-500', 'gold-600', 'gold-700', 'gold-800']}
          />
        </Grupo>
        <Grupo label="Semánticos (resueltos por tema)">
          <Rampa textoClaro tokens={['success', 'warning', 'danger', 'info']} />
        </Grupo>
      </Seccion>

      {/* --- Tipografía ----------------------------------------------------- */}
      <Seccion
        titulo="Tipografía"
        nota="Cada tamaño lleva su propio tracking y leading: los títulos grandes necesitan tracking negativo y el texto pequeño ligeramente positivo."
      >
        <div>
          {(
            [
              ['display-1', 'Bienvenido a ORUM'],
              ['display-2', 'Gestión de miembros'],
              ['title-1', 'Membresías activas'],
              ['title-2', 'Datos del comercio'],
              ['title-3', 'Historial'],
              ['body', 'Texto general de la interfaz, con una medida cómoda de lectura.'],
              ['callout', 'Etiquetas y botones'],
              ['footnote', 'Texto de apoyo bajo un campo'],
              ['caption', 'Metadatos y marcas de tiempo'],
              ['overline', 'Encabezado de sección'],
            ] as const
          ).map(([token, muestra]) => (
            <div key={token} className={styles.filaTipo}>
              <span className={styles.tokenTipo}>{token}</span>
              <span className={`t-${token}`}>{muestra}</span>
            </div>
          ))}
        </div>
      </Seccion>

      {/* --- Forma y profundidad -------------------------------------------- */}
      <Seccion
        titulo="Forma y profundidad"
        nota="En tema claro la elevación la da la sombra en capas; en oscuro, un filo de luz superior, porque una sombra negra sobre fondo negro no se ve."
      >
        <div className={styles.sombras}>
          {(['shadow-1', 'shadow-2', 'shadow-3', 'shadow-4'] as const).map((s) => (
            <div key={s} className={styles.cajaSombra} style={{ boxShadow: `var(--${s})` }}>
              {s}
            </div>
          ))}
        </div>
      </Seccion>

      {/* --- Botones -------------------------------------------------------- */}
      <Seccion
        titulo="Botones"
        nota="El primario es TINTA (negro en claro, blanco en oscuro). La variante dorada es ceremonial: reservada al CTA comercial del Portal Público."
      >
        <Grupo label="Variantes">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="danger">Peligro</Button>
          <Button variant="brand">Acción ceremonial</Button>
          <Button variant="gold">Adquirir membresía</Button>
        </Grupo>

        <Grupo label="Tamaños">
          <Button size="sm">Pequeño</Button>
          <Button size="md">Mediano</Button>
          <Button size="lg">Grande</Button>
        </Grupo>

        <Grupo label="Estados — el ancho no cambia al cargar">
          <Button loading>Guardando cambios</Button>
          <Button variant="secondary" loading>
            Guardando cambios
          </Button>
          <Button disabled>Deshabilitado</Button>
          <Button icon={<Plus size={16} />}>Con icono</Button>
          <Button iconOnly aria-label="Más opciones" variant="secondary">
            <MoreHorizontal size={18} />
          </Button>
        </Grupo>

        <Grupo label="Spinner">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </Grupo>
      </Seccion>

      {/* --- Formularios ---------------------------------------------------- */}
      <Seccion
        titulo="Formularios"
        nota="El anillo de focus crece desde cero en vez de aparecer de golpe. Los errores sacuden el campo y quedan asociados por aria-describedby."
      >
        <div className={styles.formulario}>
          <Field label="Nombre completo">
            <Input placeholder="María Fernanda Ospina" autoComplete="name" />
          </Field>

          <Field label="Cédula" help="Sin puntos ni espacios.">
            <Input numeric inputMode="numeric" placeholder="1020304050" />
          </Field>

          <Field label="Buscar">
            <Input startIcon={<Search size={16} />} placeholder="Número, cédula o nombre" />
          </Field>

          <Field label="Correo electrónico" error="Ya existe una cuenta con este correo.">
            <Input type="email" defaultValue="maria@ejemplo.com" />
          </Field>

          <Field label="Plan de membresía">
            <Select defaultValue="oro">
              <option value="base">Plan Base — $120.000 / año</option>
              <option value="oro">Plan Oro — $280.000 / año</option>
            </Select>
          </Field>

          <Field label="Notas" optional>
            <Textarea placeholder="Observaciones internas…" />
          </Field>

          <Divider />

          <Stack gap={3}>
            <Switch label="Comercio activo" description="Aparece en el portal de miembros." defaultChecked />
            <Switch label="Acceso a su cuenta" description="Puede iniciar sesión en la herramienta." />
            <Checkbox label="Enviar credenciales por correo" defaultChecked />
            <Checkbox label="Opción deshabilitada" disabled />
            <Radio name="demo-radio" label="Membresía nueva" defaultChecked />
            <Radio name="demo-radio" label="Renovación" />
          </Stack>

          <Divider label="Control segmentado" />

          <SegmentedControl
            options={[
              { value: 'tabla', label: 'Tabla' },
              { value: 'tarjetas', label: 'Tarjetas' },
            ]}
            value={vista}
            onChange={setVista}
            ariaLabel="Modo de vista"
            size="md"
          />
        </div>
      </Seccion>

      {/* --- Estados -------------------------------------------------------- */}
      <Seccion
        titulo="Estado de membresía"
        nota="ORUM vende un único servicio, así que solo hay un eje: paga o no paga. Ningún estado se codifica solo con color — el punto lleno frente al hueco cambia la FORMA, así que sobrevive a la visión cromática deficiente y a una impresión en blanco y negro."
      >
        <Grupo label="Estado de pago (binario)">
          <StatusBadge estado={{ activa: true, diasRestantes: 190 }} />
          <StatusBadge estado={{ activa: false, motivo: 'vencida' }} />
          <StatusBadge estado={{ activa: false, motivo: 'cancelada' }} />
          <StatusBadge estado={{ activa: false, motivo: 'suspendida' }} />
        </Grupo>

        <Grupo label="Señal secundaria · sigue activa, no es otro estado">
          <VenceEn estado={{ activa: true, diasRestantes: 12 }} />
          <VenceEn estado={{ activa: true, diasRestantes: 1 }} />
          <VenceEn estado={{ activa: true, diasRestantes: 0 }} />
        </Grupo>

        <Grupo label="Badges genéricos">
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="success">Éxito</Badge>
          <Badge tone="warning">Aviso</Badge>
          <Badge tone="danger">Error</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="gold">Marca</Badge>
        </Grupo>

        <Grupo label="Avatares">
          <Avatar nombre="María Fernanda Ospina" size="sm" />
          <Avatar nombre="Carlos Andrés Betancur" size="md" />
          <Avatar nombre="Juliana del Pilar Rojas" size="lg" brand />
        </Grupo>
      </Seccion>

      {/* --- Estrellas ------------------------------------------------------ */}
      <Seccion titulo="Estrellas">
        <Grupo label="Lectura">
          <EstrellasLectura valor={4.5} total={12} />
          <EstrellasLectura valor={3} tamano="md" />
          <EstrellasLectura valor={null} />
        </Grupo>
        <Grupo label="Selector">
          <EstrellasSelector name="estrellas" valorInicial={3} etiqueta="Tu calificación" />
        </Grupo>
      </Seccion>

      {/* --- Superficies ---------------------------------------------------- */}
      <Seccion titulo="Superficies">
        <Grid min="280px">
          <Card padding="none">
            <CardHeader
              title="Plan Oro"
              subtitle="Vigente hasta el 14 feb 2027"
              actions={
                <DropdownMenu
                  trigger={
                    <Button iconOnly variant="ghost" size="sm" aria-label="Acciones del plan">
                      <MoreHorizontal size={16} />
                    </Button>
                  }
                >
                  <MenuLabel>Plan</MenuLabel>
                  <MenuItem icon={<Pencil size={16} />}>Editar</MenuItem>
                  <MenuItem icon={<CreditCard size={16} />}>Renovar</MenuItem>
                  <MenuSeparator />
                  <MenuItem destructive icon={<Trash2 size={16} />}>
                    Cancelar membresía
                  </MenuItem>
                </DropdownMenu>
              }
            />
            <CardBody>
              <p className="muted">
                Acceso a toda la red de comercios aliados y beneficios exclusivos.
              </p>
            </CardBody>
            <CardFooter>
              <Button variant="secondary" size="sm">
                Ver detalle
              </Button>
              <Button size="sm">Renovar</Button>
            </CardFooter>
          </Card>

          <Card variant="brand">
            <Stack gap={3}>
              <span className={styles.etiquetaGrupo}>Tarjeta de marca</span>
              <p className="muted">
                Filo dorado superior. Como mucho una por pantalla: si varias compiten,
                el oro deja de destacar nada.
              </p>
            </Stack>
          </Card>

          <Card variant="sunk">
            <Stack gap={3}>
              <span className={styles.etiquetaGrupo}>Superficie hundida</span>
              <p className="muted">Agrupa contenido secundario sin añadir otra capa elevada.</p>
            </Stack>
          </Card>
        </Grid>
      </Seccion>

      {/* --- Feedback ------------------------------------------------------- */}
      <Seccion
        titulo="Avisos y notificaciones"
        nota="Cada tono trae su icono: el color nunca transporta el significado por sí solo. Los toasts se descartan arrastrándolos, con traspaso de velocidad."
      >
        <Stack gap={3}>
          <Alert tone="info" title="Contraseña generada">
            Se mostrará una sola vez. Cópiala antes de cerrar.
          </Alert>
          <Alert tone="success" title="Membresía registrada" />
          <Alert tone="warning" title="Vence en 12 días">
            Ofrece la renovación al miembro.
          </Alert>
          <Alert
            tone="danger"
            title="No se pudo guardar"
            actions={
              <Button size="sm" variant="secondary">
                Reintentar
              </Button>
            }
          >
            La cédula ya está registrada con otro miembro.
          </Alert>
        </Stack>

        <Grupo label="Toasts — arrástralos hacia la derecha">
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                tone: 'success',
                title: 'Membresía renovada',
                description: 'Vigente hasta el 14 de febrero de 2027.',
              })
            }
          >
            Éxito
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                tone: 'danger',
                title: 'No se pudo renovar',
                description: 'Revisa la conexión e inténtalo otra vez.',
                action: { label: 'Reintentar', onClick: () => {} },
              })
            }
          >
            Error con acción
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast({ tone: 'info', title: 'Cambios guardados', duration: 0 })}
          >
            Fijo (sin cierre automático)
          </Button>
        </Grupo>
      </Seccion>

      {/* --- Capas ---------------------------------------------------------- */}
      <Seccion
        titulo="Capas"
        nota="El modal usa <dialog> nativo (focus trap y Escape gratis). La hoja se arrastra 1:1, resiste en el tope y se descarta según a dónde iba el gesto, no dónde lo soltaste."
      >
        <Grupo label="Disparadores">
          <Button variant="secondary" onClick={() => setModal(true)}>
            Abrir modal
          </Button>
          <Button variant="secondary" onClick={() => setHoja(true)}>
            Abrir hoja
          </Button>
          <Button variant="danger" onClick={() => setConfirmar(true)}>
            Confirmación destructiva
          </Button>
          <DropdownMenu
            align="start"
            trigger={<Button variant="secondary">Menú desplegable</Button>}
          >
            <MenuItem icon={<Pencil size={16} />}>Editar datos</MenuItem>
            <MenuItem icon={<CreditCard size={16} />}>Registrar venta</MenuItem>
            <MenuItem disabled>Opción no disponible</MenuItem>
            <MenuSeparator />
            <MenuItem destructive icon={<Trash2 size={16} />}>
              Eliminar
            </MenuItem>
          </DropdownMenu>
        </Grupo>
      </Seccion>

      {/* --- Carga y vacío -------------------------------------------------- */}
      <Seccion
        titulo="Carga, vacío y error"
        nota="Los esqueletos replican el layout real que van a sustituir; un spinner centrado no anticipa nada y alarga la espera percibida."
      >
        <Grid min="300px">
          <Card>
            <Stack gap={4}>
              <span className={styles.etiquetaGrupo}>Esqueleto</span>
              <Stack direction="row" gap={3} align="center">
                <Skeleton variant="circle" width="36px" height="36px" />
                <Stack gap={2} style={{ flex: 1 }}>
                  <Skeleton width="60%" height="12px" />
                  <Skeleton width="40%" height="10px" />
                </Stack>
              </Stack>
              <SkeletonText lines={3} />
            </Stack>
          </Card>

          <Card>
            <Stack gap={4}>
              <span className={styles.etiquetaGrupo}>Progreso</span>
              <ProgressBar value={38} />
              <ProgressBar />
            </Stack>
          </Card>
        </Grid>

        <Grid min="320px">
          <Card padding="none">
            <EmptyState
              title="Aún no hay miembros"
              description="Registra el primer cliente y véndele su membresía."
              actions={<Button icon={<Plus size={16} />}>Registrar miembro</Button>}
            />
          </Card>
          <Card padding="none">
            <ErrorState
              detail="PostgrestError: connection timeout"
              actions={
                <Button variant="secondary" onClick={() => setConError((v) => !v)}>
                  Reintentar
                </Button>
              }
            />
          </Card>
        </Grid>
      </Seccion>

      {/* --- DataList ------------------------------------------------------- */}
      <Seccion
        titulo="Lista de datos"
        nota="Una sola tabla semántica en el DOM. Por debajo de 768px CSS la convierte en tarjetas apiladas: nunca hay scroll horizontal. Estrecha la ventana para verlo."
      >
        <Section
          title="Miembros"
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setConError((v) => !v)}
            >
              {conError ? 'Ver datos' : 'Simular error'}
            </Button>
          }
        >
          <DataList
            caption="Miembros del club"
            items={conError ? [] : MIEMBROS}
            columns={COLUMNAS}
            getKey={(m) => m.id}
            rowHref={(m) => `/OrumAdminLogin/miembros/${m.id}`}
            error={conError ? 'No pudimos cargar los miembros.' : null}
            actions={(m) => (
              <DropdownMenu
                trigger={
                  <Button iconOnly variant="ghost" size="sm" aria-label={`Acciones de ${m.nombre}`}>
                    <MoreHorizontal size={16} />
                  </Button>
                }
              >
                <MenuItem icon={<Pencil size={16} />}>Editar</MenuItem>
                <MenuItem icon={<CreditCard size={16} />}>Renovar membresía</MenuItem>
                <MenuSeparator />
                <MenuItem destructive icon={<Trash2 size={16} />}>
                  Cancelar
                </MenuItem>
              </DropdownMenu>
            )}
          />
        </Section>

        <Card padding="none">
          <DataList caption="Ejemplo de carga" items={[]} columns={COLUMNAS} getKey={() => 0} loading />
        </Card>
      </Seccion>

      {/* --- Capas montadas ------------------------------------------------- */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Renovar membresía"
        description="La nueva vigencia empieza el día siguiente al fin de la actual, para no perder días pagados."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setModal(false)
                toast({ tone: 'success', title: 'Membresía renovada' })
              }}
            >
              Renovar
            </Button>
          </>
        }
      >
        <Stack gap={4}>
          <Field label="Plan">
            <Select defaultValue="oro">
              <option value="base">Plan Base</option>
              <option value="oro">Plan Oro</option>
            </Select>
          </Field>
          <Field label="Precio pagado">
            <Input numeric inputMode="numeric" defaultValue="280000" />
          </Field>
        </Stack>
      </Modal>

      <ConfirmDialog
        open={confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={() => {
          setConfirmar(false)
          toast({ tone: 'danger', title: 'Membresía cancelada' })
        }}
        title="¿Cancelar esta membresía?"
        description="El miembro perderá el acceso a los beneficios de inmediato. Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar"
        destructive
      />

      <Sheet
        open={hoja}
        onClose={() => setHoja(false)}
        title="Acciones rápidas"
        description="Arrastra desde el tirador para cerrarla. Prueba también un empujón corto y rápido."
        footer={
          <>
            <Button variant="secondary" onClick={() => setHoja(false)}>
              Cerrar
            </Button>
            <Button onClick={() => setHoja(false)}>Confirmar</Button>
          </>
        }
      >
        <Stack gap={3}>
          <Switch label="Notificar al miembro" defaultChecked />
          <Switch label="Imprimir comprobante" />
          <Divider />
          <SkeletonText lines={6} />
        </Stack>
      </Sheet>
    </div>
  )
}

/* ========================================================================== */

export function Gallery() {
  return (
    <ToastProvider>
      <div className={styles.pagina}>
        <header className={styles.barra}>
          <div className={styles.marca}>
            <span className={styles.wordmark}>ORUM</span>
            <span className={styles.sub}>Sistema de diseño · Fase B</span>
          </div>
          <ThemeToggle compactOnMobile={false} />
        </header>

        <Contenido />
      </div>
    </ToastProvider>
  )
}
