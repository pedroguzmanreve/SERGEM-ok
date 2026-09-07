export type Department = 
  | 'Operaciones y Mensajería'
  | 'Logística y Despachos'
  | 'Gestión Humana'
  | 'Financiera y Contabilidad'
  | 'Tecnología e Innovación'
  | 'Comercial y Ventas'
  | 'Administración';

export type ContractType = 'Término Indefinido' | 'Término Fijo' | 'Obra o Labor' | 'Aprendizaje';

export type RiskLevel = 1 | 2 | 3 | 4 | 5;

export type UserRole = 'Administrativo' | 'Jefe de Zona' | 'Jefe de Operaciones' | 'Repartidor';

export type AppRole = 'Administrativo' | 'Jefe de Zona' | 'Repartidor';

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: AppRole;
  employeeId?: string;
  photoURL?: string;
  cedula?: string;
  telefono?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Employee {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  cargo: string;
  departamento: Department;
  salarioBase: number;
  tipoContrato: ContractType;
  nivelRiesgoARL: RiskLevel;
  fechaIngreso: string;
  banco: string;
  tipoCuenta: 'Ahorros' | 'Corriente';
  numeroCuenta: string;
  eps: string;
  afp: string; // Fondo de Pensiones
  ccf: string; // Caja de Compensación
  activo: boolean;
  // Campos Portal Administración & Operaciones
  rol: UserRole;
  placaVehiculo?: string; // Opcional
  jefeZonaId?: string; // Asignación de Jefe de Zona para Repartidores
  email?: string;
  telefono?: string;
  ciudad?: string;
  estadoInvitacion?: 'Invitado' | 'Enviada' | 'Activo' | 'Pendiente';
}

export type ShiftType = 'Continua' | 'Partido' | 'Medio Tiempo Mañana' | 'Medio Tiempo Tarde' | 'Descanso';

export interface ShiftDetails {
  tipo: ShiftType;
  clienteNombre?: string; // Cliente / Sede asignada (e.g. "Almacenes Éxito S.A.")
  clienteId?: string;
  // Jornada Continua o Mañana
  horaInicio1?: string; // e.g. "07:00"
  horaFin1?: string; // e.g. "15:00" o "12:00"
  // Jornada Tarde (en Turno Partido)
  horaInicio2?: string; // e.g. "14:00"
  horaFin2?: string; // e.g. "18:00"
  observaciones?: string;
}

export interface WeeklySchedule {
  id: string;
  repartidorId: string;
  jefeZonaId: string;
  semanaInicio: string; // ISO Date YYYY-MM-DD del Lunes de esa semana
  dias: {
    Lunes?: ShiftDetails;
    Martes?: ShiftDetails;
    Miércoles?: ShiftDetails;
    Jueves?: ShiftDetails;
    Viernes?: ShiftDetails;
    Sábado?: ShiftDetails;
    Domingo?: ShiftDetails;
  };
}

export interface ZoneChiefNovedad {
  id: string;
  repartidorId: string;
  jefeZonaId: string;
  fecha: string; // YYYY-MM-DD
  tipo: 'Permiso Remunerado' | 'Permiso No Remunerado' | 'Incapacidad';
  horaInicio: string; // e.g. "09:00"
  horaFin: string; // e.g. "10:00"
  duracionHoras: number;
  observaciones: string;
  fechaRegistro: string;
}

export interface ClientOrderReport {
  id: string;
  clienteId: string;
  nombreCliente: string;
  repartidorId: string;
  nombreRepartidor: string;
  placaVehiculo: string;
  fecha: string;
  paquetesEntregados: number;
  ventaNeta: number;
  horasTrabajadas: number;
  horasOrdinarias: number;
  horasExtrasDiurnas: number;
  horasExtrasNocturnas: number;
  horasFestivas: number;
  salidasFueraPerimetro?: number;
  observacionesSalida?: string;
}

export interface CompanyClient {
  id: string;
  nombre: string;
  nit?: string;
  ciudad?: string;
  direccion?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  tarifaHoraBase?: number;
  observaciones?: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface HoursNovedades {
  horasExtrasDiurnas: number; // 25%
  horasExtrasNocturnas: number; // 75%
  horasExtrasDominicalesDiurnas: number; // 100%
  horasExtrasDominicalesNocturnas: number; // 150%
  horasRecargoNocturno: number; // 35%
  horasRecargoDominical: number; // 75%
}

export interface EmployeeNovedades {
  diasTrabajados: number; // Max 30 por mes o 15 por quincena
  horas: HoursNovedades;
  comisiones: number;
  bonificacionesConstitutivas: number;
  bonificacionesNoConstitutivas: number;
  auxilioNoConstitutivo: number;
  incapacidadDias: number;
  incapacidadValor: number;
  licenciasRemuneradasDias: number;
  licenciasNoRemuneradasDias: number;
  prestamosYDeducciones: number;
  otrasDeducciones: number;
}

export interface PayrollCalculationItem {
  employee: Employee;
  novedades: EmployeeNovedades;
  
