import { supabase } from '../lib/supabase';
import {
  CompanySettings,
  CompanyClient,
  Employee,
  PayrollPeriod,
  WeeklySchedule,
  ZoneChiefNovedad,
  ClientOrderReport,
  DriverDailyAttendance,
  EmployeeNovedades,
} from '../types/payroll';
import { Database } from '../types/database.types';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// ==============================================================================
// 1. TRANSFORMERS / MAPPERS (CamelCase <-> Snake_Case)
// ==============================================================================

export const mapCompanySettingsFromDb = (row: Database['public']['Tables']['company_settings']['Row']): CompanySettings => ({
  nombreEmpresa: row.nombre_empresa,
  nit: row.nit,
  direccion: row.direccion || '',
  telefono: row.telefono || '',
  ciudad: row.ciudad || '',
  email: row.email || '',
  smmlv: Number(row.smmlv),
  auxilioTransporteMensual: Number(row.auxilio_transporte_mensual),
  jornadaMaximaSemanal: Number(row.jornada_maxima_semanal),
  jornadaDiariaBase: Number(row.jornada_diaria_base),
  porcentajeSaludEmpleado: Number(row.porcentaje_salud_empleado),
  porcentajePensionEmpleado: Number(row.porcentaje_pension_empleado),
  porcentajeSaludEmpresa: Number(row.porcentaje_salud_empresa),
  porcentajePensionEmpresa: Number(row.porcentaje_pension_empresa),
  aplicaExencionArt114: Boolean(row.aplica_exencion_art114),
  porcentajeCajaCompensacion: Number(row.porcentaje_caja_compensacion),
  porcentajeSena: Number(row.porcentaje_sena),
  porcentajeICBF: Number(row.porcentaje_icbf),
  tarifasGeneralesClientes: (row.tarifas_generales_clientes as any) || {
    tarifaBasePaquete: 4500,
    tarifaHoraOrdinaria: 14500,
    tarifaHoraExtraDiurna: 18125,
    tarifaHoraExtraNocturna: 25375,
    tarifaSalidaFueraPerimetro: 22000,
    tarifaRecargoDominical: 25375,
    tarifaRecargoNocturno: 5075,
  },
  tarifasARL: (row.tarifas_arl as any) || {
    1: 0.00522,
    2: 0.01044,
    3: 0.02436,
    4: 0.04350,
    5: 0.06960,
  },
});

export const mapCompanySettingsToDb = (s: CompanySettings): Database['public']['Tables']['company_settings']['Insert'] => ({
  nombre_empresa: s.nombreEmpresa,
  nit: s.nit,
  direccion: s.direccion,
  telefono: s.telefono,
  ciudad: s.ciudad,
  email: s.email,
  smmlv: s.smmlv,
  auxilio_transporte_mensual: s.auxilioTransporteMensual,
  jornada_maxima_semanal: s.jornadaMaximaSemanal,
  jornada_diaria_base: s.jornadaDiariaBase,
  porcentaje_salud_empleado: s.porcentajeSaludEmpleado,
  porcentaje_pension_empleado: s.porcentajePensionEmpleado,
  porcentaje_salud_empresa: s.porcentajeSaludEmpresa,
  porcentaje_pension_empresa: s.porcentajePensionEmpresa,
  aplica_exencion_art114: s.aplicaExencionArt114,
  porcentaje_caja_compensacion: s.porcentajeCajaCompensacion,
  porcentaje_sena: s.porcentajeSena,
  porcentaje_icbf: s.porcentajeICBF,
  tarifas_generales_clientes: s.tarifasGeneralesClientes as any,
  tarifas_arl: s.tarifasARL as any,
});

