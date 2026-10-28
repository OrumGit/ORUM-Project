'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { InicioPanel } from '@/app/admin/_components/inicio-panel'
import { ListaMiembros } from '@/app/admin/miembros/_components/lista-miembros'
import type { FilaMiembro } from '@/lib/miembros/listado'
import { AppShell } from '@/components/shell/app-shell'
import { Badge, StatusBadge, VenceEn } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Grid, PageHeader, Section, Stack } from '@/components/ui/layout'
import { SegmentedControl } from '@/components/ui/segmented'
import type { MiembroEncontrado } from '@/lib/miembros/buscar-miembros'
import type { RolCodigo } from '@/lib/supabase/database.types'

/*
  Vista previa del app shell con datos falsos.

  Existe porque el shell real vive en `/admin`, que exige sesión de Supabase:
  sin credenciales no habría forma de revisar la navegación, el indicador
  activo, la barra inferior ni la paleta. Es la misma razón por la que existe
  `/dev/ui`, y por eso el shell recibe sus datos por props en vez de leerlos
  él mismo.
*/

const MIEMBROS_FALSOS: MiembroEncontrado[] = [
  {
    id: 1,
    numeroMembresia: '00184472',
    nombre: 'María Fernanda Ospina',
    cedula: '1020304050',
    fotoUrl: null,
    plan: 'Oro',
    estado: { activa: true, diasRestantes: 190 },
  },
  {
    id: 2,
    numeroMembresia: '00190038',
    nombre: 'Carlos Andrés Betancur',
    cedula: '1098765432',
    fotoUrl: null,
    plan: 'Oro',
    estado: { activa: true, diasRestantes: 12 },
  },
  {
    id: 3,
    numeroMembresia: '00201155',
    nombre: 'Juliana del Pilar Rojas',
    cedula: '1122334455',
    fotoUrl: null,
    plan: 'Base',
    estado: { activa: false, motivo: 'vencida' },
  },
]

async function buscarFalso(termino: string): Promise<MiembroEncontrado[]> {
  // Retardo para poder ver el estado de carga de la paleta.
  await new Promise((r) => setTimeout(r, 260))
  const t = termino.toLowerCase()
  return MIEMBROS_FALSOS.filter(
    (m) =>
      m.nombre.toLowerCase().includes(t) ||
      m.numeroMembresia.includes(t) ||
      m.cedula.includes(t),
  )
}

const NOMBRES = ['Laura Martínez Rojas', 'Pedro Cano', 'Andrea Patiño Vélez', 'Julián Restrepo', 'Sofía Guzmán', 'María Salazar', 'David Orozco', 'Carlos Gómez']

/** Filas falsas para la lista de miembros: un poco de cada estado. */
const FILAS_FALSAS: FilaMiembro[] = Array.from({ length: 63 }, (_, i) => {
  const tipo = i % 7
  return {
    id: i + 1,
    numeroMembresia: String(184400 + i).padStart(8, '0'),
    nombre: `${NOMBRES[i % NOMBRES.length]}${i >= NOMBRES.length ? ` ${i}` : ''}`,
    cedula: String(1020300000 + i * 97),
    telefono: `300 ${String(1000000 + i * 1234).slice(0, 3)} ${String(1000 + i).slice(0, 4)}`,
    fotoUrl: null,
    plan: i % 3 === 0 ? 'Familiar' : 'Anual',
    planId: i % 3 === 0 ? 2 : 1,
    estado:
      tipo === 5
        ? { activa: false, motivo: 'vencida' }
        : tipo === 6
          ? null
          : { activa: true, diasRestantes: tipo === 0 ? 3 : 40 + i * 3 },
    fechaFin: tipo === 6 ? null : '2027-01-01',
  }
})

