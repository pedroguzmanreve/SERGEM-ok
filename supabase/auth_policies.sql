-- ==============================================================================
-- SERGEM S.A.S. - POLÍTICAS DE CONTROL DE ACCESO BASADO EN ROLES (RLS) & AUTH
-- FASE 4: Refinamiento de Políticas de Seguridad PostgreSQL para Supabase
-- ==============================================================================

-- 1. FUNCIONES AUXILIARES DE ROLES Y PERMISOS EN SUPABASE
-- ------------------------------------------------------------------------------

-- Función para obtener el rol del usuario actual autenticado
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- 1. Intentar obtener el rol desde la tabla de empleados (id coincide con auth.uid())
  SELECT rol INTO v_role
  FROM public.employees
  WHERE id = auth.uid();

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- 2. Si no se encuentra en employees, obtener desde los metadatos del JWT
  v_role := (auth.jwt() -> 'user_metadata' ->> 'rol');
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- 3. Por defecto 'Repartidor'
  RETURN 'Repartidor';
END;
$$;

-- Funciones booleanas de conveniencia para las directivas RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.get_current_user_role() IN ('Administrativo', 'Jefe de Operaciones');
$$;

CREATE OR REPLACE FUNCTION public.is_zone_chief()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.get_current_user_role() = 'Jefe de Zona';
$$;

CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.get_current_user_role() = 'Repartidor';
$$;

-- 2. ELIMINAR POLÍTICAS PERMISIVAS ANTERIORES
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'company_settings',
      'clients',
      'employees',
      'payroll_periods',
      'weekly_schedules',
      'zone_novedades',
      'client_order_reports',
      'daily_attendances',
      'employee_novedades'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Permissive full access for all on %I" ON %I;', tbl, tbl);
  END LOOP;
END $$;

-- 3. HABILITAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
-- ------------------------------------------------------------------------------
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_novedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_order_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_novedades ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS ESPECÍFICAS POR TABLA Y ROL
-- ==============================================================================

-- 4.1. TABLA: company_settings
-- - Lectura: Todos los usuarios autenticados (para calcular tarifas y ver NIT).
-- - Modificación: Solo Administrativos / Jefe de Operaciones.
DROP POLICY IF EXISTS "company_settings_select_authenticated" ON company_settings;
CREATE POLICY "company_settings_select_authenticated"
ON company_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "company_settings_admin_all" ON company_settings;
CREATE POLICY "company_settings_admin_all"
ON company_settings FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 4.2. TABLA: employees (Colaboradores y Personal)
-- - Lectura: Administrativo y Jefe de Zona ven a todos; Repartidores solo su propio registro.
-- - Inserción/Eliminación: Solo Administrativos.
-- - Actualización: Administrativos; Jefe de Zona datos de contacto; Repartidor su información personal.
DROP POLICY IF EXISTS "employees_select_policy" ON employees;
CREATE POLICY "employees_select_policy"
ON employees FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  public.is_zone_chief() OR
  id = auth.uid() OR
  cedula = (auth.jwt() -> 'user_metadata' ->> 'cedula')
);

DROP POLICY IF EXISTS "employees_insert_admin" ON employees;
CREATE POLICY "employees_insert_admin"
ON employees FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "employees_update_policy" ON employees;
CREATE POLICY "employees_update_policy"
ON employees FOR UPDATE
TO authenticated
USING (
  public.is_admin() OR
  (public.is_zone_chief() AND rol = 'Repartidor') OR
  id = auth.uid()
)
WITH CHECK (
  public.is_admin() OR
  (public.is_zone_chief() AND rol = 'Repartidor') OR
  id = auth.uid()
);

DROP POLICY IF EXISTS "employees_delete_admin" ON employees;
CREATE POLICY "employees_delete_admin"
ON employees FOR DELETE
TO authenticated
USING (public.is_admin());


-- 4.3. TABLA: clients (Clientes Corporativos)
-- - Lectura: Todos los colaboradores autenticados (para saber cliente de turno).
-- - Inserción/Actualización/Eliminación: Administrativo y Jefe de Zona.
DROP POLICY IF EXISTS "clients_select_authenticated" ON clients;
CREATE POLICY "clients_select_authenticated"
ON clients FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "clients_manage_admin_zone" ON clients;
CREATE POLICY "clients_manage_admin_zone"
ON clients FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_zone_chief())
WITH CHECK (public.is_admin() OR public.is_zone_chief());


-- 4.4. TABLA: payroll_periods (Periodos de Nómina)
-- - Lectura: Todos los colaboradores autenticados.
-- - Gestión completa: Solo Administrativos.
DROP POLICY IF EXISTS "payroll_periods_select_authenticated" ON payroll_periods;
CREATE POLICY "payroll_periods_select_authenticated"
ON payroll_periods FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "payroll_periods_manage_admin" ON payroll_periods;
CREATE POLICY "payroll_periods_manage_admin"
ON payroll_periods FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 4.5. TABLA: weekly_schedules (Programación y Turnos Semanales)
-- - Lectura: Administrativos y Jefes de Zona ven todo; Repartidores solo sus turnos asignados.
-- - Gestión completa: Administrativos y Jefes de Zona.
DROP POLICY IF EXISTS "weekly_schedules_select_policy" ON weekly_schedules;
CREATE POLICY "weekly_schedules_select_policy"
ON weekly_schedules FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  public.is_zone_chief() OR
  repartidor_id = auth.uid()::text OR
  repartidor_id IN (SELECT id::text FROM employees WHERE id = auth.uid() OR cedula = (auth.jwt() -> 'user_metadata' ->> 'cedula'))
);

