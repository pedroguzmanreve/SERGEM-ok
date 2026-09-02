import { describe, it, expect } from 'vitest';
import { calculatePayrollItem, formatCurrency } from '../../utils/payrollCalculator';
import { CompanySettings, Employee, EmployeeNovedades } from '../../types/payroll';

const mockCompanySettings: CompanySettings = {
  nombreEmpresa: 'SERGEM MENSAJERIA S.A.S.',
  nit: '900.564.123-1',
  direccion: 'Cra 23 # 45-12',
  telefono: '(606) 884-1234',
  ciudad: 'Manizales',
  email: 'contacto@sergem.com.co',
  smmlv: 1423500,
  auxilioTransporteMensual: 200000,
  jornadaMaximaSemanal: 42,
  jornadaDiariaBase: 7,
  porcentajeSaludEmpleado: 0.04,
  porcentajePensionEmpleado: 0.04,
  porcentajeSaludEmpresa: 0.085,
  porcentajePensionEmpresa: 0.12,
  porcentajeCajaCompensacion: 0.04,
  porcentajeSena: 0.02,
  porcentajeICBF: 0.03,
  aplicaExencionArt114: true,
  tarifasGeneralesClientes: {
    tarifaBasePaquete: 4500,
    tarifaHoraOrdinaria: 14500,
    tarifaHoraExtraDiurna: 18125,
    tarifaHoraExtraNocturna: 25375,
    tarifaSalidaFueraPerimetro: 22000,
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

const mockEmployee: Employee = {
  id: 'emp-1',
  cedula: '1053800001',
  nombre: 'Carlos',
  apellido: 'Gómez',
  cargo: 'Mensajero Motorizado',
  departamento: 'Operaciones y Mensajería',
  rol: 'Repartidor',
  salarioBase: 1423500, // 1 SMMLV
  tipoContrato: 'Término Indefinido',
  nivelRiesgoARL: 4, // Nivel 4 para mensajería en moto
  fechaIngreso: '2024-01-15',
  banco: 'Bancolombia',
  tipoCuenta: 'Ahorros',
  numeroCuenta: '1053-8899-01',
  eps: 'Sura EPS',
  afp: 'Protección',
  ccf: 'Confa Caldas',
  activo: true,
};

const mockNovedades: EmployeeNovedades = {
  diasTrabajados: 15,
  horas: {
    horasExtrasDiurnas: 4,
    horasExtrasNocturnas: 2,
    horasExtrasDominicalesDiurnas: 0,
    horasExtrasDominicalesNocturnas: 0,
    horasRecargoNocturno: 5,
    horasRecargoDominical: 0,
  },
  comisiones: 50000,
  bonificacionesConstitutivas: 0,
  bonificacionesNoConstitutivas: 20000,
  auxilioNoConstitutivo: 0,
  incapacidadDias: 0,
  incapacidadValor: 0,
  licenciasRemuneradasDias: 0,
  licenciasNoRemuneradasDias: 0,
  prestamosYDeducciones: 30000,
  otrasDeducciones: 0,
};

describe('payrollCalculator Utility Tests', () => {
  it('correctly calculates worked salary for 15 days', () => {
    const result = calculatePayrollItem(mockEmployee, mockNovedades, mockCompanySettings, 15);
    const expectedDaily = mockEmployee.salarioBase / 30;
    const expectedSueldo = Math.round(expectedDaily * 15);
    expect(result.sueldoTrabajado).toBe(expectedSueldo);
  });

  it('includes transport allowance for employees earning <= 2 SMMLV', () => {
    const result = calculatePayrollItem(mockEmployee, mockNovedades, mockCompanySettings, 15);
    const expectedAuxilio = Math.round((mockCompanySettings.auxilioTransporteMensual / 30) * 15);
    expect(result.auxilioTransporte).toBe(expectedAuxilio);
  });

  it('excludes transport allowance for employees earning > 2 SMMLV', () => {
    const highEarner: Employee = {
      ...mockEmployee,
      salarioBase: 3500000, // > 2 SMMLV (2 * 1423500 = 2847000)
    };
    const result = calculatePayrollItem(highEarner, mockNovedades, mockCompanySettings, 15);
    expect(result.auxilioTransporte).toBe(0);
  });

  it('calculates overtime rates correctly (HED 25%, HEN 75%, RN 35%)', () => {
    const result = calculatePayrollItem(mockEmployee, mockNovedades, mockCompanySettings, 15);
    const hourly = mockEmployee.salarioBase / 240;

    const expectedHed = Math.round(hourly * 1.25 * 4);
    const expectedHen = Math.round(hourly * 1.75 * 2);
    const expectedRn = Math.round(hourly * 0.35 * 5);

    expect(result.detalleHorasExtras.hed).toBe(expectedHed);
    expect(result.detalleHorasExtras.hen).toBe(expectedHen);
    expect(result.detalleHorasExtras.rn).toBe(expectedRn);
    expect(result.totalHorasExtrasYRecargos).toBe(expectedHed + expectedHen + expectedRn);
  });

  it('calculates employee health and pension deductions at 4% of IBC', () => {
    const result = calculatePayrollItem(mockEmployee, mockNovedades, mockCompanySettings, 15);
    const expectedHealth = Math.round(result.totalDevengadoSalarial * 0.04);
    const expectedPension = Math.round(result.totalDevengadoSalarial * 0.04);

    expect(result.deduccionSalud).toBe(expectedHealth);
    expect(result.deduccionPension).toBe(expectedPension);
  });

  it('applies Art. 114-1 tax exemption (0% employer health, SENA, ICBF when < 10 SMMLV)', () => {
    const result = calculatePayrollItem(mockEmployee, mockNovedades, mockCompanySettings, 15);
    expect(result.aporteSaludEmpresa).toBe(0);
    expect(result.aporteSena).toBe(0);
    expect(result.aporteICBF).toBe(0);
    // Pension and ARL are not exempt
    expect(result.aportePensionEmpresa).toBeGreaterThan(0);
    expect(result.aporteARLEmpresa).toBeGreaterThan(0);
  });

  it('formats currency correctly for Colombian COP format', () => {
    const formatted = formatCurrency(1500000);
    expect(formatted).toContain('1.500.000');
  });
});
