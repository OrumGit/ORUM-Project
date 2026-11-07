-- ============================================================================
-- DÓNDE SE VE UN COMERCIO  ·  07/11/2026
-- ----------------------------------------------------------------------------
-- Encargo del propietario: poder registrar un comercio y tenerlo oculto
-- hasta tener todos sus recursos, eligiendo si se ve en el portal inicial,
-- en el de miembros o en ambos.
--
--   · visible_publico:  sale en la portada, el directorio y su ficha pública.
--   · visible_miembros: sale en el Inicio del socio y su ficha de socio.
--
-- Las dos `true` por defecto: los comercios que ya existen se siguen viendo
-- igual. Van ENCIMA de `activo` (un aliado inactivo no sale en ningún sitio).
-- No cambian la caja ni las políticas RLS: lo filtra la aplicación.
--
-- Se aplica a mano, una vez. El código aguanta sin ella (se ve todo).
-- Comprobación: supabase/verificacion/comercios_visibilidad_verificacion.sql
-- ============================================================================

alter table public.comercios
  add column if not exists visible_publico boolean not null default true,
  add column if not exists visible_miembros boolean not null default true;

comment on column public.comercios.visible_publico is
  'Se ve en el Portal Público (portada, directorio y ficha). Encima de activo.';
comment on column public.comercios.visible_miembros is
  'Se ve en el Portal de Miembros (Inicio y ficha del socio). Encima de activo.';
