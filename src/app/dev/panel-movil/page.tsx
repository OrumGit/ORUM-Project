import { notFound } from 'next/navigation'
import { FormCard } from '@/components/ui/form-card'
import { PageHeader } from '@/components/ui/layout'
import { AnuncioForm } from '@/app/OrumAdminLogin/anuncios/_components/anuncio-form'
import { ResenasAdmin } from '@/app/OrumAdminLogin/comercios/[id]/_components/resenas-admin'
import { VisibilidadComercio } from '@/app/OrumAdminLogin/comercios/[id]/_components/visibilidad-comercio'
import { EditarComercioForm } from '@/app/OrumAdminLogin/comercios/[id]/editar/_components/editar-comercio-form'
import { GestorImagenes } from '@/app/OrumAdminLogin/comercios/[id]/imagenes/_components/gestor-imagenes'
import { PromocionForm } from '@/app/OrumAdminLogin/comercios/[id]/promociones/_components/promocion-form'
import { SucursalForm } from '@/app/OrumAdminLogin/comercios/[id]/sucursales/_components/sucursal-form'
import { ComercioForm } from '@/app/OrumAdminLogin/comercios/_components/comercio-form'
import { PasswordForm } from '@/app/OrumAdminLogin/cuenta/password/_components/password-form'
import { RenovarForm } from '@/app/OrumAdminLogin/miembros/[id]/_components/renovar-form'
import { EditarMiembroForm } from '@/app/OrumAdminLogin/miembros/[id]/editar/_components/editar-miembro-form'
import { RevocarForm } from '@/app/OrumAdminLogin/miembros/[id]/revocar/_components/revocar-form'
import { ComprasMiembro } from '@/app/OrumAdminLogin/miembros/[id]/_components/compras-miembro'
import type { CompraPanel } from '@/lib/miembros/compras-miembro-datos'
import { MiembroForm } from '@/app/OrumAdminLogin/miembros/_components/miembro-form'
import { CargarRangoForm } from '@/app/OrumAdminLogin/miembros/numeros/_components/cargar-rango-form'
import { PlanForm } from '@/app/OrumAdminLogin/planes/_components/plan-form'
import { GestorPublicidad } from '@/app/OrumAdminLogin/publicidad/_components/gestor-portada'
import { EditarForm } from '@/app/OrumAdminLogin/usuarios/[id]/editar/_components/editar-usuario-form'
import { UsuarioForm } from '@/app/OrumAdminLogin/usuarios/nuevo/_components/usuario-form'
import { ToastProvider } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Ban, Camera, CreditCard, MailCheck, Pencil, Trash2 } from 'lucide-react'
import cromo from '@/app/miembros/(portal)/portal.module.css'
import shell from '@/components/shell/app-shell.module.css'
import ficha from '@/app/OrumAdminLogin/comercios/[id]/ficha.module.css'

export const metadata = { title: 'Vista previa del panel en el celular · ORUM' }

/**
 * Los formularios y piezas del panel con datos FALSOS, solo en desarrollo,
 * para revisar el panel en un teléfono sin sesión (29/10/2026: «hay
 * componentes que están mal en este portal; una validación a profundidad»).
 * `?f=` elige uno (`comercio-datos`, `promocion`, `sucursal`, …); sin él, todos.
 * Enviar llama a las acciones reales, que sin sesión contestan con un error
 * y no escriben nada.
 */

const CATEGORIAS = [
  { id: 1, nombre: 'Gastronomía', subcategorias: [{ id: 11, nombre: 'Bares y gastrobares' }, { id: 12, nombre: 'Desayunos y brunch' }] },
  { id: 2, nombre: 'Belleza', subcategorias: [{ id: 21, nombre: 'Peluquerías' }] },
  { id: 3, nombre: 'Salud y bienestar', subcategorias: [] },
]
const CIUDADES = [
  { id: 1, nombre: 'Bogotá' },
  { id: 2, nombre: 'Tuluá' },
]
const PLANES = [
  { id: 1, nombre: 'Membresía anual', precio: 120000 },
  { id: 2, nombre: 'Membresía semestral', precio: 70000 },
]
const TIPOS = [
  { id: 1, codigo: 'porcentaje', nombre: 'Descuento en porcentaje' },
  { id: 2, codigo: 'monto_fijo', nombre: 'Descuento fijo' },
  { id: 3, codigo: 'dos_por_uno', nombre: '2x1' },
  { id: 4, codigo: 'regalo', nombre: 'Regalo' },
]
const FOTO = '/icons/socio-512.png'

