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

export interface AuthUser {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  email?: string;
  rol: UserRole;
  cargo: string;
  departamento?: Department;
  placaVehiculo?: string;
  jefeZonaId?: string;
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
  placaVehiculo?: string;
  jefeZonaId?: string;
  email?: string;
  telefono?: string;
  estadoInvitacion?: 'Invitado' | 'Activo' | 'Pendiente';
}

export type ShiftType = 'Continua' | 'Partido' | 'Medio Tiempo Mañana' | 'Medio Tiempo Tarde' | 'Descanso';

export interface ShiftDetails {
  tipo: ShiftType;
  clienteNombre?: string;
  clienteId?: string;
  horaInicio1?: string; // e.g. "07:00"
  horaFin1?: string; // e.g. "15:00" o "12:00"
  horaInicio2?: string; // e.g. "14:00"
  horaFin2?: string; // e.g. "18:00"
  observaciones?: string;
}

export type DriverShiftLiveStatus = 
  | 'PENDIENTE_INICIO'
  | 'INICIADO'
  | 'FINALIZADO'
  | 'DESCANSO'
  | 'SIN_TURNO';

export interface DriverDailyAttendance {
  repartidorId: string;
  diaSemana: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  fecha: string;
  estado: DriverShiftLiveStatus;
  horaInicioProgramada?: string;
  horaFinProgramada?: string;
  clienteNombre?: string;
  horaConexionReal?: string;
  minutosRetraso?: number;
  fotoAuditoria?: string;
  salidasFueraPerimetro?: number;
  valorFueraPerimetro?: number;
  ultimoContacto?: {
    tipo: 'WhatsApp' | 'Llamada';
    fechaHora: string;
    mensajeEnviado?: string;
    registradoPor?: string;
    respuestaRegistrada?: string;
  };
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
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  observaciones: string;
  fechaRegistro: string;
  archivoUrl?: string;
  archivoNombre?: string;
}

// Client entity & custom tariff schema
export interface ClientTariffs {
  tarifaBasePaquete: number;
  tarifaHoraOrdinaria: number;
  tarifaHoraExtraDiurna: number;
  tarifaHoraExtraNocturna: number;
  tarifaSalidaFueraPerimetro: number; // e.g. $22.000 COP
  tarifaRecargoDominical: number;
  tarifaRecargoNocturno?: number;
  tarifaMensajeroFijoMensual?: number;
}

export interface CompanyClient {
  id: string;
  nombre: string;
  nit: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  emailContacto: string;
  personaContacto: string;
  estado: 'Activo' | 'Inactivo';
  tarifas: ClientTariffs;
  sedes?: string[];
  observaciones?: string;
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
  horasOrdinarias: number; // Base jornada 42h
  horasExtrasDiurnas: number; // HED (+25%)
  horasExtrasNocturnas: number; // HEN (+75%)
  horasFestivas: number; // HEDD (+100%)
  horasExtrasFestivasNocturnas?: number; // HENF (+150%)
  recargoNocturno?: number; // RN (+35%)
  recargoFestivo?: number; // RDF (+75%)
  salidasFueraPerimetro: number; // Cantidad de salidas fuera del perímetro urbano
  valorFueraPerimetro: number; // Valor liquidado de salidas fuera de perímetro
  detallesFueraPerimetro?: {
    destino: string;
    cantidad: number;
    tarifaUnitaria: number;
    observacion?: string;
  }[];
}

export interface HoursNovedades {
  horasExtrasDiurnas: number; // 25%
  horasExtrasNocturnas: number; // 75%
  horasExtrasDominicalesDiurnas: number; // 100%
  horasExtrasDominicalesNocturnas: number; // 150%
  horasRecargoNocturno: number; // 35%
  horasRecargoDominical: number; // 75%
  salidasFueraPerimetro?: number;
  valorFueraPerimetro?: number;
}

export interface EmployeeNovedades {
  diasTrabajados: number;
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
  salidasFueraPerimetro?: number;
  valorFueraPerimetro?: number;
  comisiones: number;
  bonificacionesConstitutivas: number;
  bonificacionesNoConstitutivas: number;
  auxilioNoConstitutivo: number;
  incapacidades: number;
  totalDevengadoSalarial: number;
  totalDevengadoNoSalarial: number;
  totalDevengado: number;

  // Deducciones Empleado
  deduccionSalud: number; // 4%
  deduccionPension: number; // 4%
  fondoSolidaridadPensional: number;
  retencionFuente: number;
  prestamos: number;
  otrasDeducciones: number;
  totalDeducciones: number;

  // Neto a Pagar al Empleado
  netoAPagar: number;

  // Seguridad Social y Parafiscales Patronales (Carga Empresa)
  aporteSaludEmpresa: number;
  aportePensionEmpresa: number;
  aporteARLEmpresa: number;
  aporteCajaCompensacion: number;
  aporteSena: number;
  aporteICBF: number;
  totalSeguridadSocialEmpresa: number;
  totalParafiscalesEmpresa: number;

  // Provisiones Prestaciones Sociales (Carga Empresa)
  provisionPrima: number;
  provisionCesantias: number;
  provisionInteresesCesantias: number;
  provisionVacaciones: number;
  totalProvisionesEmpresa: number;

  // Costo Total Empresa
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
  
  // Jornada Laboral (Reforma Ley 2101)
  jornadaMaximaSemanal: number; // 42 horas (2026)
  jornadaDiariaBase: number; // 7 u 8 horas

  // Parámetros de Seguridad Social
  porcentajeSaludEmpleado: number; // 4%
  porcentajePensionEmpleado: number; // 4%
  porcentajeSaludEmpresa: number; // 8.5%
  porcentajePensionEmpresa: number; // 12%
  aplicaExencionArt114: boolean;
  porcentajeCajaCompensacion: number; // 4%
  porcentajeSena: number; // 2%
  porcentajeICBF: number; // 3%
  
  // Tarifas Estándar Clientes y Operación
  tarifasGeneralesClientes: {
    tarifaBasePaquete: number;
    tarifaHoraOrdinaria: number;
    tarifaHoraExtraDiurna: number;
    tarifaHoraExtraNocturna: number;
    tarifaSalidaFueraPerimetro: number; // Extra-radio urbano
    tarifaRecargoDominical: number;
    tarifaRecargoNocturno: number;
  };

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
  nombrePeriodo: string;
  fechaInicio: string;
  fechaFin: string;
  tipoPeriodo: 'Quincenal' | 'Mensual';
  diasBasePeriodo: number;
  estado: 'Borrador' | 'Liquidata' | 'Aprobada' | 'Pagada';
  fechaLiquidacion: string;
}
