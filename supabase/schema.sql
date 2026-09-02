-- ==============================================================================
-- SERGEM S.A.S. - ESQUEMA DE BASE DE DATOS COMPLETO (PostgreSQL / Supabase)
-- FASE 2: DDL, Relaciones, Triggers, RLS y Seed Data Inicial
-- ==============================================================================

-- 1. HABILITAR EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FUNCIÓN DE AUDITORÍA AUTOMÁTICA (updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. CREACIÓN DE TABLAS
-- ==============================================================================

-- 3.1. Configuración de la Empresa y Parámetros de Nómina / Tarifas
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa TEXT NOT NULL,
  nit TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  ciudad TEXT,
  email TEXT,
  smmlv NUMERIC(15, 2) NOT NULL DEFAULT 1423500,
  auxilio_transporte_mensual NUMERIC(15, 2) NOT NULL DEFAULT 200000,
  jornada_maxima_semanal NUMERIC(5, 2) NOT NULL DEFAULT 42,
  jornada_diaria_base NUMERIC(5, 2) NOT NULL DEFAULT 7,
  porcentaje_salud_empleado NUMERIC(6, 4) NOT NULL DEFAULT 0.0400,
  porcentaje_pension_empleado NUMERIC(6, 4) NOT NULL DEFAULT 0.0400,
  porcentaje_salud_empresa NUMERIC(6, 4) NOT NULL DEFAULT 0.0850,
  porcentaje_pension_empresa NUMERIC(6, 4) NOT NULL DEFAULT 0.1200,
  aplica_exencion_art114 BOOLEAN NOT NULL DEFAULT true,
  porcentaje_caja_compensacion NUMERIC(6, 4) NOT NULL DEFAULT 0.0400,
  porcentaje_sena NUMERIC(6, 4) NOT NULL DEFAULT 0.0200,
  porcentaje_icbf NUMERIC(6, 4) NOT NULL DEFAULT 0.0300,
  tarifas_generales_clientes JSONB NOT NULL DEFAULT '{
    "tarifaBasePaquete": 4500,
    "tarifaHoraOrdinaria": 14500,
    "tarifaHoraExtraDiurna": 18125,
    "tarifaHoraExtraNocturna": 25375,
    "tarifaSalidaFueraPerimetro": 22000,
    "tarifaRecargoDominical": 25375,
    "tarifaRecargoNocturno": 5075
  }'::jsonb,
  tarifas_arl JSONB NOT NULL DEFAULT '{
    "1": 0.00522,
    "2": 0.01044,
    "3": 0.02436,
    "4": 0.04350,
    "5": 0.06960
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2. Clientes Corporativos y Tarifarios Especiales
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,
  nombre TEXT NOT NULL,
  nit TEXT NOT NULL,
  direccion TEXT,
  ciudad TEXT,
  telefono TEXT,
  email_contacto TEXT,
  persona_contacto TEXT,
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  sedes JSONB NOT NULL DEFAULT '[]'::jsonb,
  tarifas JSONB NOT NULL,
  observaciones TEXT,
  fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3. Empleados y Colaboradores
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,
  cedula TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  cargo TEXT NOT NULL,
  departamento TEXT NOT NULL,
  salario_base NUMERIC(15, 2) NOT NULL DEFAULT 1423500,
  tipo_contrato TEXT NOT NULL DEFAULT 'Término Indefinido',
  nivel_riesgo_arl INTEGER NOT NULL DEFAULT 1 CHECK (nivel_riesgo_arl BETWEEN 1 AND 5),
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  banco TEXT DEFAULT 'Bancolombia',
  tipo_cuenta TEXT DEFAULT 'Ahorros' CHECK (tipo_cuenta IN ('Ahorros', 'Corriente')),
  numero_cuenta TEXT DEFAULT '',
  eps TEXT DEFAULT 'SURA',
  afp TEXT DEFAULT 'Porvenir',
  ccf TEXT DEFAULT 'Comfandi',
  activo BOOLEAN NOT NULL DEFAULT true,
  rol TEXT NOT NULL DEFAULT 'Repartidor' CHECK (rol IN ('Administrativo', 'Jefe de Zona', 'Jefe de Operaciones', 'Repartidor')),
  placa_vehiculo TEXT,
  jefe_zona_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  email TEXT,
  telefono TEXT,
  estado_invitacion TEXT DEFAULT 'Activo' CHECK (estado_invitacion IN ('Invitado', 'Activo', 'Pendiente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4. Periodos de Liquidación de Nómina
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,
  nombre_periodo TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  tipo_periodo TEXT NOT NULL DEFAULT 'Quincenal' CHECK (tipo_periodo IN ('Quincenal', 'Mensual')),
  dias_base_periodo INTEGER NOT NULL DEFAULT 15,
  estado TEXT NOT NULL DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'Liquidata', 'Aprobada', 'Pagada')),
  fecha_liquidacion DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5. Programación Semanal de Turnos por Repartidor
