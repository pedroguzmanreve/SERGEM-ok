import {
  CompanySettings,
  Employee,
  EmployeeNovedades,
  PayrollPeriod,
  WeeklySchedule,
  ZoneChiefNovedad,
  ClientOrderReport,
  DriverDailyAttendance,
  CompanyClient
} from '../types/payroll';

export const defaultCompanySettings: CompanySettings = {
  nombreEmpresa: 'SERGEM MENSAJERIA S.A.S.',
  nit: '900.398.712-4',
  direccion: 'Calle 10 # 38-42, Cali, Valle del Cauca',
  telefono: '(602) 399-4620 / PBX 314 6670473',
  ciudad: 'Santiago de Cali - Colombia',
  email: 'gestionhumana@sergemsas.com',
  smmlv: 1423500, // 2026 Reference SMMLV Colombia
  auxilioTransporteMensual: 200000,
  
  // Jornada Laboral Reglamentaria (Ley 2101 de 2021: 42 Horas Semanales en 2026)
  jornadaMaximaSemanal: 42,
  jornadaDiariaBase: 7,

  // Seguridad Social & Parafiscales
  porcentajeSaludEmpleado: 0.04,
  porcentajePensionEmpleado: 0.04,
  porcentajeSaludEmpresa: 0.085,
  porcentajePensionEmpresa: 0.12,
  aplicaExencionArt114: true, // Exentos de Salud, Sena e ICBF para <10 SMMLV (Art. 114-1 E.T.)
  porcentajeCajaCompensacion: 0.04,
  porcentajeSena: 0.02,
  porcentajeICBF: 0.03,

  // Tarifas Estándar de Facturación a Clientes
  tarifasGeneralesClientes: {
    tarifaBasePaquete: 4500,
    tarifaHoraOrdinaria: 14500,
    tarifaHoraExtraDiurna: 18125,
    tarifaHoraExtraNocturna: 25375,
    tarifaSalidaFueraPerimetro: 22000, // Valor por salida / entrega fuera del perímetro urbano (ej. Yumbo, Jamundí, Palmira)
    tarifaRecargoDominical: 25375,
    tarifaRecargoNocturno: 5075,
  },

  tarifasARL: {
    1: 0.00522,
    2: 0.01044,
    3: 0.02436,
    4: 0.04350,
    5: 0.06960,
  },
};

