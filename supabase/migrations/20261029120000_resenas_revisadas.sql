-- ============================================================================
-- RESEÑAS REVISADAS  ·  29/10/2026
-- ----------------------------------------------------------------------------
-- Encargo del propietario: «que en la portada del panel aparezca una alerta
-- cuando una reseña tiene menos de 4 estrellas, para que se pueda validar».
-- Para que la alerta se vaya hay que poder decir «ya la revisé»: eso guardan
-- estas dos columnas. Si el socio cambia sus estrellas o su mensaje, la
-- reseña vuelve a quedar POR REVISAR (trigger de abajo).
--
-- Se aplica a mano, una vez. El código aguanta sin ella: sin las columnas,
-- «por revisar» es «menos de 4 estrellas y sin respuesta de ORUM», y el
-- botón «Marcar como revisada» avisa de que falta esta migración.
-- ============================================================================

alter table public.resenas
  add column if not exists revisada_at timestamptz,
  add column if not exists revisada_por uuid references auth.users(id) on delete set null;

comment on column public.resenas.revisada_at is
  'Cuándo un administrador marcó la reseña como revisada (alerta de calificación baja). Se vacía si el socio cambia estrellas o mensaje.';

-- Si el socio cambia lo que dijo, hay que volver a mirarla.
create or replace function public.fn_resena_volver_a_revisar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estrellas is distinct from old.estrellas or new.mensaje is distinct from old.mensaje then
    new.revisada_at := null;
    new.revisada_por := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_resenas_volver_a_revisar on public.resenas;
create trigger trg_resenas_volver_a_revisar
before update on public.resenas
for each row execute function public.fn_resena_volver_a_revisar();

-- La alerta de la portada pide justo esto: bajas y sin revisar, recientes primero.
create index if not exists idx_resenas_por_revisar
  on public.resenas (created_at desc)
  where estrellas < 4 and revisada_at is null;
