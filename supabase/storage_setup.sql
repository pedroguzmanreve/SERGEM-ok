-- ==============================================================================
-- SERGEM S.A.S. - CONFIGURACIÓN DE SUPABASE STORAGE & POLÍTICAS RLS (FASE 5)
-- Buckets: driver-audits, novedades-attachments, payroll-receipts, employee-docs
-- ==============================================================================

-- 1. CREACIÓN DE BUCKETS EN SUPABASE STORAGE
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'driver-audits',
    'driver-audits',
    true,
    10485760, -- 10 MB límite
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'novedades-attachments',
    'novedades-attachments',
    false,
    20971520, -- 20 MB límite
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  ),
  (
    'payroll-receipts',
    'payroll-receipts',
    false,
    15728640, -- 15 MB límite
    ARRAY['application/pdf', 'text/xml', 'application/xml', 'application/json', 'application/zip']
  ),
  (
    'employee-docs',
    'employee-docs',
    false,
    15728640, -- 15 MB límite
    ARRAY['image/jpeg', 'image/png', 'application/pdf', 'application/msword']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. HABILITAR ROW LEVEL SECURITY EN STORAGE.OBJECTS
-- ------------------------------------------------------------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS RLS PARA BUCKET: driver-audits
-- - Visualización: Pública o autenticada para supervisión operativa inmediata
-- - Subida: Repartidores, Jefes de Zona y Administradores autenticados
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "driver_audits_select_policy" ON storage.objects;
CREATE POLICY "driver_audits_select_policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'driver-audits');

DROP POLICY IF EXISTS "driver_audits_insert_policy" ON storage.objects;
CREATE POLICY "driver_audits_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'driver-audits');

DROP POLICY IF EXISTS "driver_audits_update_policy" ON storage.objects;
CREATE POLICY "driver_audits_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'driver-audits');

DROP POLICY IF EXISTS "driver_audits_delete_policy" ON storage.objects;
CREATE POLICY "driver_audits_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'driver-audits' AND (
  public.is_admin() OR public.is_zone_chief()
));


-- 4. POLÍTICAS RLS PARA BUCKET: novedades-attachments (Incapacidades / Permisos)
-- - Visualización: Administrativo, Jefe de Zona o el propio Colaborador
-- - Subida: Cualquier usuario autenticado reportando su incapacidad / novedad
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "novedades_select_policy" ON storage.objects;
CREATE POLICY "novedades_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'novedades-attachments' AND (
    public.is_admin() OR 
    public.is_zone_chief() OR 
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "novedades_insert_policy" ON storage.objects;
CREATE POLICY "novedades_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'novedades-attachments');

DROP POLICY IF EXISTS "novedades_delete_policy" ON storage.objects;
CREATE POLICY "novedades_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'novedades-attachments' AND (
    public.is_admin() OR public.is_zone_chief()
  )
);


-- 5. POLÍTICAS RLS PARA BUCKET: payroll-receipts (Desprendibles DIAN / Nómina)
-- - Visualización: Administrador ve todos; Colaborador ve su carpeta correspondiente
-- - Subida/Modificación: Solo Administrativos / Gestión Humana
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "payroll_receipts_select_policy" ON storage.objects;
CREATE POLICY "payroll_receipts_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payroll-receipts' AND (
    public.is_admin() OR 
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "payroll_receipts_manage_admin" ON storage.objects;
CREATE POLICY "payroll_receipts_manage_admin"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'payroll-receipts' AND public.is_admin())
WITH CHECK (bucket_id = 'payroll-receipts' AND public.is_admin());


-- 6. POLÍTICAS RLS PARA BUCKET: employee-docs (Cédulas, Licencias, SOAT)
-- - Visualización: Administrador y el propio colaborador
-- - Subida: Administrador y el propio colaborador para su expediente
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "employee_docs_select_policy" ON storage.objects;
CREATE POLICY "employee_docs_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-docs' AND (
    public.is_admin() OR 
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "employee_docs_insert_policy" ON storage.objects;
CREATE POLICY "employee_docs_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-docs' AND (
    public.is_admin() OR 
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "employee_docs_delete_policy" ON storage.objects;
CREATE POLICY "employee_docs_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'employee-docs' AND public.is_admin());
