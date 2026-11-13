-- Comprobación de 20261113120000_videos.sql (solo lectura).

-- 1. Las dos columnas existen.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name = 'video_url'
  and table_name in ('anuncios', 'publicidad')
order by table_name;

-- 2. El bucket existe, es público, admite 50 MB y solo MP4.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'videos-orum';

-- 3. Sus dos políticas.
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'videos_orum_%'
order by policyname;

-- 4. Qué novedades y piezas del carrusel llevan video.
select 'novedad' as que, id, video_url from public.anuncios where video_url is not null
union all
select 'portada', id, video_url from public.publicidad where video_url is not null
order by que, id;
