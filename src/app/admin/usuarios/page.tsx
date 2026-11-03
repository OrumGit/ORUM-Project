import { Camera, MoreHorizontal, Pencil, UserPlus } from 'lucide-react'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AccionEstado } from '@/components/ui/accion-estado'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/layout'
import { DropdownMenu, MenuItem } from '@/components/ui/menu'
import { ContenidoPestana, Pestanas, type TonoPestana } from '@/components/ui/pestanas'
import { cambiarEstadoAcceso } from './actions'
import { ReenviarActivacion } from '../_components/reenviar-activacion'
import { cuentaPendienteDeActivar } from '@/lib/auth/activacion'
import styles from '@/styles/lista-panel.module.css'

export const metadata = { title: 'Usuarios · ORUM' }

type Fila = {
  perfilId: string
  nombre: string
  email: string
  rolNombre: string
  rolCodigo: string
  activo: boolean
  /** Foto de perfil. Sin ella el avatar pinta iniciales. */
  avatarUrl: string | null
  /** Aún no ha activado su cuenta: se le puede reenviar el correo. */
  pendiente: boolean
}

const COLUMNAS: ReadonlyArray<Column<Fila>> = [
  {
    key: 'nombre',
    header: 'Usuario',
    primary: true,
    cell: (f) => (
      <span className={styles.celdaNombre}>
        <Avatar nombre={f.nombre} src={f.avatarUrl} size="sm" decorativo />
        <span className={styles.nombre}>{f.nombre}</span>
      </span>
    ),
  },
  { key: 'email', header: 'Correo', cell: (f) => f.email },
  {
    key: 'rol',
    header: 'Rol',
    width: '180px',
    cell: (f) => (
      // El super_admin se distingue del empleado: es quien puede crear otros
      // administradores y tocar planes y comercios.
      <Badge tone={f.rolCodigo === 'super_admin' ? 'info' : 'neutral'} size="sm">
        {f.rolNombre}
      </Badge>
    ),
  },
  {
    key: 'activo',
    header: 'Acceso',
    width: '120px',
    cell: (f) => (
      <Badge tone={f.activo ? 'success' : 'neutral'} size="sm">
        {f.activo ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
  },
]

type Filtro = 'todos' | 'admin' | 'empleados' | 'inactivos'

/* Las pestañas de la lista, como en miembros y comercios. */
const FILTROS: { clave: Filtro; etiqueta: string; tono: TonoPestana; cumple: (f: Fila) => boolean }[] = [
  { clave: 'todos', etiqueta: 'Todos', tono: 'neutro', cumple: () => true },
  { clave: 'admin', etiqueta: 'Administradores', tono: 'aviso', cumple: (f) => f.activo && f.rolCodigo === 'super_admin' },
  { clave: 'empleados', etiqueta: 'Empleados', tono: 'exito', cumple: (f) => f.activo && f.rolCodigo !== 'super_admin' },
  { clave: 'inactivos', etiqueta: 'Sin acceso', tono: 'vacio', cumple: (f) => !f.activo },
]

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  // Solo el administrador mayor gestiona usuarios.
  await requireRol('super_admin')
  const { ver } = await searchParams
  const filtro = FILTROS.find((x) => x.clave === ver) ?? FILTROS[0]

  const admin = createAdminClient()

  const [{ data: perfiles }, { data: roles }, { data: empleados }, authList] =
    await Promise.all([
      admin.from('perfiles').select('id, rol_id, activo, avatar_url'),
      admin.from('roles').select('id, codigo, nombre'),
      admin.from('empleados').select('perfil_id, nombres, apellidos').is('deleted_at', null),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])

  const rolPorId = new Map((roles ?? []).map((r) => [r.id, r]))
  const emailPorId = new Map((authList.data?.users ?? []).map((u) => [u.id, u.email ?? '—']))
  const pendientePorId = new Map(
    (authList.data?.users ?? []).map((u) => [u.id, cuentaPendienteDeActivar(u)]),
  )
  const empleadoPorPerfil = new Map((empleados ?? []).map((e) => [e.perfil_id, e]))

  const filas: Fila[] = (perfiles ?? [])
    .map((p): Fila | null => {
      const rol = rolPorId.get(p.rol_id)
      const emp = empleadoPorPerfil.get(p.id)
      if (!rol || !emp) return null

      return {
        perfilId: p.id,
        nombre: `${emp.nombres} ${emp.apellidos}`.trim(),
        email: emailPorId.get(p.id) ?? '—',
        rolNombre: rol.nombre,
        rolCodigo: rol.codigo,
        activo: p.activo,
        avatarUrl: (p.avatar_url ?? '').trim() || null,
        pendiente: pendientePorId.get(p.id) ?? false,
      }
    })
    .filter((f): f is Fila => f !== null)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Empleados y administradores con acceso al panel."
        actions={
          <Button href="/admin/usuarios/nuevo" icon={<UserPlus size={16} />}>
            Crear usuario
          </Button>
        }
      />

      <div className={styles.lista}>
        <Pestanas
          etiqueta="Filtrar usuarios"
          items={FILTROS.map((x) => ({
            href: x.clave === 'todos' ? '/admin/usuarios' : `/admin/usuarios?ver=${x.clave}`,
            etiqueta: x.etiqueta,
            cuenta: filas.filter(x.cumple).length,
            tono: x.tono,
            activa: x.clave === filtro.clave,
          }))}
        />

        <ContenidoPestana etiqueta="Filtrar usuarios" clave={filtro.clave}>
          <DataList
            caption="Usuarios del panel"
            items={filas.filter(filtro.cumple)}
            columns={COLUMNAS}
            getKey={(f) => f.perfilId}
            alwaysShowActions
            empty={
              <EmptyState
                title="Aún no hay usuarios"
                description="Crea el primer empleado o administrador del panel."
                actions={
                  <Button href="/admin/usuarios/nuevo" icon={<UserPlus size={16} />}>
                    Crear usuario
                  </Button>
                }
              />
            }
            actions={(f) => (
              <>
                <AccionEstado
                  activo={f.activo}
                  accion={cambiarEstadoAcceso}
                  campos={{ perfil_id: f.perfilId }}
                  etiquetaDesactivar="Desactivar"
                  etiquetaActivar="Activar"
                />

                <DropdownMenu
                  trigger={
                    <Button
                      iconOnly
                      variant="ghost"
                      size="sm"
                      aria-label={`Acciones de ${f.nombre}`}
                    >
                      <MoreHorizontal size={16} />
                    </Button>
                  }
                >
                  <MenuItem
                    href={`/admin/usuarios/${f.perfilId}/editar`}
                    icon={<Pencil size={16} />}
                  >
                    Editar datos
                  </MenuItem>
                  {/* La pantalla existía —página, modal y acción— pero nada
                      enlazaba a ella: el avatar de un administrador no se podía
                      cambiar navegando el panel. */}
                  <MenuItem
                    href={`/admin/usuarios/${f.perfilId}/avatar`}
                    icon={<Camera size={16} />}
                  >
                    Cambiar foto
                  </MenuItem>
                  {f.pendiente && f.activo && (
                    <ReenviarActivacion perfilId={f.perfilId} variante="menu" />
                  )}
                </DropdownMenu>
              </>
            )}
          />
        </ContenidoPestana>
      </div>
    </>
  )
}