CREATE TABLE IF NOT EXISTS weekly_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,
  repartidor_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  jefe_zona_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  semana_inicio DATE NOT NULL,
  dias JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_weekly_schedule_repartidor_semana UNIQUE (repartidor_id, semana_inicio)
);

-- 3.6. Novedades de Campo Registradas por Jefe de Zona
CREATE TABLE IF NOT EXISTS zone_novedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,
  repartidor_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  jefe_zona_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Permiso Remunerado', 'Permiso No Remunerado', 'Incapacidad')),
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  duracion_horas NUMERIC(5, 2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7. Reportes de Pedidos y Horas de Repartidores por Cliente
CREATE TABLE IF NOT EXISTS client_order_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,
  cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  nombre_cliente TEXT NOT NULL,
  repartidor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  nombre_repartidor TEXT NOT NULL,
  placa_vehiculo TEXT NOT NULL,
  fecha DATE NOT NULL,
  paquetes_entregados INTEGER NOT NULL DEFAULT 0,
  venta_neta NUMERIC(15, 2) NOT NULL DEFAULT 0,
  horas_trabajadas NUMERIC(6, 2) NOT NULL DEFAULT 0,
  horas_ordinarias NUMERIC(6, 2) NOT NULL DEFAULT 0,
  horas_extras_diurnas NUMERIC(6, 2) NOT NULL DEFAULT 0,
  horas_extras_nocturnas NUMERIC(6, 2) NOT NULL DEFAULT 0,
  horas_festivas NUMERIC(6, 2) NOT NULL DEFAULT 0,
  horas_extras_festivas_nocturnas NUMERIC(6, 2) NOT NULL DEFAULT 0,
  recargo_nocturno NUMERIC(6, 2) NOT NULL DEFAULT 0,
  recargo_festivo NUMERIC(6, 2) NOT NULL DEFAULT 0,
  salidas_fuera_perimetro INTEGER NOT NULL DEFAULT 0,
  valor_fuera_perimetro NUMERIC(15, 2) NOT NULL DEFAULT 0,
  detalles_fuera_perimetro JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8. Asistencia Diaria en Vivo de Repartidores
CREATE TABLE IF NOT EXISTS daily_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repartidor_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  dia_semana TEXT NOT NULL,
  fecha DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE_INICIO' CHECK (estado IN ('PENDIENTE_INICIO', 'INICIADO', 'FINALIZADO', 'DESCANSO', 'SIN_TURNO')),
  hora_inicio_programada TEXT,
  hora_fin_programada TEXT,
  cliente_nombre TEXT,
  hora_conexion_real TEXT,
  minutos_retraso INTEGER NOT NULL DEFAULT 0,
  foto_auditoria TEXT,
  salidas_fuera_perimetro INTEGER NOT NULL DEFAULT 0,
  valor_fuera_perimetro NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ultimo_contacto JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_daily_attendance_repartidor_fecha UNIQUE (repartidor_id, fecha)
);

-- 3.9. Novedades Consolidadas de Nómina por Periodo y Empleado
CREATE TABLE IF NOT EXISTS employee_novedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  dias_trabajados INTEGER NOT NULL DEFAULT 15,
  horas JSONB NOT NULL DEFAULT '{
    "horasExtrasDiurnas": 0,
    "horasExtrasNocturnas": 0,
    "horasExtrasDominicalesDiurnas": 0,
    "horasExtrasDominicalesNocturnas": 0,
    "horasRecargoNocturno": 0,
    "horasRecargoDominical": 0,
    "salidasFueraPerimetro": 0,
    "valorFueraPerimetro": 0
  }'::jsonb,
  comisiones NUMERIC(15, 2) NOT NULL DEFAULT 0,
  bonificaciones_constitutivas NUMERIC(15, 2) NOT NULL DEFAULT 0,
  bonificaciones_no_constitutivas NUMERIC(15, 2) NOT NULL DEFAULT 0,
  auxilio_no_constitutivo NUMERIC(15, 2) NOT NULL DEFAULT 0,
  incapacidad_dias INTEGER NOT NULL DEFAULT 0,
  incapacidad_valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
  licencias_remuneradas_dias INTEGER NOT NULL DEFAULT 0,
  licencias_no_remuneradas_dias INTEGER NOT NULL DEFAULT 0,
  prestamos_y_deducciones NUMERIC(15, 2) NOT NULL DEFAULT 0,
  otras_deducciones NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_employee_novedades_periodo_emp UNIQUE (periodo_id, employee_id)
);