  // Devengados
  sueldoTrabajado: number;
  auxilioTransporte: number;
  totalHorasExtrasYRecargos: number;
  detalleHorasExtras: {
    hed: number;
    hen: number;
    hedd: number;
    hedn: number;
    rn: number;
    rd: number;
  };
  comisiones: number;
  bonificacionesConstitutivas: number;
  bonificacionesNoConstitutivas: number;
  auxilioNoConstitutivo: number;
  incapacidades: number;
  totalDevengadoSalarial: number; // Constitutivo
  totalDevengadoNoSalarial: number; // No constitutivo
  totalDevengado: number;

  // Deducciones Empleado
  deduccionSalud: number; // 4%
  deduccionPension: number; // 4%
  fondoSolidaridadPensional: number; // 1% - 2%
  retencionFuente: number;
  prestamos: number;
  otrasDeducciones: number;
  totalDeducciones: number;

  // Neto a Pagar al Empleado
  netoAPagar: number;

  // Seguridad Social y Parafiscales Patronales (Carga Empresa)
  aporteSaludEmpresa: number; // 8.5% (o $0 si aplica exención Art 114-1)
  aportePensionEmpresa: number; // 12%
  aporteARLEmpresa: number; // según nivel de riesgo
  aporteCajaCompensacion: number; // 4%
  aporteSena: number; // 2% (o $0 exención)
  aporteICBF: number; // 3% (o $0 exención)
  totalSeguridadSocialEmpresa: number;
  totalParafiscalesEmpresa: number;

  // Provisiones Prestaciones Sociales (Carga Empresa)
  provisionPrima: number; // 8.33%
  provisionCesantias: number; // 8.33%
  provisionInteresesCesantias: number; // 1% mensual (12% anual)
  provisionVacaciones: number; // 4.17%
  totalProvisionesEmpresa: number;

  // Costo Total Empresa para este empleado
  costoTotalEmpresa: number;
}

export interface CompanySettings {
  nombreEmpresa: string;
  nit: string;
  direccion: string;
  telefono: string;
  ciudad: string;
  email: string;
  smmlv: number; // Salario Mínimo Mensual Legal Vigente
  auxilioTransporteMensual: number;
  porcentajeSaludEmpleado: number; // 4%
  porcentajePensionEmpleado: number; // 4%
  porcentajeSaludEmpresa: number; // 8.5%
  porcentajePensionEmpresa: number; // 12%
  aplicaExencionArt114: boolean; // Exención de Salud, Sena e ICBF para trabajadores < 10 SMMLV
  porcentajeCajaCompensacion: number; // 4%
  porcentajeSena: number; // 2%
  porcentajeICBF: number; // 3%
  
  // Riesgos ARL
  tarifasARL: {
    1: number; // 0.522%
    2: number; // 1.044%
    3: number; // 2.436%
    4: number; // 4.350%
    5: number; // 6.960%
  };
}

export interface PayrollPeriod {
  id: string;
  nombrePeriodo: string; // ej. "Segunda Quincena Julio 2026"
  fechaInicio: string;
  fechaFin: string;
  tipoPeriodo: 'Quincenal' | 'Mensual';
  diasBasePeriodo: number; // 15 o 30
  estado: 'Borrador' | 'Liquidata' | 'Aprobada' | 'Pagada';
  fechaLiquidacion: string;
}

export interface DriverAttendanceRecord {
  id: string; // `${repartidorId}_${fecha}`
  repartidorId: string;
  nombreRepartidor: string;
  fecha: string; // YYYY-MM-DD
  diaSemana: string; // e.g. 'Viernes'
  horaInicioReal: string; // e.g. '07:05'
  horaFinReal?: string;
  estado: 'CONECTADO' | 'FINALIZADO';
  clienteNombre?: string;
  fotoAuditoria?: string;
  timestamp: string;
}

export interface DriverShiftAttendanceStatus {
  employee: Employee;
  scheduledShift: ShiftDetails;
  scheduledStartTime: string;
  scheduledEndTime?: string;
  clienteNombre: string;
  diaSemana: string;
  fecha: string;
  isConnected: boolean;
  attendanceRecord?: DriverAttendanceRecord;
  hasClientReport: boolean;
  isOverdue: boolean;
  delayMinutes: number;
  delayFormatted: string;
  callUrl: string;
  whatsappUrl: string;
}