export const mapEmployeeFromDb = (row: Database['public']['Tables']['employees']['Row']): Employee => ({
  id: row.id,
  cedula: row.cedula,
  nombre: row.nombre,
  apellido: row.apellido,
  cargo: row.cargo,
  departamento: row.departamento as any,
  salarioBase: Number(row.salario_base),
  tipoContrato: row.tipo_contrato as any,
  nivelRiesgoARL: Number(row.nivel_riesgo_arl) as any,
  fechaIngreso: row.fecha_ingreso,
  banco: row.banco || 'Bancolombia',
  tipoCuenta: (row.tipo_cuenta as any) || 'Ahorros',
  numeroCuenta: row.numero_cuenta || '',
  eps: row.eps || 'SURA',
  afp: row.afp || 'Porvenir',
  ccf: row.ccf || 'Comfandi',
  activo: Boolean(row.activo),
  rol: row.rol as any,
  placaVehiculo: row.placa_vehiculo || undefined,
  jefeZonaId: row.jefe_zona_id || undefined,
  email: row.email || undefined,
  telefono: row.telefono || undefined,
  estadoInvitacion: (row.estado_invitacion as any) || 'Activo',
});

export const mapEmployeeToDb = (emp: Employee): Database['public']['Tables']['employees']['Insert'] => ({
  id: emp.id.includes('-') && emp.id.length >= 30 ? emp.id : undefined,
  legacy_id: !emp.id.includes('-') || emp.id.length < 30 ? emp.id : undefined,
  cedula: emp.cedula,
  nombre: emp.nombre,
  apellido: emp.apellido,
  cargo: emp.cargo,
  departamento: emp.departamento,
  salario_base: emp.salarioBase,
  tipo_contrato: emp.tipoContrato,
  nivel_riesgo_arl: emp.nivelRiesgoARL,
  fecha_ingreso: emp.fechaIngreso,
  banco: emp.banco,
  tipo_cuenta: emp.tipoCuenta,
  numero_cuenta: emp.numeroCuenta,
  eps: emp.eps,
  afp: emp.afp,
  ccf: emp.ccf,
  activo: emp.activo,
  rol: emp.rol,
  placa_vehiculo: emp.placaVehiculo || null,
  jefe_zona_id: emp.jefeZonaId && emp.jefeZonaId.includes('-') ? emp.jefeZonaId : null,
  email: emp.email || null,
  telefono: emp.telefono || null,
  estado_invitacion: emp.estadoInvitacion || 'Activo',
});

export const mapClientFromDb = (row: Database['public']['Tables']['clients']['Row']): CompanyClient => ({
  id: row.id,
  nombre: row.nombre,
  nit: row.nit,
  direccion: row.direccion || '',
  ciudad: row.ciudad || '',
  telefono: row.telefono || '',
  emailContacto: row.email_contacto || '',
  personaContacto: row.persona_contacto || '',
  estado: row.estado,
  sedes: (row.sedes as any) || [],
  tarifas: row.tarifas as any,
  observaciones: row.observaciones || undefined,
  fechaRegistro: row.fecha_registro,
});

export const mapClientToDb = (c: CompanyClient): Database['public']['Tables']['clients']['Insert'] => ({
  id: c.id.includes('-') && c.id.length >= 30 ? c.id : undefined,
  legacy_id: !c.id.includes('-') || c.id.length < 30 ? c.id : undefined,
  nombre: c.nombre,
  nit: c.nit,
  direccion: c.direccion,
  ciudad: c.ciudad,
  telefono: c.telefono,
  email_contacto: c.emailContacto,
  persona_contacto: c.personaContacto,
  estado: c.estado,
  sedes: c.sedes as any,
  tarifas: c.tarifas as any,
  observaciones: c.observaciones || null,
  fecha_registro: c.fechaRegistro,
});

export const mapPeriodFromDb = (row: Database['public']['Tables']['payroll_periods']['Row']): PayrollPeriod => ({
  id: row.id,
  nombrePeriodo: row.nombre_periodo,
  fechaInicio: row.fecha_inicio,
  fechaFin: row.fecha_fin,
  tipoPeriodo: row.tipo_periodo,
  diasBasePeriodo: Number(row.dias_base_periodo),
  estado: row.estado,
  fechaLiquidacion: row.fecha_liquidacion || row.fecha_fin,
});