export function ShellPreview() {
  const [rol, setRol] = useState<RolCodigo>('super_admin')
  const [ruta, setRuta] = useState('/admin')

  return (
    <AppShell
      // `key` fuerza el remontaje al cambiar de rol, para que la navegación
      // se reconstruya con los destinos correctos.
      key={rol}
      user={{
        nombre: rol === 'super_admin' ? 'Daniel Bulla' : 'Ana Restrepo',
        email: rol === 'super_admin' ? 'daniel@orum.co' : 'ana@orum.co',
        rolNombre: rol === 'super_admin' ? 'Super administrador' : 'Empleado',
        rolCodigo: rol,
      }}
      cerrarSesion={() => {}}
      buscar={buscarFalso}
      rutaSimulada={ruta}
    >
      {/* Los controles de la vista previa, arriba en todas las secciones. */}
      <Stack gap={7}>
        <Stack direction="row" gap={6} wrap>
          <SegmentedControl
            options={[
              { value: 'super_admin', label: 'Super administrador' },
              { value: 'empleado', label: 'Empleado' },
            ]}
            value={rol}
            onChange={setRol}
            ariaLabel="Rol simulado"
            size="sm"
          />
          <SegmentedControl
            options={[
              { value: '/admin', label: 'Inicio' },
              { value: '/admin/miembros', label: 'Miembros' },
              { value: '/admin/metricas', label: 'Métricas' },
              { value: '/admin/anuncios', label: 'Novedades' },
            ]}
            value={ruta}
            onChange={setRuta}
            ariaLabel="Sección simulada"
            size="sm"
          />
        </Stack>

      {ruta === '/admin/miembros' ? (
        <ListaMiembros
          filas={FILAS_FALSAS}
          planes={[
            { id: 1, nombre: 'Anual' },
            { id: 2, nombre: 'Familiar' },
          ]}
          params={{}}
          esSuperAdmin={rol === 'super_admin'}
        />
      ) : ruta === '/admin' ? (
        <InicioPanel
          esSuperAdmin={rol === 'super_admin'}
          saludo="Buenas tardes"
          nombre={rol === 'super_admin' ? 'Daniel' : 'Ana'}
          fecha="miércoles 15 de octubre"
          cifras={{ miembros: 1284, vigentes: 1032, porVencer: 87, comercios: 46 }}
          vencen={[
            { miembroId: 1, nombre: 'Laura Martínez Rojas', numero: '00184472', fotoUrl: null, dias: 0 },
            { miembroId: 2, nombre: 'Carlos Gómez', numero: '00190038', fotoUrl: null, dias: 1 },
            { miembroId: 3, nombre: 'Andrea Patiño Vélez', numero: '00201155', fotoUrl: null, dias: 3 },
            { miembroId: 4, nombre: 'Julián Restrepo', numero: '00200077', fotoUrl: null, dias: 5 },
          ]}
          actividad={[
            { id: 1, quien: 'Ana Restrepo', que: 'Miembro registrado — plan Anual, $120000', miembro: 'Pedro Cano', cuando: 'Hace 12 min' },
            { id: 2, quien: 'Daniel Bulla', que: 'Membresía renovada — plan Anual, vence 2027-10-15', miembro: 'Laura Gil', cuando: 'Hace 3 h' },
          ]}
          resenas={
            rol === 'super_admin'
              ? {
                  total: 3,
                  recientes: [
                    { id: 1, comercioNombre: 'Dulces Momentos', estrellas: 2, autor: 'Ana Ruiz', mensaje: 'Tardaron casi una hora en atendernos y el descuento no lo quisieron aplicar.' },
                    { id: 2, comercioNombre: 'Bendito Brunch', estrellas: 3, autor: 'Pedro Cano', mensaje: 'Bien, pero el lugar estaba lleno.' },
                    { id: 3, comercioNombre: 'Café de prueba', estrellas: 1, autor: 'Laura Gil', mensaje: null },
                  ],
                }
              : undefined
          }
        />
      ) : (
      <>
      <PageHeader
        title="Vista previa del shell"
        description="Datos falsos. Cambia el rol o la sección para ver cómo se adaptan la barra de opciones y la barra inferior, y escribe en el buscador de arriba."
        actions={<Button icon={<Plus size={16} />}>Registrar miembro</Button>}
      />

      <Stack gap={7}>
        <Section title="Qué revisar aquí">
          <Grid min="260px">
            <Card>
              <Stack gap={2}>
                <Badge tone="gold" size="sm">
                  Navegación
                </Badge>
                <p className="muted">
                  Por debajo de 768px la barra de opciones deja paso a la barra inferior,
                  en la zona del pulgar, y la cuenta pasa a la hoja «Más».
                </p>
              </Stack>
            </Card>

            <Card>
              <Stack gap={2}>
                <Badge tone="gold" size="sm">
                  Indicador activo
                </Badge>
                <p className="muted">
                  Cambia la sección simulada: el filo dorado de la activa se desliza de una
                  opción a otra en vez de parpadear.
                </p>
              </Stack>
            </Card>

            <Card>
              <Stack gap={2}>
                <Badge tone="gold" size="sm">
                  Paleta ⌘K
                </Badge>
                <p className="muted">
                  Busca «maría», «juliana» o «0018». El estado de la membresía se ve en el
                  propio resultado, sin abrir la ficha.
                </p>
              </Stack>
            </Card>
          </Grid>
        </Section>

        <Section title="Contenido de ejemplo">
          <Grid min="280px">
            {MIEMBROS_FALSOS.map((m) => (
              <Card key={m.id} padding="none">
                <CardHeader
                  title={m.nombre}
                  subtitle={`Nº ${m.numeroMembresia} · CC ${m.cedula}`}
                />
                <CardBody>
                  <Stack direction="row" gap={2} align="center" wrap>
                    {m.estado && <StatusBadge estado={m.estado} />}
                    {m.estado && <VenceEn estado={m.estado} />}
                  </Stack>
                </CardBody>
              </Card>
            ))}
          </Grid>
        </Section>
      </Stack>
      </>
      )}
      </Stack>
    </AppShell>
  )
}
