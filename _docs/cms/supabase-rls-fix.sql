-- =====================================================================
-- SOLUCIÓN RLS PARA BUCKETS DE STORAGE EN SENTINEL CMS
-- Ejecuta este script en el SQL Editor de Supabase para corregir el error:
-- "new row violates row-level security policy"
-- =====================================================================

-- 1. Asegurar que los buckets existen en la tabla storage.buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-content', 'site-content', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Eliminar políticas conflictivas anteriores si existen para evitar duplicados
DROP POLICY IF EXISTS "Permitir todo en site-content" ON storage.objects;
DROP POLICY IF EXISTS "Permitir todo en site-images" ON storage.objects;
DROP POLICY IF EXISTS "Lectura publica site-content" ON storage.objects;
DROP POLICY IF EXISTS "Escritura autenticada site-content" ON storage.objects;
DROP POLICY IF EXISTS "Lectura publica site-images" ON storage.objects;
DROP POLICY IF EXISTS "Escritura autenticada site-images" ON storage.objects;

-- 3. Crear políticas globales permisivas para el bucket 'site-content'
-- Esto permite leer, insertar, actualizar y borrar archivos en este bucket
CREATE POLICY "Permitir todo en site-content"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'site-content')
WITH CHECK (bucket_id = 'site-content');

-- 4. Crear políticas globales permisivas para el bucket 'site-images'
-- Esto permite leer, insertar, actualizar y borrar imágenes en este bucket
CREATE POLICY "Permitir todo en site-images"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'site-images')
WITH CHECK (bucket_id = 'site-images');
