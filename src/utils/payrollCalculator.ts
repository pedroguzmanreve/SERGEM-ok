import { CompanySettings, Employee, EmployeeNovedades, PayrollCalculationItem } from '../types/payroll';

export function calculatePayrollItem(
  employee: Employee,
  novedades: EmployeeNovedades,
  settings: CompanySettings,
  diasBasePeriodo: number = 15
): PayrollCalculationItem {
  const { smmlv, auxilioTransporteMensual } = settings;
  const salario = employee.salarioBase;

  // Valor día y hora ordinaria (Base de 240 horas al mes / 30 días)
  const valorDia = salario / 30;
  const valorHoraOrdinaria = salario / 240;

  // Días laborados en este período
  const diasTrabajados = Math.min(novedades.diasTrabajados, diasBasePeriodo);
  const sueldoTrabajado = Math.round(valorDia * diasTrabajados);

  // Cálculo de Horas Extras y Recargos
  const {
    horasExtrasDiurnas = 0,
    horasExtrasNocturnas = 0,
    horasExtrasDominicalesDiurnas = 0,
    horasExtrasDominicalesNocturnas = 0,
    horasRecargoNocturno = 0,
    horasRecargoDominical = 0,
  } = novedades.horas || {};

  const valorHED = Math.round(valorHoraOrdinaria * 1.25 * horasExtrasDiurnas);
  const valorHEN = Math.round(valorHoraOrdinaria * 1.75 * horasExtrasNocturnas);
  const valorHEDD = Math.round(valorHoraOrdinaria * 2.00 * horasExtrasDominicalesDiurnas);
  const valorHEDN = Math.round(valorHoraOrdinaria * 2.50 * horasExtrasDominicalesNocturnas);
  const valorRN = Math.round(valorHoraOrdinaria * 0.35 * horasRecargoNocturno);
  const valorRD = Math.round(valorHoraOrdinaria * 0.75 * horasRecargoDominical);

  const totalHorasExtrasYRecargos = valorHED + valorHEN + valorHEDD + valorHEDN + valorRN + valorRD;

  // Auxilio de Transporte
  // Aplica si el salario básico es menor o igual a 2 SMMLV
  const aplicaAuxilioTransporte = salario <= (smmlv * 2);
  const auxilioTransporteDiario = auxilioTransporteMensual / 30;
  const auxilioTransporte = aplicaAuxilioTransporte ? Math.round(auxilioTransporteDiario * diasTrabajados) : 0;

  // Comisiones y Bonificaciones
  const comisiones = novedades.comisiones || 0;
  const bonificacionesConstitutivas = novedades.bonificacionesConstitutivas || 0;
  const bonificacionesNoConstitutivas = novedades.bonificacionesNoConstitutivas || 0;
  const auxilioNoConstitutivo = novedades.auxilioNoConstitutivo || 0;
  const incapacidades = novedades.incapacidadValor || 0;

  // Devengados
  const totalDevengadoSalarial = sueldoTrabajado + totalHorasExtrasYRecargos + comisiones + bonificacionesConstitutivas + incapacidades;
  const totalDevengadoNoSalarial = bonificacionesNoConstitutivas + auxilioNoConstitutivo;
  const totalDevengado = totalDevengadoSalarial + auxilioTransporte + totalDevengadoNoSalarial;

  // Ingreso Base de Cotización (IBC) para Seguridad Social y Parafiscales
  // IBC = Devengados salariales (Excluye auxilio de transporte y pagos no salariales)
  const ibc = totalDevengadoSalarial;

  // Deducciones del Empleado
  const deduccionSalud = Math.round(ibc * settings.porcentajeSaludEmpleado);
  const deduccionPension = Math.round(ibc * settings.porcentajePensionEmpleado);

  // Fondo de Solidaridad Pensional (FSP)
  // Aplica si IBC >= 4 SMMLV
  let porcentajeFSP = 0;
  if (ibc >= smmlv * 4 && ibc < smmlv * 16) porcentajeFSP = 0.01;
  else if (ibc >= smmlv * 16 && ibc < smmlv * 17) porcentajeFSP = 0.012;
  else if (ibc >= smmlv * 17 && ibc < smmlv * 18) porcentajeFSP = 0.014;
  else if (ibc >= smmlv * 18 && ibc < smmlv * 19) porcentajeFSP = 0.016;
  else if (ibc >= smmlv * 19 && ibc < smmlv * 20) porcentajeFSP = 0.018;
  else if (ibc >= smmlv * 20) porcentajeFSP = 0.02;

  const fondoSolidaridadPensional = Math.round(ibc * porcentajeFSP);

  // Retención en la fuente (Estimación simplificada colombiana)
  let retencionFuente = 0;
  // A partir de ~95 UVT (Aprox 4.5 millones libres)
  if (ibc > 4500000) {
    const baseUvt = (ibc - deduccionSalud - deduccionPension - (ibc * 0.25)) / 49799; // Estimado UVT 2026 ~49.799
    if (baseUvt > 95) {
      retencionFuente = Math.round((baseUvt - 95) * 0.19 * 49799);
    }
  }

  const prestamos = novedades.prestamosYDeducciones || 0;
  const otrasDeducciones = novedades.otrasDeducciones || 0;

  const totalDeducciones = deduccionSalud + deduccionPension + fondoSolidaridadPensional + retencionFuente + prestamos + otrasDeducciones;

  // Neto a Pagar
  const netoAPagar = totalDevengado - totalDeducciones;

  // --- CARGA PATRONAL (EMPRESA) ---

  // Exención Art. 114-1 Estatuto Tributario (Exento de Salud 8.5%, Sena 2% e ICBF 3% para trabajadores con devengados < 10 SMMLV)
  const aplicaExencion114 = settings.aplicaExencionArt114 && (ibc < smmlv * 10);

  const aporteSaludEmpresa = aplicaExencion114 ? 0 : Math.round(ibc * settings.porcentajeSaludEmpresa);
  const aportePensionEmpresa = Math.round(ibc * settings.porcentajePensionEmpresa);

  // Tarifa ARL según nivel de riesgo (1 a 5)
  const tarifaARL = settings.tarifasARL[employee.nivelRiesgoARL] || settings.tarifasARL[1];
  const aporteARLEmpresa = Math.round(ibc * tarifaARL);

  const aporteCajaCompensacion = Math.round(ibc * settings.porcentajeCajaCompensacion);
  const aporteSena = aplicaExencion114 ? 0 : Math.round(ibc * settings.porcentajeSena);
  const aporteICBF = aplicaExencion114 ? 0 : Math.round(ibc * settings.porcentajeICBF);

  const totalSeguridadSocialEmpresa = aporteSaludEmpresa + aportePensionEmpresa + aporteARLEmpresa;
  const totalParafiscalesEmpresa = aporteCajaCompensacion + aporteSena + aporteICBF;

  // --- PROVISIONES DE PRESTACIONES SOCIALES ---
  // Base para Prima y Cesantías = IBC + Auxilio de Transporte
  const basePrestaciones = ibc + auxilioTransporte;

  const provisionPrima = Math.round(basePrestaciones * 0.0833); // 8.33% (1/12)
  const provisionCesantias = Math.round(basePrestaciones * 0.0833); // 8.33%
  const provisionInteresesCesantias = Math.round(provisionCesantias * 0.12); // 12% anual sobre el valor de cesantías = 1% sobre base
  const provisionVacaciones = Math.round(ibc * 0.0417); // 4.17% (Sin auxilio de transporte)

  const totalProvisionesEmpresa = provisionPrima + provisionCesantias + provisionInteresesCesantias + provisionVacaciones;

  // Costo Total Empresa
  const costoTotalEmpresa = totalDevengado + totalSeguridadSocialEmpresa + totalParafiscalesEmpresa + totalProvisionesEmpresa;

  return {
    employee,
    novedades,
    sueldoTrabajado,
    auxilioTransporte,
    totalHorasExtrasYRecargos,
    detalleHorasExtras: {
      hed: valorHED,
      hen: valorHEN,
      hedd: valorHEDD,
      hedn: valorHEDN,
      rn: valorRN,
      rd: valorRD,
    },
    comisiones,
    bonificacionesConstitutivas,
    bonificacionesNoConstitutivas,
    auxilioNoConstitutivo,
    incapacidades,
    totalDevengadoSalarial,
    totalDevengadoNoSalarial,
    totalDevengado,

    deduccionSalud,
    deduccionPension,
    fondoSolidaridadPensional,
    retencionFuente,
    prestamos,
    otrasDeducciones,
    totalDeducciones,

    netoAPagar,

    aporteSaludEmpresa,
    aportePensionEmpresa,
    aporteARLEmpresa,
    aporteCajaCompensacion,
    aporteSena,
    aporteICBF,
    totalSeguridadSocialEmpresa,
    totalParafiscalesEmpresa,

    provisionPrima,
    provisionCesantias,
    provisionInteresesCesantias,
    provisionVacaciones,
    totalProvisionesEmpresa,

    costoTotalEmpresa,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}
