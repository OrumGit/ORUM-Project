-- ORUM · El encuadre de la VISTA PREVIA de un video (13/11/2026)
--
-- Encargo: «la visualización completa con el formato original, pero la
-- previsualización con un formato ajustado, y que al editar el video se
-- pueda ajustar esa previsualización».
--
-- Desde ahora el video se sube ENTERO (sin recortar) y lo que elige el
-- administrador es qué parte enseña la vista previa (la pieza del carrusel,
-- la tarjeta de la novedad). Se guarda aquí como un rectángulo en fracciones
-- del video: {"x":0.125,"y":0,"w":0.75,"h":1}. NULL = centrado (lo de
-- antes). Al agrandarlo, el video se ve completo.
--
-- Idempotente y aditiva. Se aplica a mano en el SQL Editor de Supabase; sin
-- ella los videos se guardan igual y su vista previa sale centrada.

alter table public.anuncios add column if not exists video_encuadre jsonb;
alter table public.publicidad add column if not exists video_encuadre jsonb;

comment on column public.anuncios.video_encuadre is
  'Encuadre de la vista previa del video: {x,y,w,h} en fracciones (0-1) del video entero. NULL = centrado.';
comment on column public.publicidad.video_encuadre is
  'Encuadre de la vista previa del video: {x,y,w,h} en fracciones (0-1) del video entero. NULL = centrado.';