-- ==============================================================================
-- 4. TRIGGERS AUTOMÁTICOS PARA UPDATED_AT
-- ==============================================================================

DO $$
BEGIN
  CREATE TRIGGER trg_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER trg_payroll_periods_updated_at BEFORE UPDATE ON payroll_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER trg_weekly_schedules_updated_at BEFORE UPDATE ON weekly_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER trg_zone_novedades_updated_at BEFORE UPDATE ON zone_novedades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER trg_client_order_reports_updated_at BEFORE UPDATE ON client_order_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER trg_daily_attendances_updated_at BEFORE UPDATE ON daily_attendances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER trg_employee_novedades_updated_at BEFORE UPDATE ON employee_novedades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) CON POLÍTICAS PERMISIVAS DE PRUEBA
-- ==============================================================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_novedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_order_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_novedades ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (lectura, inserción, actualización y eliminación para pruebas iniciales)
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
    EXECUTE format('CREATE POLICY "Permissive full access for all on %I" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- ==============================================================================
-- 6. DATOS INICIALES (SEED DATA)
-- ==============================================================================

-- 6.1. Configuración de Empresa (SERGEM S.A.S.)
INSERT INTO company_settings (
  id,
  nombre_empresa,
  nit,
  direccion,
  telefono,
  ciudad,
  email,
  smmlv,
  auxilio_transporte_mensual,
  jornada_maxima_semanal,
  jornada_diaria_base,
  porcentaje_salud_empleado,
  porcentaje_pension_empleado,
  porcentaje_salud_empresa,
  porcentaje_pension_empresa,
  aplica_exencion_art114,
  porcentaje_caja_compensacion,
  porcentaje_sena,
  porcentaje_icbf,
  tarifas_generales_clientes,
  tarifas_arl
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'SERGEM MENSAJERIA S.A.S.',
  '900.398.712-4',
  'Calle 10 # 38-42, Cali, Valle del Cauca',
  '(602) 399-4620 / PBX 314 6670473',
  'Santiago de Cali - Colombia',
  'gestionhumana@sergemsas.com',
  1423500,
  200000,
  42,
  7,
  0.0400,
  0.0400,
  0.0850,
  0.1200,
  true,
  0.0400,
  0.0200,
  0.0300,
  '{
    "tarifaBasePaquete": 4500,
    "tarifaHoraOrdinaria": 14500,
    "tarifaHoraExtraDiurna": 18125,
    "tarifaHoraExtraNocturna": 25375,
    "tarifaSalidaFueraPerimetro": 22000,
    "tarifaRecargoDominical": 25375,
    "tarifaRecargoNocturno": 5075
  }'::jsonb,
  '{
    "1": 0.00522,
    "2": 0.01044,
    "3": 0.02436,
    "4": 0.04350,
    "5": 0.06960
  }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  nombre_empresa = EXCLUDED.nombre_empresa,
  nit = EXCLUDED.nit,
  updated_at = NOW();

