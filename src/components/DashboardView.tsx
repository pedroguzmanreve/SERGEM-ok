import React from 'react';
import { PayrollCalculationItem, PayrollPeriod } from '../types/payroll';
import { formatCurrency } from '../utils/payrollCalculator';
import { DollarSign, Users, TrendingUp, ShieldAlert, PieChart as PieChartIcon, Building, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

interface DashboardViewProps {
  items: PayrollCalculationItem[];
  period: PayrollPeriod;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const DashboardView: React.FC<DashboardViewProps> = ({ items, period }) => {
  // Aggregate KPIs
  const totalDevengados = items.reduce((acc, i) => acc + i.totalDevengado, 0);
  const totalDeducciones = items.reduce((acc, i) => acc + i.totalDeducciones, 0);
  const totalNetoPagar = items.reduce((acc, i) => acc + i.netoAPagar, 0);
  const totalSeguridadSocialEmpresa = items.reduce((acc, i) => acc + i.totalSeguridadSocialEmpresa, 0);
  const totalParafiscalesEmpresa = items.reduce((acc, i) => acc + i.totalParafiscalesEmpresa, 0);
  const totalProvisionesEmpresa = items.reduce((acc, i) => acc + i.totalProvisionesEmpresa, 0);
  const totalCostoEmpresa = items.reduce((acc, i) => acc + i.costoTotalEmpresa, 0);
  const totalHorasExtras = items.reduce((acc, i) => acc + i.totalHorasExtrasYRecargos, 0);
  const totalAuxilioTransporte = items.reduce((acc, i) => acc + i.auxilioTransporte, 0);

  // Percentage of extra employer load
  const porcentajeCargaPatronal = totalDevengados > 0 
    ? (((totalCostoEmpresa - totalDevengados) / totalDevengados) * 100).toFixed(1)
    : '0';

  // Cost by Department for Bar Chart
  const departmentCostsMap: Record<string, { devengado: number; costoEmpresa: number; count: number }> = {};
  items.forEach(item => {
    const dept = item.employee.departamento;
    if (!departmentCostsMap[dept]) {
      departmentCostsMap[dept] = { devengado: 0, costoEmpresa: 0, count: 0 };
    }
    departmentCostsMap[dept].devengado += item.totalDevengado;
    departmentCostsMap[dept].costoEmpresa += item.costoTotalEmpresa;
    departmentCostsMap[dept].count += 1;
  });

  const departmentChartData = Object.keys(departmentCostsMap).map(dept => ({
    departamento: dept.replace(' y ', ' & '),
    Devengado: departmentCostsMap[dept].devengado,
    'Costo Total': departmentCostsMap[dept].costoEmpresa,
    Empleados: departmentCostsMap[dept].count,
  }));

  // Cost Distribution Donut Data
  const costDistributionData = [
    { name: 'Sueldos y Horas Extras', value: totalDevengados - totalAuxilioTransporte },
    { name: 'Auxilio de Transporte', value: totalAuxilioTransporte },
    { name: 'Seguridad Social Patronal', value: totalSeguridadSocialEmpresa },
    { name: 'Parafiscales (Sena, ICBF, Caja)', value: totalParafiscalesEmpresa },
    { name: 'Provisiones Prestaciones', value: totalProvisionesEmpresa },
  ].filter(d => d.value > 0);

  return (
    <div id="dashboard-view" className="space-y-6 pb-8">
      
      {/* Banner info - Light Slate Grey Premium Design */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/60 text-slate-900 rounded-2xl p-7 md:p-8 shadow-xs border border-slate-300/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-white border border-slate-300/80 text-red-700 font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-2xs">
            <Building className="w-4 h-4 text-red-600" />
            <span>Resumen Ejecutivo de Nómina SERGEM S.A.S.</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">{period.nombrePeriodo}</h2>
          <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
            Período del {period.fechaInicio} al {period.fechaFin} • Liquidación {period.tipoPeriodo} ({period.diasBasePeriodo} Días)
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-300/90 shadow-2xs flex items-center space-x-3.5 shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Costo Total Empresa</div>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{formatCurrency(totalCostoEmpresa)}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Neto a Pagar */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Neto a Pagar Empleados</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalNetoPagar)}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 mr-1" />
              Giro directo a cuentas bancarias
            </p>
          </div>
        </div>

        {/* Total Devengados */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Devengado Bruto</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalDevengados)}</div>
            <p className="text-xs text-slate-500 mt-1">
              Incluye {formatCurrency(totalHorasExtras)} en Horas Extras/Recargos
            </p>
          </div>
        </div>

        {/* Total Deducciones */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deducciones Trabajador</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalDeducciones)}</div>
            <p className="text-xs text-slate-500 mt-1">
              Salud, Pensión, FSP y Retenciones
            </p>
          </div>
        </div>

        {/* Carga Prestacional % */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Factor Carga Patronal</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <PieChartIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">+{porcentajeCargaPatronal}%</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5 text-purple-600 mr-1" />
              Sobre el devengado salarial
            </p>
          </div>
        </div>

      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Cost Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Costo de Nómina por Departamento</h3>
              <p className="text-xs text-slate-500">Comparativo entre Devengado Directo y Costo Total Empresa</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="departamento" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number | string | undefined) => [formatCurrency(Number(value || 0)), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                <Bar dataKey="Devengado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Costo Total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Distribution Donut Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Composición del Costo Total</h3>
            <p className="text-xs text-slate-500">Distribución porcentual de la carga laboral</p>
          </div>
          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {costDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number | string | undefined) => formatCurrency(Number(val || 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 text-xs">
            {costDistributionData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center justify-between">
                <span className="flex items-center text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  {entry.name}
                </span>
                <span className="font-semibold text-slate-900">{formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Summary Table by Department */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Consolidado por Áreas Operativas - SERGEM S.A.S.
          </h3>
          <span className="text-xs text-slate-500">{items.length} empleados procesados</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100/70 text-slate-700 font-semibold text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Departamento</th>
                <th className="px-4 py-3 text-center">Empleados</th>
                <th className="px-4 py-3 text-right">Total Devengado</th>
                <th className="px-4 py-3 text-right">Total Deducciones</th>
                <th className="px-4 py-3 text-right">Neto a Pagar</th>
                <th className="px-4 py-3 text-right">Costo Empresa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {Object.keys(departmentCostsMap).map((dept) => {
                const deptItems = items.filter(i => i.employee.departamento === dept);
                const dev = deptItems.reduce((a, b) => a + b.totalDevengado, 0);
                const ded = deptItems.reduce((a, b) => a + b.totalDeducciones, 0);
                const net = deptItems.reduce((a, b) => a + b.netoAPagar, 0);
                const cost = deptItems.reduce((a, b) => a + b.costoTotalEmpresa, 0);

                return (
                  <tr key={dept} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{dept}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {deptItems.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(dev)}</td>
                    <td className="px-4 py-3 text-right text-rose-600">{formatCurrency(ded)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(net)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(cost)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold">
              <tr>
                <td className="px-4 py-3">TOTALES CONSOLIDADOS</td>
                <td className="px-4 py-3 text-center">{items.length}</td>
                <td className="px-4 py-3 text-right text-blue-300">{formatCurrency(totalDevengados)}</td>
                <td className="px-4 py-3 text-right text-rose-300">{formatCurrency(totalDeducciones)}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(totalNetoPagar)}</td>
                <td className="px-4 py-3 text-right text-white">{formatCurrency(totalCostoEmpresa)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
