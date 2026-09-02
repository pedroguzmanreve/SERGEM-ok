import React, { useState } from 'react';
import { CompanySettings, Employee, EmployeeNovedades, RiskLevel } from '../types/payroll';
import { calculatePayrollItem, formatCurrency } from '../utils/payrollCalculator';
import { Calculator, ShieldCheck, DollarSign, ArrowRight, Info } from 'lucide-react';

interface SimulatorViewProps {
  settings: CompanySettings;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({ settings }) => {
  const [salario, setSalario] = useState<number>(2000000);
  const [dias, setDias] = useState<number>(30);
  const [riesgo, setRiesgo] = useState<RiskLevel>(3);
  const [horasExtrasDiurnas, setHorasExtrasDiurnas] = useState<number>(0);
  const [bonoNoSalarial, setBonoNoSalarial] = useState<number>(0);

  // Simulated employee
  const simEmployee: Employee = {
    id: 'SIM-01',
    cedula: '1234567890',
    nombre: 'Empleado',
    apellido: 'Simulado',
    cargo: 'Cargo de Prueba',
    departamento: 'Operaciones y Mensajería',
    salarioBase: salario,
    tipoContrato: 'Término Indefinido',
    nivelRiesgoARL: riesgo,
    fechaIngreso: '2026-01-01',
    banco: 'Bancolombia',
    tipoCuenta: 'Ahorros',
    numeroCuenta: '0000000000',
    eps: 'Sura EPS',
    afp: 'Protección',
    ccf: 'Comfandi',
    activo: true,
    rol: 'Repartidor',
  };

  const simNovedades: EmployeeNovedades = {
    diasTrabajados: dias,
    horas: {
      horasExtrasDiurnas: horasExtrasDiurnas,
      horasExtrasNocturnas: 0,
      horasExtrasDominicalesDiurnas: 0,
      horasExtrasDominicalesNocturnas: 0,
      horasRecargoNocturno: 0,
      horasRecargoDominical: 0,
    },
    comisiones: 0,
    bonificacionesConstitutivas: 0,
    bonificacionesNoConstitutivas: bonoNoSalarial,
    auxilioNoConstitutivo: 0,
    incapacidadDias: 0,
    incapacidadValor: 0,
    licenciasRemuneradasDias: 0,
    licenciasNoRemuneradasDias: 0,
    prestamosYDeducciones: 0,
    otrasDeducciones: 0,
  };

  const result = calculatePayrollItem(simEmployee, simNovedades, settings, 30);

  return (
    <div id="simulator-view" className="space-y-6 pb-10">
      
      {/* Intro Banner - Light Slate Grey Premium Design */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/60 text-slate-900 rounded-2xl p-7 md:p-8 shadow-xs border border-slate-300/80">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-white border border-slate-300/80 text-red-700 font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-2xs">
            <Calculator className="w-4 h-4 text-red-600" />
            <span>Simulador de Costo Laboral Colombia</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Calculadora de Carga Prestacional & Salario Neto</h2>
          <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
            Estima el valor neto que recibirá el trabajador y el costo real total para SERGEM S.A.S. (Seguridad Social, Parafiscales y Provisiones).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Controls Column */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Parámetros del Cargo</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Salario Básico Mensual ($)</label>
            <input
              type="number"
              step="50000"
              value={salario}
              onChange={(e) => setSalario(parseFloat(e.target.value) || 0)}
              className="w-full text-base font-bold text-emerald-700 p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">SMMLV Vigente: {formatCurrency(settings.smmlv)}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Días Laborados en el Mes</label>
            <input
              type="number"
              min="1"
              max="30"
              value={dias}
              onChange={(e) => setDias(parseInt(e.target.value) || 30)}
              className="w-full text-sm font-semibold p-2 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clase de Riesgo ARL</label>
            <select
              value={riesgo}
              onChange={(e) => setRiesgo(parseInt(e.target.value) as RiskLevel)}
              className="w-full text-sm p-2 border border-slate-300 rounded-xl"
            >
              <option value={1}>Riesgo 1 - Administrativo (0.522%)</option>
              <option value={2}>Riesgo 2 - Operativo bajo (1.044%)</option>
              <option value={3}>Riesgo 3 - Logística/Bodega (2.436%)</option>
              <option value={4}>Riesgo 4 - Mensajería Motorizada (4.350%)</option>
              <option value={5}>Riesgo 5 - Alto Riesgo (6.960%)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Horas Extras Diurnas Estimadas</label>
            <input
              type="number"
              min="0"
              value={horasExtrasDiurnas}
              onChange={(e) => setHorasExtrasDiurnas(parseFloat(e.target.value) || 0)}
              className="w-full text-sm p-2 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Auxilio Rodamiento / No Salarial ($)</label>
            <input
              type="number"
              step="20000"
              value={bonoNoSalarial}
              onChange={(e) => setBonoNoSalarial(parseFloat(e.target.value) || 0)}
              className="w-full text-sm p-2 border border-slate-300 rounded-xl"
            />
          </div>
        </div>

        {/* Results Columns */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-md border border-emerald-800">
              <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider block">Neto a Recibir por el Trabajador</span>
              <span className="text-3xl font-extrabold mt-1 block">{formatCurrency(result.netoAPagar)}</span>
              <p className="text-xs text-emerald-200 mt-2">
                Devengado ({formatCurrency(result.totalDevengado)}) - Deducciones ({formatCurrency(result.totalDeducciones)})
              </p>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800">
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider block">Costo Total Real para SERGEM S.A.S.</span>
              <span className="text-3xl font-extrabold text-blue-200 mt-1 block">{formatCurrency(result.costoTotalEmpresa)}</span>
              <p className="text-xs text-slate-400 mt-2">
                Factor extra: +{(((result.costoTotalEmpresa - result.totalDevengado) / result.totalDevengado) * 100).toFixed(1)}% de carga patronal
              </p>
            </div>

          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-2">Desglose de la Carga Empresarial</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 block text-xs border-b pb-1">Devengados Directos</span>
                <div className="flex justify-between">
                  <span>Sueldo Base:</span>
                  <span>{formatCurrency(result.sueldoTrabajado)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Aux. Transporte:</span>
                  <span>{formatCurrency(result.auxilioTransporte)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Horas Extras:</span>
                  <span>{formatCurrency(result.totalHorasExtrasYRecargos)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t">
                  <span>Total Devengado:</span>
                  <span>{formatCurrency(result.totalDevengado)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 block text-xs border-b pb-1">Aportes Patronales</span>
                <div className="flex justify-between">
                  <span>Pensión (12%):</span>
                  <span>{formatCurrency(result.aportePensionEmpresa)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ARL (Nivel {riesgo}):</span>
                  <span>{formatCurrency(result.aporteARLEmpresa)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Caja Comp. (4%):</span>
                  <span>{formatCurrency(result.aporteCajaCompensacion)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Salud/Sena/ICBF:</span>
                  <span>Exento (Art 114-1)</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t">
                  <span>Subtotal Patronal:</span>
                  <span>{formatCurrency(result.totalSeguridadSocialEmpresa + result.totalParafiscalesEmpresa)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 block text-xs border-b pb-1">Provisiones Prestaciones</span>
                <div className="flex justify-between">
                  <span>Prima (8.33%):</span>
                  <span>{formatCurrency(result.provisionPrima)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cesantías (8.33%):</span>
                  <span>{formatCurrency(result.provisionCesantias)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Int. Cesantías (1%):</span>
                  <span>{formatCurrency(result.provisionInteresesCesantias)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vacaciones (4.17%):</span>
                  <span>{formatCurrency(result.provisionVacaciones)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t">
                  <span>Subtotal Provisiones:</span>
                  <span>{formatCurrency(result.totalProvisionesEmpresa)}</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