export const mapPeriodToDb = (p: PayrollPeriod): Database['public']['Tables']['payroll_periods']['Insert'] => ({
  id: p.id.includes('-') && p.id.length >= 30 ? p.id : undefined,
  legacy_id: !p.id.includes('-') || p.id.length < 30 ? p.id : undefined,
  nombre_periodo: p.nombrePeriodo,
  fecha_inicio: p.fechaInicio,
  fecha_fin: p.fechaFin,
  tipo_periodo: p.tipoPeriodo,
  dias_base_periodo: p.diasBasePeriodo,
  estado: p.estado,
  fecha_liquidacion: p.fechaLiquidacion,
});

export const mapScheduleFromDb = (row: Database['public']['Tables']['weekly_schedules']['Row']): WeeklySchedule => ({
  id: row.id,
  repartidorId: row.repartidor_id,
  jefeZonaId: row.jefe_zona_id || '',
  semanaInicio: row.semana_inicio,
  dias: (row.dias as any) || {},
});

export const mapScheduleToDb = (s: WeeklySchedule): Database['public']['Tables']['weekly_schedules']['Insert'] => ({
  id: s.id.includes('-') && s.id.length >= 30 ? s.id : undefined,
  legacy_id: !s.id.includes('-') || s.id.length < 30 ? s.id : undefined,
  repartidor_id: s.repartidorId,
  jefe_zona_id: s.jefeZonaId || null,
  semana_inicio: s.semanaInicio,
  dias: s.dias as any,
});

export const mapZoneNovedadFromDb = (row: Database['public']['Tables']['zone_novedades']['Row']): ZoneChiefNovedad => ({
  id: row.id,
  repartidorId: row.repartidor_id,
  jefeZonaId: row.jefe_zona_id || '',
  fecha: row.fecha,
  tipo: row.tipo,
  horaInicio: row.hora_inicio,
  horaFin: row.hora_fin,
  duracionHoras: Number(row.duracion_horas),
  observaciones: row.observaciones || '',
  fechaRegistro: row.fecha_registro || row.created_at,
});

export const mapZoneNovedadToDb = (n: ZoneChiefNovedad): Database['public']['Tables']['zone_novedades']['Insert'] => ({
  id: n.id.includes('-') && n.id.length >= 30 ? n.id : undefined,
  legacy_id: !n.id.includes('-') || n.id.length < 30 ? n.id : undefined,
  repartidor_id: n.repartidorId,
  jefe_zona_id: n.jefeZonaId || null,
  fecha: n.fecha,
  tipo: n.tipo,
  hora_inicio: n.horaInicio,
  hora_fin: n.horaFin,
  duracion_horas: n.duracionHoras,
  observaciones: n.observaciones || null,
  fecha_registro: n.fechaRegistro,
});

export const mapClientReportFromDb = (row: Database['public']['Tables']['client_order_reports']['Row']): ClientOrderReport => ({
  id: row.id,
  clienteId: row.cliente_id || '',
  nombreCliente: row.nombre_cliente,
  repartidorId: row.repartidor_id || '',
  nombreRepartidor: row.nombre_repartidor,
  placaVehiculo: row.placa_vehiculo,
  fecha: row.fecha,
  paquetesEntregados: Number(row.paquetes_entregados),
  ventaNeta: Number(row.venta_neta),
  horasTrabajadas: Number(row.horas_trabajadas),
  horasOrdinarias: Number(row.horas_ordinarias),
  horasExtrasDiurnas: Number(row.horas_extras_diurnas),
  horasExtrasNocturnas: Number(row.horas_extras_nocturnas),
  horasFestivas: Number(row.horas_festivas),
  horasExtrasFestivasNocturnas: Number(row.horas_extras_festivas_nocturnas || 0),
  recargoNocturno: Number(row.recargo_nocturno || 0),
  recargoFestivo: Number(row.recargo_festivo || 0),
  salidasFueraPerimetro: Number(row.salidas_fuera_perimetro || 0),
  valorFueraPerimetro: Number(row.valor_fuera_perimetro || 0),
  detallesFueraPerimetro: (row.detalles_fuera_perimetro as any) || [],
});

