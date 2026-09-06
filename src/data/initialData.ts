import {
  CompanySettings,
  Employee,
  EmployeeNovedades,
  PayrollPeriod,
  WeeklySchedule,
  ZoneChiefNovedad,
  ClientOrderReport,
  CompanyClient
} from '../types/payroll';

export const defaultCompanySettings: CompanySettings = {
  nombreEmpresa: 'SERGEM MENSAJERIA S.A.S.',
  nit: '900.398.712-4',
  direccion: 'Calle 10 # 38-42, Cali, Valle del Cauca',
  telefono: '(602) 399-4620 / PBX 314 6670473',
  ciudad: 'Cali - Colombia',
  email: 'gestionhumana@sergemsas.com',
  smmlv: 1423500, // 2026 Reference SMMLV
  auxilioTransporteMensual: 200000,
  porcentajeSaludEmpleado: 0.04,
  porcentajePensionEmpleado: 0.04,
  porcentajeSaludEmpresa: 0.085,
  porcentajePensionEmpresa: 0.12,
  aplicaExencionArt114: true, // Exentos de Salud, Sena e ICBF para <10 SMMLV
  porcentajeCajaCompensacion: 0.04,
  porcentajeSena: 0.02,
  porcentajeICBF: 0.03,
  tarifasARL: {
    1: 0.00522,
    2: 0.01044,
    3: 0.02436,
    4: 0.04350,
    5: 0.06960,
  },
};

export const initialEmployees: Employee[] = [];

export const initialPeriods: PayrollPeriod[] = [];

export const defaultNovedades: Record<string, EmployeeNovedades> = {};

export const initialSchedules: WeeklySchedule[] = [];

export const initialZoneNovedades: ZoneChiefNovedad[] = [];

export const initialClientReports: ClientOrderReport[] = [];

export const initialClients: CompanyClient[] = [];