// Clientes iniciales para SERGEM
export const initialClients: CompanyClient[] = [
  {
    id: 'CLI-001',
    nombre: 'Almacenes Éxito S.A.',
    nit: '890.900.608-9',
    direccion: 'Carrera 1 # 44-12, Centro Comercial Único & Éxito San Fernando',
    ciudad: 'Santiago de Cali',
    telefono: '(602) 660-8000',
    emailContacto: 'logistica.cali@exito.com.co',
    personaContacto: 'Adriana Montenegro (Coordinadora Logística)',
    estado: 'Activo',
    sedes: ['Éxito San Fernando', 'Éxito Flora', 'Éxito Unicentro'],
    tarifas: {
      tarifaBasePaquete: 4800,
      tarifaHoraOrdinaria: 15500,
      tarifaHoraExtraDiurna: 19375,
      tarifaHoraExtraNocturna: 27125,
      tarifaSalidaFueraPerimetro: 24000, // Yumbo / Jamundí / Palmira
      tarifaRecargoDominical: 27125,
      tarifaRecargoNocturno: 5425,
      tarifaMensajeroFijoMensual: 2950000,
    },
    fechaRegistro: '2025-01-10',
    observaciones: 'Cliente corporativo prioritario. Entrega de pedidos exprés y última milla.',
  },
  {
    id: 'CLI-002',
    nombre: 'Sodimac Colombia S.A. (Homecenter)',
    nit: '800.242.106-2',
    direccion: 'Avenida 6N # 47N-02, Menga',
    ciudad: 'Santiago de Cali',
    telefono: '(602) 485-9000',
    emailContacto: 'despachos.cali@homecenter.co',
    personaContacto: 'Mauricio Valencia (Jefe de Despachos)',
    estado: 'Activo',
    sedes: ['Homecenter Norte Menga', 'Homecenter Sur Pasoancho'],
    tarifas: {
      tarifaBasePaquete: 5200,
      tarifaHoraOrdinaria: 16000,
      tarifaHoraExtraDiurna: 20000,
      tarifaHoraExtraNocturna: 28000,
      tarifaSalidaFueraPerimetro: 25000,
      tarifaRecargoDominical: 28000,
      tarifaRecargoNocturno: 5600,
      tarifaMensajeroFijoMensual: 3100000,
    },
    fechaRegistro: '2025-02-15',
    observaciones: 'Paquetes de ferretería liviana, accesorios y hogar.',
  },
  {
    id: 'CLI-003',
    nombre: 'Colombiana de Comercio S.A. (Alkosto)',
    nit: '890.900.943-1',
    direccion: 'Calle 13 # 80-60, Pasoancho',
    ciudad: 'Santiago de Cali',
    telefono: '(602) 333-5500',
    emailContacto: 'operaciones.alkosto@alkosto.com.co',
    personaContacto: 'Claudia Ramírez (Supervisora Operaciones)',
    estado: 'Activo',
    sedes: ['Alkosto Pasoancho', 'Alkosto Chipichape'],
    tarifas: {
      tarifaBasePaquete: 4600,
      tarifaHoraOrdinaria: 14800,
      tarifaHoraExtraDiurna: 18500,
      tarifaHoraExtraNocturna: 25900,
      tarifaSalidaFueraPerimetro: 22000,
      tarifaRecargoDominical: 25900,
      tarifaRecargoNocturno: 5180,
    },
    fechaRegistro: '2025-03-01',
    observaciones: 'Mensajería para tecnología y electrodomésticos portátiles.',
  },
  {
    id: 'CLI-004',
    nombre: 'Droguerías Cruz Verde S.A.S.',
    nit: '800.149.695-1',
    direccion: 'Avenida Roosevelt # 36-40',
    ciudad: 'Santiago de Cali',
    telefono: '(602) 486-1000',
    emailContacto: 'farmacias.domicilios@cruzverde.com.co',
    personaContacto: 'Javier Osorio (Coordinador Domicilios)',
    estado: 'Activo',
    sedes: ['Roosevelt', 'Tequendama', 'Versalles', 'La Flora'],
    tarifas: {
      tarifaBasePaquete: 4200,
      tarifaHoraOrdinaria: 14000,
      tarifaHoraExtraDiurna: 17500,
      tarifaHoraExtraNocturna: 24500,
      tarifaSalidaFueraPerimetro: 20000,
      tarifaRecargoDominical: 24500,
      tarifaRecargoNocturno: 4900,
    },
    fechaRegistro: '2025-04-12',
    observaciones: 'Medicamentos y productos de farmacia con entrega en frío y urgente.',
  },
];

// Base data initialized as clean production ready states
export const initialEmployees: Employee[] = [];

export const initialPeriods: PayrollPeriod[] = [
  {
    id: 'PER-ACTUAL',
    nombrePeriodo: 'Periodo 1 - 2026',
    fechaInicio: '2026-08-01',
    fechaFin: '2026-08-15',
    tipoPeriodo: 'Quincenal',
    diasBasePeriodo: 15,
    estado: 'Borrador',
    fechaLiquidacion: '2026-08-15',
  },
];

export const defaultNovedades: Record<string, EmployeeNovedades> = {};

export const initialSchedules: WeeklySchedule[] = [];

export const initialZoneNovedades: ZoneChiefNovedad[] = [];

export const initialClientReports: ClientOrderReport[] = [];

export const initialDailyAttendance: Record<string, DriverDailyAttendance> = {};
