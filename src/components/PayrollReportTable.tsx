import React, { useState } from 'react';
import { CompanySettings, Department, PayrollCalculationItem, PayrollPeriod } from '../types/payroll';
import { formatCurrency } from '../utils/payrollCalculator';
import { exportPayrollToCSV } from '../utils/exporters';
import { Search, Download, Edit3, ChevronDown, ChevronRight, FileText, Printer, SlidersHorizontal } from 'lucide-react';

interface PayrollReportTableProps {
  items: PayrollCalculationItem[];
  period: PayrollPeriod;
  company: CompanySettings;
  onEditNovedades: (item: PayrollCalculationItem) => void;
  onSelectPayslip: (employeeId: string) => void;
}

export const PayrollReportTable: React.FC<PayrollReportTableProps> = ({
  items,
  period,
  company,
  onEditNovedades,
  onSelectPayslip,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('Todos');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.employee.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employee.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employee.cedula.includes(searchTerm) ||
      item.employee.cargo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === 'Todos' || item.employee.departamento === selectedDept;

    return matchesSearch && matchesDept;
  });

  // Totals
  const totalDevengado = filteredItems.reduce((a, b) => a + b.totalDevengado, 0);
  const totalDeducciones = filteredItems.reduce((a, b) => a + b.totalDeducciones, 0);
  const totalNeto = filteredItems.reduce((a, b) => a + b.netoAPagar, 0);
  const totalCosto = filteredItems.reduce((a, b) => a + b.costoTotalEmpresa, 0);

  const departments: Department[] = [
    'Operaciones y Mensajería',
    'Logística y Despachos',
    'Gestión Humana',
    'Financiera y Contabilidad',
    'Tecnología e Innovación',
    'Comercial y Ventas',
    'Administración',
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="payroll-report-table-wrapper" className="space-y-4">
      
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos los Departamentos</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportPayrollToCSV(filteredItems, period, company)}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exportar Excel/CSV
          </button>
          
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Imprimir
          </button>
        </div>

      </div>

      {/* Main Payroll Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
            <thead className="bg-slate-800 text-slate-200 font-bold uppercase tracking-wider">
              <tr>
                <th className="w-8 px-3 py-3"></th>
                <th className="px-3 py-3">Empleado</th>
                <th className="px-3 py-3 text-center">Días</th>
                <th className="px-3 py-3 text-right">Sueldo Prop.</th>
                <th className="px-3 py-3 text-right">Aux. Transp.</th>
                <th className="px-3 py-3 text-right">Extras/Rec.</th>
                <th className="px-3 py-3 text-right">Comis./Bonif.</th>
                <th className="px-3 py-3 text-right bg-blue-900/40 text-blue-200">Total Devengado</th>
                <th className="px-3 py-3 text-right">Salud (4%)</th>
                <th className="px-3 py-3 text-right">Pensión (4%)</th>
                <th className="px-3 py-3 text-right">Otras Ded.</th>
                <th className="px-3 py-3 text-right bg-rose-900/40 text-rose-200">Total Deducciones</th>
                <th className="px-3 py-3 text-right bg-emerald-900/60 text-emerald-200 font-extrabold">Neto a Pagar</th>
                <th className="px-3 py-3 text-right">Costo Empresa</th>
                <th className="px-3 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-8 text-slate-500 font-medium">
                    No se encontraron empleados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isExpanded = !!expandedRows[item.employee.id];
                  return (
                    <React.Fragment key={item.employee.id}>
                      <tr className={`hover:bg-blue-50/50 transition ${isExpanded ? 'bg-slate-50' : ''}`}>
                        
                        {/* Expand Toggle */}
                        <td className="px-3 py-3 text-center cursor-pointer" onClick={() => toggleRow(item.employee.id)}>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-600 inline" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                          )}
                        </td>

                        {/* Employee Details */}
                        <td className="px-3 py-3">
                          <div className="font-bold text-slate-900 text-sm">
                            {item.employee.nombre} {item.employee.apellido}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span className="font-mono">C.C. {item.employee.cedula}</span>
                            <span>•</span>
                            <span className="text-blue-700 font-medium">{item.employee.cargo}</span>
                          </div>
                        </td>

                        {/* Días */}
                        <td className="px-3 py-3 text-center font-semibold">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            {item.novedades.diasTrabajados}
                          </span>
                        </td>

                        {/* Devengados */}
                        <td className="px-3 py-3 text-right font-medium text-slate-700">
                          {formatCurrency(item.sueldoTrabajado)}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">
                          {formatCurrency(item.auxilioTransporte)}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-indigo-600">
                          {formatCurrency(item.totalHorasExtrasYRecargos)}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">
                          {formatCurrency(item.comisiones + item.bonificacionesConstitutivas + item.bonificacionesNoConstitutivas)}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-blue-900 bg-blue-50/70">
                          {formatCurrency(item.totalDevengado)}
                        </td>

                        {/* Deducciones */}
                        <td className="px-3 py-3 text-right text-slate-600">
                          {formatCurrency(item.deduccionSalud)}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">
                          {formatCurrency(item.deduccionPension)}
                        </td>
                        <td className="px-3 py-3 text-right text-rose-600">
                          {formatCurrency(item.fondoSolidaridadPensional + item.prestamos + item.otrasDeducciones)}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-rose-900 bg-rose-50/70">
                          {formatCurrency(item.totalDeducciones)}
                        </td>

                        {/* Neto a Pagar */}
                        <td className="px-3 py-3 text-right font-extrabold text-emerald-700 bg-emerald-50 text-sm">
                          {formatCurrency(item.netoAPagar)}
                        </td>

                        {/* Costo Empresa */}
                        <td className="px-3 py-3 text-right font-bold text-slate-900">
                          {formatCurrency(item.costoTotalEmpresa)}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 text-center space-x-1">
                          <button
                            onClick={() => onEditNovedades(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                            title="Editar Novedades (Horas extras, bonos, préstamos)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onSelectPayslip(item.employee.id)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                            title="Ver Desprendible de Pago"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>

                      </tr>

                      {/* Expanded Row Details */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-b-2 border-slate-300">
                          <td colSpan={15} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              
                              {/* Devengados Breakdown */}
                              <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <h5 className="font-bold text-blue-900 mb-2 border-b border-blue-100 pb-1">
                                  Detalle Devengados & Horas Extras
                                </h5>
                                <div className="space-y-1 text-slate-600">
                                  <div className="flex justify-between">
                                    <span>Salario Base Mensual:</span>
                                    <span className="font-semibold text-slate-900">{formatCurrency(item.employee.salarioBase)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>H.E. Diurnas:</span>
                                    <span>{formatCurrency(item.detalleHorasExtras.hed)} ({item.novedades.horas?.horasExtrasDiurnas || 0} hrs)</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>H.E. Nocturnas:</span>
                                    <span>{formatCurrency(item.detalleHorasExtras.hen)} ({item.novedades.horas?.horasExtrasNocturnas || 0} hrs)</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Recargo Nocturno / Dominical:</span>
                                    <span>{formatCurrency(item.detalleHorasExtras.rn + item.detalleHorasExtras.rd)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold text-blue-900 pt-1 border-t">
                                    <span>Ingreso Base Cotización (IBC):</span>
                                    <span>{formatCurrency(item.totalDevengadoSalarial)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Employer Contributions (Patronal) */}
                              <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <h5 className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-1">
                                  Aportes Seguridad Social & Parafiscales Empresa
                                </h5>
                                <div className="space-y-1 text-slate-600">
                                  <div className="flex justify-between">
                                    <span>Salud Patronal (8.5%):</span>
                                    <span>{item.aporteSaludEmpresa > 0 ? formatCurrency(item.aporteSaludEmpresa) : 'Exento (Art 114-1)'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Pensión Patronal (12%):</span>
                                    <span>{formatCurrency(item.aportePensionEmpresa)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>ARL Nivel {item.employee.nivelRiesgoARL}:</span>
                                    <span>{formatCurrency(item.aporteARLEmpresa)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Caja de Compensación (4%):</span>
                                    <span>{formatCurrency(item.aporteCajaCompensacion)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t">
                                    <span>Total Aportes Patronales:</span>
                                    <span>{formatCurrency(item.totalSeguridadSocialEmpresa + item.totalParafiscalesEmpresa)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Provisions */}
                              <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <h5 className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-1">
                                  Provisiones Prestaciones Sociales
                                </h5>
                                <div className="space-y-1 text-slate-600">
                                  <div className="flex justify-between">
                                    <span>Prima de Servicios (8.33%):</span>
                                    <span>{formatCurrency(item.provisionPrima)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Cesantías (8.33%):</span>
                                    <span>{formatCurrency(item.provisionCesantias)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Intereses s/ Cesantías (1%):</span>
                                    <span>{formatCurrency(item.provisionInteresesCesantias)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Vacaciones (4.17%):</span>
                                    <span>{formatCurrency(item.provisionVacaciones)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t">
                                    <span>Total Provisiones Mensuales:</span>
                                    <span>{formatCurrency(item.totalProvisionesEmpresa)}</span>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Footer Totals */}
            <tfoot className="bg-slate-900 text-white font-bold">
              <tr>
                <td colSpan={7} className="px-3 py-3 text-right">TOTALES DEL PERÍODO ({filteredItems.length} EMPLEADOS):</td>
                <td className="px-3 py-3 text-right text-blue-300 font-extrabold">{formatCurrency(totalDevengado)}</td>
                <td colSpan={3} className="px-3 py-3"></td>
                <td className="px-3 py-3 text-right text-rose-300 font-extrabold">{formatCurrency(totalDeducciones)}</td>
                <td className="px-3 py-3 text-right text-emerald-400 font-extrabold text-sm">{formatCurrency(totalNeto)}</td>
                <td className="px-3 py-3 text-right text-white font-extrabold">{formatCurrency(totalCosto)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