export const mapClientReportToDb = (r: ClientOrderReport): Database['public']['Tables']['client_order_reports']['Insert'] => ({
  id: r.id.includes('-') && r.id.length >= 30 ? r.id : undefined,
  legacy_id: !r.id.includes('-') || r.id.length < 30 ? r.id : undefined,
  cliente_id: r.clienteId && r.clienteId.includes('-') ? r.clienteId : null,
  nombre_cliente: r.nombreCliente,
  repartidor_id: r.repartidorId && r.repartidorId.includes('-') ? r.repartidorId : null,
  nombre_repartidor: r.nombreRepartidor,
  placa_vehiculo: r.placaVehiculo,
  fecha: r.fecha,
  paquetes_entregados: r.paquetesEntregados,
  venta_neta: r.ventaNeta,
  horas_trabajadas: r.horasTrabajadas,
  horas_ordinarias: r.horasOrdinarias,
  horas_extras_diurnas: r.horasExtrasDiurnas,
  horas_extras_nocturnas: r.horasExtrasNocturnas,
  horas_festivas: r.horasFestivas,
  horas_extras_festivas_nocturnas: r.horasExtrasFestivasNocturnas || 0,
  recargo_nocturno: r.recargoNocturno || 0,
  recargo_festivo: r.recargoFestivo || 0,
  salidas_fuera_perimetro: r.salidasFueraPerimetro || 0,
  valor_fuera_perimetro: r.valorFueraPerimetro || 0,
  detalles_fuera_perimetro: r.detallesFueraPerimetro as any,
});

export const mapDailyAttendanceFromDb = (row: Database['public']['Tables']['daily_attendances']['Row']): DriverDailyAttendance => ({
  repartidorId: row.repartidor_id,
  diaSemana: row.dia_semana as any,
  fecha: row.fecha,
  estado: row.estado,
  horaInicioProgramada: row.hora_inicio_programada || undefined,
  horaFinProgramada: row.hora_fin_programada || undefined,
  clienteNombre: row.cliente_nombre || undefined,
  horaConexionReal: row.hora_conexion_real || undefined,
  minutosRetraso: Number(row.minutos_retraso || 0),
  fotoAuditoria: row.foto_auditoria || undefined,
  salidasFueraPerimetro: Number(row.salidas_fuera_perimetro || 0),
  valorFueraPerimetro: Number(row.valor_fuera_perimetro || 0),
  ultimoContacto: (row.ultimo_contacto as any) || undefined,
});

export const mapDailyAttendanceToDb = (a: DriverDailyAttendance): Database['public']['Tables']['daily_attendances']['Insert'] => ({
  repartidor_id: a.repartidorId,
  dia_semana: a.diaSemana,
  fecha: a.fecha,
  estado: a.estado,
  hora_inicio_programada: a.horaInicioProgramada || null,
  hora_fin_programada: a.horaFinProgramada || null,
  cliente_nombre: a.clienteNombre || null,
  hora_conexion_real: a.horaConexionReal || null,
  minutos_retraso: a.minutosRetraso || 0,
  foto_auditoria: a.fotoAuditoria || null,
  salidas_fuera_perimetro: a.salidasFueraPerimetro || 0,
  valor_fuera_perimetro: a.valorFueraPerimetro || 0,
  ultimo_contacto: (a.ultimoContacto as any) || null,
});

// ==============================================================================
// 2. SERVICIOS CRUD DE ENTIDADES
// ==============================================================================

