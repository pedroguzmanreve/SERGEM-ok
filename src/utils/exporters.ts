import { CompanySettings, PayrollCalculationItem, PayrollPeriod } from '../types/payroll';
import { formatCurrency } from './payrollCalculator';

// Exporting full payroll report to CSV
export function exportPayrollToCSV(
  items: PayrollCalculationItem[],
  period: PayrollPeriod,
  company: CompanySettings
): void {
  const headers = [
    'ID',
    'Cédula',
    'Empleado',
    'Cargo',
    'Departamento',
    'Salario Base',
    'Días Trab.',
    'Sueldo',
    'Aux. Transporte',
    'Horas Extras/Recargos',
    'Comisiones/Bonif.',
    'Total Devengado',
    'Salud (4%)',
    'Pensión (4%)',
    'FSP',
    'Otras Deducc.',
    'Total Deducciones',
    'Neto a Pagar',
    'Carga Patronal SS/Parafiscales',
    'Provisiones Prestaciones',
    'Costo Total Empresa'
  ];

  const rows = items.map(item => [
    item.employee.id,
    item.employee.cedula,
    `"${item.employee.nombre} ${item.employee.apellido}"`,
    `"${item.employee.cargo}"`,
    `"${item.employee.departamento}"`,
    item.employee.salarioBase,
    item.novedades.diasTrabajados,
    item.sueldoTrabajado,
    item.auxilioTransporte,
    item.totalHorasExtrasYRecargos,
    item.comisiones + item.bonificacionesConstitutivas + item.bonificacionesNoConstitutivas,
    item.totalDevengado,
    item.deduccionSalud,
    item.deduccionPension,
    item.fondoSolidaridadPensional,
    item.prestamos + item.otrasDeducciones + item.retencionFuente,
    item.totalDeducciones,
    item.netoAPagar,
    item.totalSeguridadSocialEmpresa + item.totalParafiscalesEmpresa,
    item.totalProvisionesEmpresa,
    item.costoTotalEmpresa
  ]);

  const csvContent = [
    `# REPORTE CONSOLIDADO DE NOMINA - ${company.nombreEmpresa.toUpperCase()}`,
    `# PERIODO: ${period.nombrePeriodo} (${period.fechaInicio} a ${period.fechaFin})`,
    `# GENERADO: ${new Date().toLocaleString('es-CO')}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Nomina_SERGEM_${period.id}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate Bank Flat File for Mass Payment (Bancolombia PAB format)
export function generateBankFlatFile(
  items: PayrollCalculationItem[],
  period: PayrollPeriod,
  company: CompanySettings
): string {
  const totalPagos = items.reduce((acc, i) => acc + i.netoAPagar, 0);
  const fechaActual = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  let fileContent = `HEADER|SERGEM MENSAJERIA SAS|NIT:${company.nit}|PERIODO:${period.nombrePeriodo}|TOTAL_EMPLEADOS:${items.length}|TOTAL_MONTO:${totalPagos}|FECHA:${fechaActual}\n`;

  items.forEach((item, index) => {
    const numReg = (index + 1).toString().padStart(4, '0');
    const cedula = item.employee.cedula.padStart(12, '0');
    const nombre = `${item.employee.nombre} ${item.employee.apellido}`.padEnd(30, ' ');
    const banco = item.employee.banco.padEnd(15, ' ');
    const tipoCuenta = item.employee.tipoCuenta === 'Ahorros' ? 'A' : 'C';
    const numCuenta = item.employee.numeroCuenta.replace(/-/g, '').padStart(15, '0');
    const monto = item.netoAPagar.toString().padStart(12, '0');

    fileContent += `${numReg}|${cedula}|${nombre}|${banco}|${tipoCuenta}|${numCuenta}|${monto}|PAYROLL_SERGEM\n`;
  });

  return fileContent;
}

// Generate DIAN Electronic Payroll XML Simulation
export function generateDianXmlPreview(
  item: PayrollCalculationItem,
  period: PayrollPeriod,
  company: CompanySettings
): string {
  const cune = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const e = item.employee;

  return `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual" 
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  SchemaLocation="dian:gov:co:facturaelectronica:NominaIndividual NominaIndividual.xsd">
  <Novedad CUNE="${cune}">false</Novedad>
  <Periodo FechaIngreso="${period.fechaInicio}" FechaLiquidacionInicio="${period.fechaInicio}" FechaLiquidacionFin="${period.fechaFin}" TiempoLaborado="${item.novedades.diasTrabajados}" PeriodoNomina="${period.tipoPeriodo}"/>
  <NumeroSecuenciaXML CodigoTrabajador="${e.id}" Prefijo="NSEG" Numero="${Math.floor(1000 + Math.random() * 9000)}"/>
  <LugarGeneracionPais CodigoPais="CO" DepartamentoEstado="76" MunicipioCiudad="76001"/>
  <ProveedorXML NIT="${company.nit}" DV="4" RazonSocial="${company.nombreEmpresa}"/>
  <Empleador NIT="${company.nit}" DV="4" RazonSocial="${company.nombreEmpresa}" Direccion="${company.direccion}"/>
  <Trabajador TipoTrabajador="01" SubTipoTrabajador="00" AltoRiesgoPension="false" TipoDocumento="13" NumeroDocumento="${e.cedula}" PrimerApellido="${e.apellido}" PrimerNombre="${e.nombre}" LugarTrabajoPais="CO"/>
  <Pago Forma="1" Metodo="47" Banco="${e.banco}" TipoCuenta="${e.tipoCuenta}" NumeroCuenta="${e.numeroCuenta}"/>
  <FechasPagos>
    <FechaPago>${period.fechaFin}</FechaPago>
  </FechasPagos>
  <Devengados>
    <Basico DiasTrabajados="${item.novedades.diasTrabajados}" SueldoTrabajado="${item.sueldoTrabajado}"/>
    <Transporte AuxilioTransporte="${item.auxilioTransporte}"/>
    <HorasExtras>
      <TotalHED Valor="${item.detalleHorasExtras.hed}"/>
      <TotalHEN Valor="${item.detalleHorasExtras.hen}"/>
    </HorasExtras>
    <Comisiones>${item.comisiones}</Comisiones>
    <Bonificaciones>${item.bonificacionesConstitutivas + item.bonificacionesNoConstitutivas}</Bonificaciones>
  </Devengados>
  <Deducciones>
    <Salud Porcentaje="4.00" Deduccion="${item.deduccionSalud}"/>
    <FondoPension Porcentaje="4.00" Deduccion="${item.deduccionPension}"/>
    <FondoSp Deduccion="${item.fondoSolidaridadPensional}"/>
    <OtrasDeducciones>${item.prestamos + item.otrasDeducciones}</OtrasDeducciones>
  </Deducciones>
  <ValoresTotales>
    <DevengadosTotal>${item.totalDevengado}</DevengadosTotal>
    <DeduccionesTotal>${item.totalDeducciones}</DeduccionesTotal>
    <ComprobanteTotal>${item.netoAPagar}</ComprobanteTotal>
  </ValoresTotales>
</NominaIndividual>`;
}