DROP POLICY IF EXISTS "weekly_schedules_manage_admin_zone" ON weekly_schedules;
CREATE POLICY "weekly_schedules_manage_admin_zone"
ON weekly_schedules FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_zone_chief())
WITH CHECK (public.is_admin() OR public.is_zone_chief());


-- 4.6. TABLA: zone_novedades (Novedades de Campo de Zona)
-- - Lectura: Administrativos y Jefes de Zona ven todo; Repartidores solo sus novedades.
-- - Gestión completa: Administrativos y Jefes de Zona.
DROP POLICY IF EXISTS "zone_novedades_select_policy" ON zone_novedades;
CREATE POLICY "zone_novedades_select_policy"
ON zone_novedades FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  public.is_zone_chief() OR
  repartidor_id = auth.uid()::text
);

DROP POLICY IF EXISTS "zone_novedades_manage_admin_zone" ON zone_novedades;
CREATE POLICY "zone_novedades_manage_admin_zone"
ON zone_novedades FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_zone_chief())
WITH CHECK (public.is_admin() OR public.is_zone_chief());


-- 4.7. TABLA: client_order_reports (Reportes de Pedidos y Horas Clientes)
-- - Lectura: Administrativos y Jefes de Zona ven todo; Repartidores ven sus entregas reportadas.
-- - Inserción: Administrativos, Jefes de Zona y Repartidores (para reportar entrega).
-- - Modificación/Eliminación: Administrativos y Jefes de Zona.
DROP POLICY IF EXISTS "client_order_reports_select_policy" ON client_order_reports;
CREATE POLICY "client_order_reports_select_policy"
ON client_order_reports FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  public.is_zone_chief() OR
  repartidor_id = auth.uid()::text
);

DROP POLICY IF EXISTS "client_order_reports_insert_policy" ON client_order_reports;
CREATE POLICY "client_order_reports_insert_policy"
ON client_order_reports FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin() OR
  public.is_zone_chief() OR
  repartidor_id = auth.uid()::text
);

DROP POLICY IF EXISTS "client_order_reports_manage_admin_zone" ON client_order_reports;
CREATE POLICY "client_order_reports_manage_admin_zone"
ON client_order_reports FOR UPDATE
TO authenticated
USING (public.is_admin() OR public.is_zone_chief())
WITH CHECK (public.is_admin() OR public.is_zone_chief());

DROP POLICY IF EXISTS "client_order_reports_delete_admin" ON client_order_reports;
CREATE POLICY "client_order_reports_delete_admin"
ON client_order_reports FOR DELETE
TO authenticated
USING (public.is_admin());


-- 4.8. TABLA: daily_attendances (Asistencia Diaria y Check-In)
-- - Lectura: Administrativos y Jefes de Zona ven toda la flota; Repartidor solo su asistencia.
-- - Registro/Actualización: Repartidor (su propio registro de check-in / fuera perímetro) y Jefes/Admins.
DROP POLICY IF EXISTS "daily_attendances_select_policy" ON daily_attendances;
CREATE POLICY "daily_attendances_select_policy"
ON daily_attendances FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  public.is_zone_chief() OR
  repartidor_id = auth.uid()::text
);

DROP POLICY IF EXISTS "daily_attendances_insert_update_policy" ON daily_attendances;
CREATE POLICY "daily_attendances_insert_update_policy"
ON daily_attendances FOR ALL
TO authenticated
USING (
  public.is_admin() OR
  public.is_zone_chief() OR
  repartidor_id = auth.uid()::text
)
WITH CHECK (
  public.is_admin() OR
  public.is_zone_chief() OR
  repartidor_id = auth.uid()::text
);


-- 4.9. TABLA: employee_novedades (Novedades de Liquidación de Nómina)
-- - Lectura: Administrativos ven todas; Repartidor ve solo la suya para su comprobante de pago.
-- - Modificación completa: Solo Administrativos.
DROP POLICY IF EXISTS "employee_novedades_select_policy" ON employee_novedades;
CREATE POLICY "employee_novedades_select_policy"
ON employee_novedades FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  employee_id = auth.uid()::text
);

DROP POLICY IF EXISTS "employee_novedades_manage_admin" ON employee_novedades;
CREATE POLICY "employee_novedades_manage_admin"
ON employee_novedades FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 5. TRIGGER PARA AUTO-VINCULAR NUEVOS USUARIOS DE AUTH CON EMPLOYEES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el usuario no existe en la tabla employees, se registra un perfil base
  INSERT INTO public.employees (
    id,
    cedula,
    nombre,
    apellido,
    cargo,
    departamento,
    salario_base,
    rol,
    email,
    activo
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'cedula', SUBSTRING(NEW.id::text, 1, 10)),
    COALESCE(NEW.raw_user_meta_data->>'nombre', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'apellido', 'SERGEM'),
    COALESCE(NEW.raw_user_meta_data->>'cargo', 'Mensajero Motorizado'),
    COALESCE(NEW.raw_user_meta_data->>'departamento', 'Operaciones y Mensajería'),
    1423500,
    COALESCE((NEW.raw_user_meta_data->>'rol')::text, 'Repartidor'),
    NEW.email,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sobre auth.users (en entornos Supabase administrados)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
