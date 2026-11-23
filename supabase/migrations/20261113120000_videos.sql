-- ORUM · Videos en las novedades y en el carrusel de la portada (13/11/2026)
--
-- Encargo: «que el administrador, en las novedades y la publicidad, pueda
-- subir videos de máximo 5 minutos, con el visor para recortarlo y ajustar
-- la duración, para que se vea correctamente en los portales».
--
-- El video llega YA preparado desde el navegador del administrador: MP4
-- (H.264 + AAC), recortado, a 720p como mucho y de 48 MB como mucho
-- (src/lib/videos/video.ts). La base solo guarda su dirección; la PORTADA del
-- video (su primer fotograma) se guarda como la imagen de siempre
-- (`imagen_url`), así todo lo que enseñaba imágenes sigue funcionando.
--
-- Idempotente. Se aplica a mano en el SQL Editor de Supabase; sin ella el
-- panel sigue con imágenes y solo el video avisa de que falta esto.

-- ---------------------------------------------------------------------------
-- 1. Columnas: la dirección del video (NULL = la pieza es una imagen)
-- ---------------------------------------------------------------------------

alter table public.anuncios add column if not exists video_url text;
alter table public.publicidad add column if not exists video_url text;

comment on column public.anuncios.video_url is
  'MP4 de la novedad (bucket videos-orum). Su portada es imagen_url. NULL = sin video.';
comment on column public.publicidad.video_url is
  'MP4 de la pieza del carrusel (bucket videos-orum). Su portada es imagen_url. NULL = es una imagen.';

-- ---------------------------------------------------------------------------
-- 2. El bucket de los videos
--
-- Su nombre y sus carpetas (`novedades/`, `portada/`) NO dicen «publicidad»,
-- «anuncio», «ads» ni «banner»: los bloqueadores de anuncios ocultan esas
-- direcciones (CLAUDE.md). 50 MB por archivo (el editor no pasa de 48) y
-- solo MP4.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos-orum', 'videos-orum', true, 52428800, array['video/mp4'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cualquiera puede VER los videos: salen en la portada y en las novedades.
drop policy if exists "videos_orum_lectura" on storage.objects;
create policy "videos_orum_lectura"
on storage.objects for select to anon, authenticated
using (bucket_id = 'videos-orum');

-- Escribir y borrar, solo la administración. En la práctica las subidas van
-- con una dirección firmada que da el servidor al super administrador
-- (`pedirSubidaVideo`) y los borrados con la clave de servicio; esta política
-- es la red por si alguien llama a la API con su sesión.
drop policy if exists "videos_orum_escritura" on storage.objects;
create policy "videos_orum_escritura"
on storage.objects for all to authenticated
using (bucket_id = 'videos-orum' and public.es_administracion())
with check (bucket_id = 'videos-orum' and public.es_administracion());