-- 6.2. Clientes Corporativos Iniciales
INSERT INTO clients (
  id,
  legacy_id,
  nombre,
  nit,
  direccion,
  ciudad,
  telefono,
  email_contacto,
  persona_contacto,
  estado,
  sedes,
  tarifas,
  observaciones,
  fecha_registro
) VALUES
(
  'c0000000-0000-0000-0000-000000000001',
  'CLI-001',
  'Almacenes Éxito S.A.',
  '890.900.608-9',
  'Carrera 1 # 44-12, Centro Comercial Único & Éxito San Fernando',
  'Santiago de Cali',
  '(602) 660-8000',
  'logistica.cali@exito.com.co',
  'Adriana Montenegro (Coordinadora Logística)',
  'Activo',
  '["Éxito San Fernando", "Éxito Flora", "Éxito Unicentro"]'::jsonb,
  '{
    "tarifaBasePaquete": 4800,
    "tarifaHoraOrdinaria": 15500,
    "tarifaHoraExtraDiurna": 19375,
    "tarifaHoraExtraNocturna": 27125,
    "tarifaSalidaFueraPerimetro": 24000,
    "tarifaRecargoDominical": 27125,
    "tarifaRecargoNocturno": 5425,
    "tarifaMensajeroFijoMensual": 2950000
  }'::jsonb,
  'Cliente corporativo prioritario. Entrega de pedidos exprés y última milla.',
  '2025-01-10'
),
(
  'c0000000-0000-0000-0000-000000000002',
  'CLI-002',
  'Sodimac Colombia S.A. (Homecenter)',
  '800.242.106-2',
  'Avenida 6N # 47N-02, Menga',
  'Santiago de Cali',
  '(602) 485-9000',
  'despachos.cali@homecenter.co',
  'Mauricio Valencia (Jefe de Despachos)',
  'Activo',
  '["Homecenter Norte Menga", "Homecenter Sur Pasoancho"]'::jsonb,
  '{
    "tarifaBasePaquete": 5200,
    "tarifaHoraOrdinaria": 16000,
    "tarifaHoraExtraDiurna": 20000,
    "tarifaHoraExtraNocturna": 28000,
    "tarifaSalidaFueraPerimetro": 25000,
    "tarifaRecargoDominical": 28000,
    "tarifaRecargoNocturno": 5600,
    "tarifaMensajeroFijoMensual": 3100000
  }'::jsonb,
  'Paquetes de ferretería liviana, accesorios y hogar.',
  '2025-02-15'
),
(
  'c0000000-0000-0000-0000-000000000003',
  'CLI-003',
  'Colombiana de Comercio S.A. (Alkosto)',
  '890.900.943-1',
  'Calle 13 # 80-60, Pasoancho',
  'Santiago de Cali',
  '(602) 333-5500',
  'operaciones.alkosto@alkosto.com.co',
  'Claudia Ramírez (Supervisora Operaciones)',
  'Activo',
  '["Alkosto Pasoancho", "Alkosto Chipichape"]'::jsonb,
  '{
    "tarifaBasePaquete": 4600,
    "tarifaHoraOrdinaria": 14800,
    "tarifaHoraExtraDiurna": 18500,
    "tarifaHoraExtraNocturna": 25900,
    "tarifaSalidaFueraPerimetro": 22000,
    "tarifaRecargoDominical": 25900,
    "tarifaRecargoNocturno": 5180
  }'::jsonb,
  'Mensajería para tecnología y electrodomésticos portátiles.',
  '2025-03-01'
),
(
  'c0000000-0000-0000-0000-000000000004',
  'CLI-004',
  'Droguerías Cruz Verde S.A.S.',
  '800.149.695-1',
  'Avenida Roosevelt # 36-40',
  'Santiago de Cali',
  '(602) 486-1000',
  'farmacias.domicilios@cruzverde.com.co',
  'Javier Osorio (Coordinador Domicilios)',
  'Activo',
  '["Roosevelt", "Tequendama", "Versalles", "La Flora"]'::jsonb,
  '{
    "tarifaBasePaquete": 4200,
    "tarifaHoraOrdinaria": 14000,
    "tarifaHoraExtraDiurna": 17500,
    "tarifaHoraExtraNocturna": 24500,
    "tarifaSalidaFueraPerimetro": 20000,
    "tarifaRecargoDominical": 24500,
    "tarifaRecargoNocturno": 4900
  }'::jsonb,
  'Medicamentos y productos de farmacia con entrega en frío y urgente.',
  '2025-04-12'
) ON CONFLICT (id) DO NOTHING;

-- 6.3. Periodo de Nómina Inicial
INSERT INTO payroll_periods (
  id,
  legacy_id,
  nombre_periodo,
  fecha_inicio,
  fecha_fin,
  tipo_periodo,
  dias_base_periodo,
  estado,
  fecha_liquidacion
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'PER-ACTUAL',
  'Periodo 1 - 2026',
  '2026-08-01',
  '2026-08-15',
  'Quincenal',
  15,
  'Borrador',
  '2026-08-15'
) ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 7. ÍNDICES DE RENDIMIENTO PARA CONSULTAS FRECUENTES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_employees_cedula ON employees(cedula);
CREATE INDEX IF NOT EXISTS idx_employees_rol ON employees(rol);
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_repartidor_semana ON weekly_schedules(repartidor_id, semana_inicio);
CREATE INDEX IF NOT EXISTS idx_zone_novedades_fecha ON zone_novedades(fecha);
CREATE INDEX IF NOT EXISTS idx_client_order_reports_fecha ON client_order_reports(fecha);
CREATE INDEX IF NOT EXISTS idx_daily_attendances_repartidor_fecha ON daily_attendances(repartidor_id, fecha);
CREATE INDEX IF NOT EXISTS idx_employee_novedades_periodo ON employee_novedades(periodo_id);