/* Compras inventadas para «Compras en comercios» de la ficha del miembro. */
const COMPRAS: CompraPanel[] = Array.from({ length: 31 }, (_, i) => {
  const comercio = [
    { id: 1, nombre: 'Artesana 43', sede: 'Centro', promo: '10% en toda la carta' },
    { id: 2, nombre: 'Absurdo Sport Bar', sede: 'Norte', promo: '2x1 en cervezas' },
    { id: 3, nombre: 'Anthali Spa - Wellness Therapy', sede: 'Principal', promo: '15% en masajes' },
  ][i % 3]
  const valorCompra = 40000 + ((i * 17000) % 120000)
  const ahorro = Math.round(valorCompra * (i % 3 === 2 ? 0.15 : 0.1))
  return {
    id: 100 - i,
    fechaHora: new Date(Date.UTC(2026, 10, 11, 20) - i * 3 * 86400000).toISOString(),
    comercioId: comercio.id,
    comercio: comercio.nombre,
    logoUrl: null,
    sucursal: comercio.sede,
    promocion: i % 7 === 6 ? null : comercio.promo,
    valorCompra,
    ahorro,
    valorFinal: valorCompra - ahorro,
    metodo: i % 4 === 0 ? 'qr' : 'numero',
  }
})

const PIEZAS: Record<string, { titulo: string; contenido: React.ReactNode; enPanel?: boolean }> = {
  'comercio-datos': {
    titulo: 'Ficha del comercio · Datos',
    enPanel: true,
    contenido: (
      <EditarComercioForm
        enPagina
        comercio={{
          id: 1,
          perfil_id: null,
          nombre: 'Absurdo Sport Bar',
          descripcion: 'Bar deportivo con pantallas gigantes.',
          categorias: [
            { categoriaId: 1, subcategoriaId: 11 },
            { categoriaId: 2, subcategoriaId: null },
          ],
          indexable: true,
          correo: 'contacto@absurdo.co',
        }}
        categorias={CATEGORIAS}
      />
    ),
  },
  /* La cabecera de la ficha del miembro con TODOS sus botones (12/11/2026:
     el nombre quedaba aplastado a una letra por renglón). */
  'cabecera-miembro': {
    titulo: 'Ficha del miembro · Cabecera',
    enPanel: true,
    contenido: (
      <PageHeader
        title="Katherin Recio Marin"
        description="Cédula 1116017106"
        actions={
          <>
            <Button href="#" variant="secondary" icon={<Pencil size={16} />}>
              Editar datos
            </Button>
            <Button href="#" variant="secondary" icon={<Camera size={16} />}>
              Cambiar foto
            </Button>
            <Button href="#" variant="secondary" icon={<Trash2 size={16} />}>
              Retirar foto
            </Button>
            <Button href="#" variant="secondary" icon={<MailCheck size={16} />}>
              Reenviar correo de activación
            </Button>
            <Button href="#" variant="secondary" icon={<Ban size={16} />}>
              Revocar membresía
            </Button>
            <Button href="#" icon={<CreditCard size={16} />}>
              Renovar membresía
            </Button>
          </>
        }
      />
    ),
  },
  compras: {
    titulo: 'Ficha del miembro · Compras',
    enPanel: true,
    contenido: (
      <ComprasMiembro
        miembroId={1}
        nombre="María"
        rango={{ periodo: 'todo', desde: null, hasta: null }}
        compras={COMPRAS}
        pagina={1}
      />
    ),
  },
  'compras-vacio': {
    titulo: 'Ficha del miembro · Sin compras',
    enPanel: true,
    contenido: (
      <ComprasMiembro
        miembroId={1}
        nombre="María"
        rango={{ periodo: 'semana', desde: '2026-11-09', hasta: '2026-11-11' }}
        compras={[]}
        pagina={1}
      />
    ),
  },
  visibilidad: {
    titulo: 'Ficha del comercio · Dónde se ve',
    enPanel: true,
    contenido: (
      <div className={ficha.estados}>
        <VisibilidadComercio
          comercioId={1}
          visible={{ publico: false, miembros: true }}
          disponible
          aliadoActivo
        />
        <VisibilidadComercio
          comercioId={1}
          visible={{ publico: true, miembros: true }}
          disponible={false}
          aliadoActivo
        />
      </div>
    ),
  },
  'comercio-nuevo': { titulo: 'Nuevo comercio', contenido: <ComercioForm categorias={CATEGORIAS} /> },
  promocion: {
    titulo: 'Promoción',
    contenido: (
      <PromocionForm
        comercioId={1}
        tipos={TIPOS}
        promocion={{
          id: 1,
          titulo: 'Brunch',
          descripcion: 'En toda la carta de brunch.',
          tipo_beneficio_id: 1,
          valor: 10,
          fecha_inicio: '2026-10-01',
          fecha_fin: '2026-12-31',
          dias_semana: null,
          restricciones: 'No aplica para domicilios.',
          franjas_horarias: [
            { dias: [2, 3], desde: '08:00', hasta: '09:30' },
            { dias: [6, 7], desde: '00:00', hasta: '23:59' },
          ],
        }}
      />
    ),
  },
  sucursal: {
    titulo: 'Sucursal',
    contenido: (
      <SucursalForm
        comercioId={1}
        ciudades={CIUDADES}
        sucursal={{ id: 1, nombre: 'Sede centro', direccion: 'Calle 10 # 5-20', telefono: '6015550100', ciudad_id: 1 }}
        horario={[1, 2, 3, 4, 5].map((dia) => ({
          dia,
          abre: '08:00',
          cierra: '18:00',
          almuerzoDesde: '12:00',
          almuerzoHasta: '13:00',
        }))}
      />
    ),
  },
  imagenes: {
    titulo: 'Imágenes del comercio',
    enPanel: true,
    contenido: (
      <GestorImagenes
        comercioId={1}
        nombre="Absurdo Sport Bar"
        logoUrl={FOTO}
        portadaUrl={FOTO}
        galeria={[1, 2, 3].map((i) => ({ id: i, url: FOTO, descripcion: `Foto ${i}`, orden: i }))}
      />
    ),
  },
  resenas: {
    titulo: 'Reseñas',
    enPanel: true,
    contenido: (
      <ResenasAdmin
        conComercio
        conRevision
        resenas={[
          {
            id: 1,
            comercioId: 1,
            comercioNombre: 'Absurdo Sport Bar',
            porRevisar: true,
            estrellas: 2,
            mensaje: 'Tardaron mucho en atendernos.',
            autor: 'María Fernanda Gómez Restrepo',
            creadaEn: '2026-10-26T15:00:00Z',
            respuestaComercio: 'Lo sentimos mucho.',
            respuestaComercioAt: null,
            respuestaAdmin: 'Ya hablamos con ellos.',
            respuestaAdminAt: null,
          },
        ]}
      />
    ),
  },
  'miembro-nuevo': {
    titulo: 'Registrar miembro',
    contenido: <MiembroForm ciudades={CIUDADES} planes={PLANES} numerosDisponibles={['00090003', '00090004']} puedeCortesia />,
  },
  'miembro-editar': {
    titulo: 'Editar miembro',
    contenido: (
      <EditarMiembroForm
        ciudades={CIUDADES}
        miembro={{
          id: 1,
          perfil_id: null,
          nombres: 'María Fernanda',
          apellidos: 'Gómez Restrepo',
          cedula: '1000728751',
          telefono: '3183260745',
          direccion: 'Calle 37c # 44-21',
          ciudad_id: 2,
          correo: 'maria@correo.co',
        }}
      />
    ),
  },
  renovar: { titulo: 'Renovar membresía', contenido: <RenovarForm miembroId={1} planes={PLANES} puedeCortesia /> },
  revocar: {
    titulo: 'Revocar membresía',
    contenido: (
      <RevocarForm
        datos={{
          miembroId: 1,
          nombre: 'María',
          membresiaId: 1,
          plan: 'Membresía anual',
          fechaFin: '2027-02-14',
          diasRestantes: 108,
        }}
      />
    ),
  },
  numeros: { titulo: 'Cargar números', contenido: <CargarRangoForm /> },
  plan: {
    titulo: 'Plan',
    contenido: (
      <PlanForm plan={{ id: 1, nombre: 'Membresía anual', descripcion: 'Un año de beneficios', precio: 120000, duracion_meses: 12 }} />
    ),
  },
  novedad: {
    titulo: 'Novedad',
    contenido: (
      <AnuncioForm
        anuncio={{
          id: 1,
          titulo: 'Estreno de ORUM',
          cuerpo: 'Ven a nuestra inauguración.',
          imagenUrl: FOTO,
          mostrarPublico: true,
          mostrarMiembros: true,
          desde: '2026-10-01T15:00:00Z',
          hasta: null,
        }}
      />
    ),
  },
  publicidad: {
    titulo: 'Publicidad',
    enPanel: true,
    contenido: <GestorPublicidad piezas={[1, 2, 3].map((i) => ({ id: i, url: FOTO, descripcion: `Pieza ${i}`, activa: i !== 2 }))} />,
  },
  'usuario-nuevo': { titulo: 'Nuevo usuario', contenido: <UsuarioForm /> },
  'usuario-editar': {
    titulo: 'Editar usuario',
    contenido: (
      <EditarForm
        perfilId="x"
        email="ana@orum.co"
        empleado={{ nombres: 'Ana', apellidos: 'Restrepo', cedula: '1000000001', telefono: '3000000000' }}
      />
    ),
  },
  contrasena: { titulo: 'Cambiar contraseña', contenido: <PasswordForm /> },
}

export default async function VistaPreviaPanelMovil({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { f } = await searchParams
  const claves = f && PIEZAS[f] ? [f] : Object.keys(PIEZAS)

  return (
    <ToastProvider>
      <div className={cromo.portal} data-theme="light">
        <main className={shell.main}>
          {claves.map((clave) => {
            const p = PIEZAS[clave]
            return (
              <section key={clave} data-pieza={clave} style={{ marginBottom: 48 }}>
                <PageHeader title={p.titulo} />
                {p.enPanel ? (
                  <div className={ficha.datos}>
                    <section className={ficha.panel}>{p.contenido}</section>
                  </div>
                ) : (
                  <FormCard>{p.contenido}</FormCard>
                )}
              </section>
            )
          })}
        </main>
      </div>
    </ToastProvider>
  )
}