export const api = {
  // ----------------------------------------------------------------------------
  // COMPANY SETTINGS
  // ----------------------------------------------------------------------------
  async getCompanySettings(): Promise<ApiResponse<CompanySettings>> {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { data: null, error: null };

      return { data: mapCompanySettingsFromDb(data as any), error: null };
    } catch (err: any) {
      console.warn('[API] Error getCompanySettings:', err?.message || err);
      return { data: null, error: err?.message || 'Error al obtener configuración de empresa' };
    }
  },

  async updateCompanySettings(settings: CompanySettings): Promise<ApiResponse<CompanySettings>> {
    try {
      const payload = mapCompanySettingsToDb(settings);
      const { data: existing } = await supabase.from('company_settings').select('id').limit(1).maybeSingle();

      let result;
      const existingRow = existing as { id?: string } | null;
      if (existingRow && existingRow.id) {
        result = await (supabase.from('company_settings') as any)
          .update(payload)
          .eq('id', existingRow.id)
          .select()
          .single();
      } else {
        result = await (supabase.from('company_settings') as any)
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      return { data: mapCompanySettingsFromDb(result.data), error: null };
    } catch (err: any) {
      console.error('[API] Error updateCompanySettings:', err);
      return { data: null, error: err?.message || 'Error al guardar configuración' };
    }
  },

  // ----------------------------------------------------------------------------
  // EMPLOYEES (COLABORADORES)
  // ----------------------------------------------------------------------------
  async getEmployees(): Promise<ApiResponse<Employee[]>> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      return { data: ((data || []) as any[]).map(mapEmployeeFromDb), error: null };
    } catch (err: any) {
      console.warn('[API] Error getEmployees:', err?.message || err);
      return { data: null, error: err?.message || 'Error al cargar colaboradores' };
    }
  },

  async createEmployee(emp: Employee): Promise<ApiResponse<Employee>> {
    try {
      const payload = mapEmployeeToDb(emp);
      const { data, error } = await (supabase.from('employees') as any)
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return { data: mapEmployeeFromDb(data), error: null };
    } catch (err: any) {
      console.error('[API] Error createEmployee:', err);
      return { data: null, error: err?.message || 'Error al registrar colaborador' };
    }
  },

  async updateEmployee(emp: Employee): Promise<ApiResponse<Employee>> {
    try {
      const payload = mapEmployeeToDb(emp);
      let query = (supabase.from('employees') as any).update(payload);
      
      if (emp.id.includes('-') && emp.id.length >= 30) {
        query = query.eq('id', emp.id);
      } else {
        query = query.or(`id.eq.${emp.id},legacy_id.eq.${emp.id},cedula.eq.${emp.cedula}`);
      }

      const { data, error } = await query.select().single();
      if (error) throw error;
      return { data: mapEmployeeFromDb(data), error: null };
    } catch (err: any) {
      console.error('[API] Error updateEmployee:', err);
      return { data: null, error: err?.message || 'Error al actualizar colaborador' };
    }
  },

  async deleteEmployee(empId: string): Promise<ApiResponse<boolean>> {
    try {
      let query = supabase.from('employees').delete();
      if (empId.includes('-') && empId.length >= 30) {
        query = query.eq('id', empId);
      } else {
        query = query.or(`id.eq.${empId},legacy_id.eq.${empId}`);
      }

      const { error } = await query;
      if (error) throw error;
      return { data: true, error: null };
    } catch (err: any) {
      console.error('[API] Error deleteEmployee:', err);
      return { data: false, error: err?.message || 'Error al eliminar colaborador' };
    }
  },

  // ----------------------------------------------------------------------------
  // CLIENTS (CLIENTES CORPORATIVOS)
  // ----------------------------------------------------------------------------
  async getClients(): Promise<ApiResponse<CompanyClient[]>> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      return { data: ((data || []) as any[]).map(mapClientFromDb), error: null };
    } catch (err: any) {
      console.warn('[API] Error getClients:', err?.message || err);
      return { data: null, error: err?.message || 'Error al cargar clientes' };
    }
  },

  async createClient(client: CompanyClient): Promise<ApiResponse<CompanyClient>> {
    try {
      const payload = mapClientToDb(client);
      const { data, error } = await (supabase.from('clients') as any)
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return { data: mapClientFromDb(data), error: null };
    } catch (err: any) {
      console.error('[API] Error createClient:', err);
      return { data: null, error: err?.message || 'Error al crear cliente' };
    }
  },

  // ----------------------------------------------------------------------------
  // PAYROLL PERIODS
  // ----------------------------------------------------------------------------
  async getPayrollPeriods(): Promise<ApiResponse<PayrollPeriod[]>> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;
      return { data: ((data || []) as any[]).map(mapPeriodFromDb), error: null };
    } catch (err: any) {
      console.warn('[API] Error getPayrollPeriods:', err?.message || err);
      return { data: null, error: err?.message || 'Error al cargar periodos de nómina' };
    }
  },

  async createPayrollPeriod(period: PayrollPeriod): Promise<ApiResponse<PayrollPeriod>> {
    try {
      const payload = mapPeriodToDb(period);
      const { data, error } = await (supabase.from('payroll_periods') as any)
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return { data: mapPeriodFromDb(data), error: null };
    } catch (err: any) {
      console.error('[API] Error createPayrollPeriod:', err);
      return { data: null, error: err?.message || 'Error al registrar periodo de nómina' };
    }
  },

  // ----------------------------------------------------------------------------
  // WEEKLY SCHEDULES (TURNOS Y PROGRAMACIÓN)
  // ----------------------------------------------------------------------------
  async getWeeklySchedules(): Promise<ApiResponse<WeeklySchedule[]>> {
    try {
      const { data, error } = await supabase
        .from('weekly_schedules')
        .select('*')
        .order('semana_inicio', { ascending: false });

      if (error) throw error;
      return { data: ((data || []) as any[]).map(mapScheduleFromDb), error: null };
    } catch (err: any) {
      console.warn('[API] Error getWeeklySchedules:', err?.message || err);
      return { data: null, error: err?.message || 'Error al cargar turnos programados' };
    }
  },

  async upsertWeeklySchedule(sched: WeeklySchedule): Promise<ApiResponse<WeeklySchedule>> {
    try {
      const payload = mapScheduleToDb(sched);
      const { data, error } = await (supabase.from('weekly_schedules') as any)
        .upsert(payload, { onConflict: 'repartidor_id,semana_inicio' })
        .select()
        .single();

      if (error) throw error;
      return { data: mapScheduleFromDb(data), error: null };
    } catch (err: any) {
      console.error('[API] Error upsertWeeklySchedule:', err);
      return { data: null, error: err?.message || 'Error al guardar programación de turno' };
    }
  },

  async deleteWeeklySchedule(schedId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('weekly_schedules')
        .delete()
        .or(`id.eq.${schedId},legacy_id.eq.${schedId}`);

      if (error) throw error;
      return { data: true, error: null };
    } catch (err: any) {
      console.error('[API] Error deleteWeeklySchedule:', err);
      return { data: false, error: err?.message || 'Error al eliminar turno' };
    }
  },

  // ----------------------------------------------------------------------------
  // ZONE NOVEDADES
  // ----------------------------------------------------------------------------
  async getZoneNovedades(): Promise<ApiResponse<ZoneChiefNovedad[]>> {
    try {
      const { data, error } = await supabase
        .from('zone_novedades')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
      return { data: ((data || []) as any[]).map(mapZoneNovedadFromDb), error: null };
    } catch (err: any) {
      console.warn('[API] Error getZoneNovedades:', err?.message || err);
      return { data: null, error: err?.message || 'Error al cargar novedades de zona' };
    }
  },

  async createZoneNovedad(nov: ZoneChiefNovedad): Promise<ApiResponse<ZoneChiefNovedad>> {
    try {
      const payload = mapZoneNovedadToDb(nov);
      const { data, error } = await (supabase.from('zone_novedades') as any)
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return { data: mapZoneNovedadFromDb(data), error: null };
    } catch (err: any) {
      console.error('[API] Error createZoneNovedad:', err);
      return { data: null, error: err?.message || 'Error al registrar novedad' };
    }
  },

  async deleteZoneNovedad(novId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('zone_novedades')
        .delete()
        .or(`id.eq.${novId},legacy_id.eq.${novId}`);

      if (error) throw error;
      return { data: true, error: null };
    } catch (err: any) {
      console.error('[API] Error deleteZoneNovedad:', err);
      return { data: false, error: err?.message || 'Error al eliminar novedad' };
    }
  },

  // ----------------------------------------------------------------------------
  // CLIENT ORDER REPORTS
  // ----------------------------------------------------------------------------
  async getClientOrderReports(): Promise<ApiResponse<ClientOrderReport[]>> {
    try {
      const { data, error } = await supabase
        .from('client_order_reports')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
      return { data: ((data || []) as any[]).map(mapClientReportFromDb), error: null };
    } catch (err: any) {
      console.warn('[API] Error getClientOrderReports:', err?.message || err);
      return { data: null, error: err?.message || 'Error al cargar reportes de clientes' };
    }
  },

  async createClientOrderReport(report: ClientOrderReport): Promise<ApiResponse<ClientOrderReport>> {
    try {
      const payload = mapClientReportToDb(report);
      const { data, error } = await (supabase.from('client_order_reports') as any)
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return { data: mapClientReportFromDb(data), error: null };
    } catch (err: any) {
      console.error('[API] Error createClientOrderReport:', err);
      return { data: null, error: err?.message || 'Error al guardar reporte de pedidos' };
    }
  },

  async deleteClientOrderReport(reportId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('client_order_reports')
        .delete()
        .or(`id.eq.${reportId},legacy_id.eq.${reportId}`);

      if (error) throw error;
      return { data: true, error: null };
    } catch (err: any) {
      console.error('[API] Error deleteClientOrderReport:', err);
      return { data: false, error: err?.message || 'Error al eliminar reporte' };
    }
  },

  // ----------------------------------------------------------------------------
  // DAILY ATTENDANCES (ASISTENCIA DIARIA)
  // ----------------------------------------------------------------------------
  async getDailyAttendances(): Promise<ApiResponse<Record<string, DriverDailyAttendance>>> {
    try {
      const { data, error } = await supabase
        .from('daily_attendances')
        .select('*');

      if (error) throw error;
      const map: Record<string, DriverDailyAttendance> = {};
      (((data || []) as any[]) || []).forEach((row) => {
        const item = mapDailyAttendanceFromDb(row);
        map[item.repartidorId] = item;
      });

      return { data: map, error: null };
    } catch (err: any) {
      console.warn('[API] Error getDailyAttendances:', err?.message || err);
      return { data: null, error: err?.message || 'Error al cargar asistencias diarias' };
    }
  },

  async upsertDailyAttendance(att: DriverDailyAttendance): Promise<ApiResponse<DriverDailyAttendance>> {
    try {
      const payload = mapDailyAttendanceToDb(att);
      const { data, error } = await (supabase.from('daily_attendances') as any)
        .upsert(payload, { onConflict: 'repartidor_id,fecha' })
        .select()
        .single();

      if (error) throw error;
      return { data: mapDailyAttendanceFromDb(data), error: null };
    } catch (err: any) {
      console.error('[API] Error upsertDailyAttendance:', err);
      return { data: null, error: err?.message || 'Error al actualizar asistencia' };
    }
  },

  // ----------------------------------------------------------------------------
  // EMPLOYEE NOVEDADES (NÓMINA)
  // ----------------------------------------------------------------------------
  async getEmployeeNovedades(periodId: string): Promise<ApiResponse<Record<string, EmployeeNovedades>>> {
    try {
      const { data, error } = await supabase
        .from('employee_novedades')
        .select('*')
        .eq('periodo_id', periodId);

      if (error) throw error;
      const map: Record<string, EmployeeNovedades> = {};
      (((data || []) as any[]) || []).forEach((row) => {
        map[row.employee_id] = {
          diasTrabajados: Number(row.dias_trabajados),
          horas: (row.horas as any) || {
            horasExtrasDiurnas: 0,
            horasExtrasNocturnas: 0,
            horasExtrasDominicalesDiurnas: 0,
            horasExtrasDominicalesNocturnas: 0,
            horasRecargoNocturno: 0,
            horasRecargoDominical: 0,
          },
          comisiones: Number(row.comisiones || 0),
          bonificacionesConstitutivas: Number(row.bonificaciones_constitutivas || 0),
          bonificacionesNoConstitutivas: Number(row.bonificaciones_no_constitutivas || 0),
          auxilioNoConstitutivo: Number(row.auxilio_no_constitutivo || 0),
          incapacidadDias: Number(row.incapacidad_dias || 0),
          incapacidadValor: Number(row.incapacidad_valor || 0),
          licenciasRemuneradasDias: Number(row.licencias_remuneradas_dias || 0),
          licenciasNoRemuneradasDias: Number(row.licencias_no_remuneradas_dias || 0),
          prestamosYDeducciones: Number(row.prestamos_y_deducciones || 0),
          otrasDeducciones: Number(row.otras_deducciones || 0),
        };
      });

      return { data: map, error: null };
    } catch (err: any) {
      console.warn('[API] Error getEmployeeNovedades:', err?.message || err);
      return { data: null, error: err?.message || 'Error al obtener novedades de nómina' };
    }
  },

  async upsertEmployeeNovedades(
    periodId: string,
    employeeId: string,
    novedades: EmployeeNovedades
  ): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await (supabase.from('employee_novedades') as any)
        .upsert(
          {
            periodo_id: periodId,
            employee_id: employeeId,
            dias_trabajados: novedades.diasTrabajados,
            horas: novedades.horas as any,
            comisiones: novedades.comisiones,
            bonificaciones_constitutivas: novedades.bonificacionesConstitutivas,
            bonificaciones_no_constitutivas: novedades.bonificacionesNoConstitutivas,
            auxilio_no_constitutivo: novedades.auxilioNoConstitutivo,
            incapacidad_dias: novedades.incapacidadDias,
            incapacidad_valor: novedades.incapacidadValor,
            licencias_remuneradas_dias: novedades.licenciasRemuneradasDias,
            licencias_no_remuneradas_dias: novedades.licenciasNoRemuneradasDias,
            prestamos_y_deducciones: novedades.prestamosYDeducciones,
            otras_deducciones: novedades.otrasDeducciones,
          },
          { onConflict: 'periodo_id,employee_id' }
        );

      if (error) throw error;
      return { data: true, error: null };
    } catch (err: any) {
      console.error('[API] Error upsertEmployeeNovedades:', err);
      return { data: false, error: err?.message || 'Error al guardar novedades de nómina' };
    }
  },

  // ----------------------------------------------------------------------------
  // BATCH FETCH ALL INITIAL DATA
  // ----------------------------------------------------------------------------
  async fetchAllInitialData() {
    const [
      companyRes,
      employeesRes,
      periodsRes,
      schedulesRes,
      zoneNovedadesRes,
      clientReportsRes,
      attendancesRes,
    ] = await Promise.all([
      this.getCompanySettings(),
      this.getEmployees(),
      this.getPayrollPeriods(),
      this.getWeeklySchedules(),
      this.getZoneNovedades(),
      this.getClientOrderReports(),
      this.getDailyAttendances(),
    ]);

    return {
      company: companyRes.data,
      employees: employeesRes.data,
      periods: periodsRes.data,
      schedules: schedulesRes.data,
      zoneNovedades: zoneNovedadesRes.data,
      clientReports: clientReportsRes.data,
      attendances: attendancesRes.data,
      errors: [
        companyRes.error,
        employeesRes.error,
        periodsRes.error,
        schedulesRes.error,
        zoneNovedadesRes.error,
        clientReportsRes.error,
        attendancesRes.error,
      ].filter(Boolean) as string[],
    };
  },
};
