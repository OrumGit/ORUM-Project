-- Registros pendientes de pago (alta por Mercado Pago).
--
-- Flujo: la persona crea su usuario de autenticación al registrarse, pero la ficha
-- de socio, el número y la membresía nacen SOLO cuando Mercado Pago aprueba el
-- cobro. Esta tabla guarda los datos del formulario hasta entonces, ligados al
-- usuario de autenticación.
--
-- - `auth_user_id` con `on delete cascade`: si se borra el usuario (limpieza de
--   cuentas sin pago a los 10 días), su registro se borra con él.
-- - `mp_preapproval_id` es el intento de pago en curso. Cada reintento reemplaza
--   el anterior y el viejo pasa a `cancelado`.
-- - Solo `service_role` la escribe. Ningún rol de cliente tiene acceso.
--
-- NO APLICADA. Pendiente de confirmación antes de tocar la base.

create table public.registros_pendientes (
  id                     bigint generated always as identity primary key,
  auth_user_id           uuid not null unique
                           references auth.users(id) on delete cascade,
  plan_id                bigint not null references public.planes_membresia(id),
  nombres                text not null check (char_length(nombres) between 1 and 80),
  apellidos              text not null check (char_length(apellidos) between 1 and 80),
  cedula                 text not null check (cedula ~ '^\d{6,12}$'),
  -- Siempre en minúsculas y sin espacios: la base rechaza cualquier otra forma.
  correo                 text not null
                           check (correo = lower(btrim(correo))
                                  and correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefono               text,
  direccion              text,
  ciudad_id              smallint references public.ciudades(id),
  terminos_aceptados_at  timestamptz not null,
  terminos_version       text not null,
  estado                 text not null default 'pendiente'
                           check (estado in ('pendiente', 'completado', 'cancelado')),
  mp_preapproval_id      text unique,
  miembro_id             bigint references public.miembros(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Una cédula no puede tener dos registros pendientes a la vez.
create unique index registros_pendientes_cedula_activa
  on public.registros_pendientes (cedula)
  where estado = 'pendiente';

-- Un correo no puede tener dos registros pendientes a la vez. Como el índice de
-- auth.users distingue mayúsculas, la unicidad real la da esta columna normalizada
-- y la comprobación contra auth.users (lower(email)) que hace la aplicación.
create unique index registros_pendientes_correo_activo
  on public.registros_pendientes (correo)
  where estado = 'pendiente';

-- La limpieza busca por antigüedad.
create index registros_pendientes_created_at
  on public.registros_pendientes (created_at);

alter table public.registros_pendientes enable row level security;

revoke all on public.registros_pendientes from public, anon, authenticated;
grant select, insert, update, delete on public.registros_pendientes to service_role;
