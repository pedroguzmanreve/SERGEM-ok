import React, { useState } from 'react';
import { CompanySettings, PayrollCalculationItem, PayrollPeriod } from '../types/payroll';
import { formatCurrency } from '../utils/payrollCalculator';
import { Printer, Download, UserCheck, Building2, CheckCircle2 } from 'lucide-react';

interface PayslipViewProps {
  items: PayrollCalculationItem[];
  period: PayrollPeriod;
  company: CompanySettings;
  selectedEmployeeId?: string;
}

export const PayslipView: React.FC<PayslipViewProps> = ({
  items,
  period,
  company,
  selectedEmployeeId,
}) => {
  const [currentId, setCurrentId] = useState<string>(
    selectedEmployeeId || items[0]?.employee.id || ''
  );

  const activeItem = items.find((i) => i.employee.id === currentId) || items[0];

  if (!activeItem) {
    return <div className="p-8 text-center text-slate-500">No hay información disponible.</div>;
  }

  const { employee, novedades } = activeItem;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="payslip-view" className="space-y-6 pb-10">
      
      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        
        {/* Employee Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-700 uppercase">Seleccionar Empleado:</label>
          <select
            value={currentId}
            onChange={(e) => setCurrentId(e.target.value)}
            className="text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {items.map((i) => (
              <option key={i.employee.id} value={i.employee.id}>
                {i.employee.nombre} {i.employee.apellido} (C.C. {i.employee.cedula}) - {i.employee.cargo}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Comprobante
          </button>
        </div>

      </div>

      {/* Payslip Document Box */}
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-slate-300 shadow-lg print:shadow-none print:border-none print:p-0">
        
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{company.nombreEmpresa}</h2>
            <p className="text-xs text-slate-600 font-semibold">NIT: {company.nit} • {company.direccion}</p>
            <p className="text-xs text-slate-500">{company.telefono} • {company.email}</p>
          </div>
          <div className="text-left sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wide block">Desprendible de Pago de Nómina</span>
            <span className="text-sm font-extrabold text-slate-900 block mt-0.5">{period.nombrePeriodo}</span>
            <span className="text-[11px] text-slate-500 block">{period.fechaInicio} al {period.fechaFin}</span>
          </div>
        </div>

        {/* Employee Info Grid */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-slate-500 block font-medium">Empleado:</span>
            <span className="font-bold text-slate-900 text-sm">{employee.nombre} {employee.apellido}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Cédula de Ciudadanía:</span>
            <span className="font-bold text-slate-900">{employee.cedula}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Cargo:</span>
            <span className="font-bold text-slate-900">{employee.cargo}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Departamento:</span>
            <span className="font-bold text-slate-900">{employee.departamento}</span>
          </div>

          <div>
            <span className="text-slate-500 block font-medium">Salario Básico Mensual:</span>
            <span className="font-semibold text-slate-900">{formatCurrency(employee.salarioBase)}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Días Liquidados:</span>
            <span className="font-semibold text-slate-900">{novedades.diasTrabajados} días</span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">EPS / AFP:</span>
            <span className="font-semibold text-slate-900">{employee.eps} / {employee.afp}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Cuenta de Depósito:</span>
            <span className="font-semibold text-slate-900">{employee.banco} ({employee.tipoCuenta} {employee.numeroCuenta})</span>
          </div>
        </div>

        {/* Tables: Devengados vs Deducciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          {/* DEVENGADOS TABLE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-blue-900 text-white font-bold text-xs uppercase px-4 py-2 flex justify-between">
              <span>Conceptos Devengados (Ingresos)</span>
              <span>Valor ($)</span>
            </div>
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="px-4 py-2 text-slate-700">Sueldo Básico (Días Laborados)</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(activeItem.sueldoTrabajado)}</td>
                </tr>
                {activeItem.auxilioTransporte > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-slate-700">Auxilio de Transporte Legal</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(activeItem.auxilioTransporte)}</td>
                  </tr>
                )}
                {activeItem.totalHorasExtrasYRecargos > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-slate-700">Horas Extras y Recargos</td>
                    <td className="px-4 py-2 text-right font-medium text-indigo-600">{formatCurrency(activeItem.totalHorasExtrasYRecargos)}</td>
                  </tr>
                )}
                {activeItem.comisiones > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-slate-700">Comisiones de Ventas / Operaciones</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(activeItem.comisiones)}</td>
                  </tr>
                )}
                {(activeItem.bonificacionesConstitutivas > 0 || activeItem.bonificacionesNoConstitutivas > 0) && (
                  <tr>
                    <td className="px-4 py-2 text-slate-700">Bonificaciones / Rodamiento</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(activeItem.bonificacionesConstitutivas + activeItem.bonificacionesNoConstitutivas)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-blue-50/70 border-t border-blue-200 text-blue-900 font-bold">
                <tr>
                  <td className="px-4 py-2.5">TOTAL DEVENGADO:</td>
                  <td className="px-4 py-2.5 text-right text-sm font-extrabold">{formatCurrency(activeItem.totalDevengado)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* DEDUCCIONES TABLE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-rose-900 text-white font-bold text-xs uppercase px-4 py-2 flex justify-between">
              <span>Conceptos Deducidos (Descuentos)</span>
              <span>Valor ($)</span>
            </div>
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="px-4 py-2 text-slate-700">Aporte Salud Empleado (4%)</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(activeItem.deduccionSalud)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-slate-700">Aporte Pensión Empleado (4%)</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(activeItem.deduccionPension)}</td>
                </tr>
                {activeItem.fondoSolidaridadPensional > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-slate-700">Fondo Solidaridad Pensional (FSP)</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(activeItem.fondoSolidaridadPensional)}</td>
                  </tr>
                )}
                {activeItem.prestamos > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-slate-700">Deducción por Préstamos / Anticipos</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(activeItem.prestamos)}</td>
                  </tr>
                )}
                {activeItem.retencionFuente > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-slate-700">Retención en la Fuente</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(activeItem.retencionFuente)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-rose-50/70 border-t border-rose-200 text-rose-900 font-bold">
                <tr>
                  <td className="px-4 py-2.5">TOTAL DEDUCCIONES:</td>
                  <td className="px-4 py-2.5 text-right text-sm font-extrabold">{formatCurrency(activeItem.totalDeducciones)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>

        {/* NET TO PAY HIGHLIGHT */}
        <div className="bg-emerald-900 text-white rounded-2xl p-5 mb-8 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-widest block">Neto Pagado al Trabajador</span>
            <span className="text-2xl font-black">{formatCurrency(activeItem.netoAPagar)}</span>
          </div>
          <div className="flex items-center text-xs text-emerald-200 bg-white/10 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
            Transf. Bancaria Programada
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-12 grid grid-cols-2 gap-12 text-xs text-slate-600">
          <div className="border-t border-slate-400 pt-2 text-center">
            <span className="font-bold text-slate-900 block">{employee.nombre} {employee.apellido}</span>
            <span>Firma del Empleado (C.C. {employee.cedula})</span>
          </div>
          <div className="border-t border-slate-400 pt-2 text-center">
            <span className="font-bold text-slate-900 block">{company.nombreEmpresa}</span>
            <span>Gestión Humana y Tesorería</span>
          </div>
        </div>

      </div>

    </div>
  );
};
