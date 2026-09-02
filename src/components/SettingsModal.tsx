import React, { useState } from 'react';
import { CompanySettings } from '../types/payroll';
import { X, Save, Building, DollarSign, Clock, Compass, Package, Settings2, Sparkles, CheckCircle2, Database, Key, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { getStoredSupabaseUrl, getStoredSupabaseAnonKey, saveSupabaseCredentials, checkSupabaseConnection, isSupabaseConfigured } from '../lib/supabase';

interface SettingsModalProps {
  company: CompanySettings;
  onSave: (updatedCompany: CompanySettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  company,
  onSave,
  onClose,
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState(getStoredSupabaseUrl());
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(getStoredSupabaseAnonKey());
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  const [formData, setFormData] = useState<CompanySettings>({
    ...company,
    jornadaMaximaSemanal: company.jornadaMaximaSemanal || 42,
    jornadaDiariaBase: company.jornadaDiariaBase || 7,
    tarifasGeneralesClientes: {
      tarifaBasePaquete: company.tarifasGeneralesClientes?.tarifaBasePaquete || 4500,
      tarifaHoraOrdinaria: company.tarifasGeneralesClientes?.tarifaHoraOrdinaria || 14500,
      tarifaHoraExtraDiurna: company.tarifasGeneralesClientes?.tarifaHoraExtraDiurna || 18125,
      tarifaHoraExtraNocturna: company.tarifasGeneralesClientes?.tarifaHoraExtraNocturna || 25375,
      tarifaSalidaFueraPerimetro: company.tarifasGeneralesClientes?.tarifaSalidaFueraPerimetro || 22000,
      tarifaRecargoDominical: company.tarifasGeneralesClientes?.tarifaRecargoDominical || 25375,
      tarifaRecargoNocturno: company.tarifasGeneralesClientes?.tarifaRecargoNocturno || 5075,
    },
  });

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setTestResult(null);
    const res = await checkSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setTestResult(res);
    setIsTestingSupabase(false);
  };

  const handleChange = (field: keyof CompanySettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClientTariffChange = (field: keyof typeof formData.tarifasGeneralesClientes, value: number) => {
    setFormData((prev) => ({
      ...prev,
      tarifasGeneralesClientes: {
        ...prev.tarifasGeneralesClientes,
        [field]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    onSave(formData);
    onClose();
  };

  return (
    <div id="settings-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-50 text-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 border border-red-200/80 flex items-center justify-center">
              <Settings2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Configuración del Sistema SERGEM</h3>
              <p className="text-[11px] text-slate-500 font-medium">Jornada laboral, salarios vigentes, tarifas clientes y parámetros corporativos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs overflow-y-auto">
          
          {/* REQUERIMIENTO: CONEXIÓN A SUPABASE */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-700 shadow-md space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Conexión a Base de Datos Supabase (Producción)</h4>
                  <p className="text-[11px] text-slate-400">Ingresa la Project URL y la Publishable/Anon Key para persistir en tiempo real</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                supabaseUrl && supabaseAnonKey
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {supabaseUrl && supabaseAnonKey ? 'Configurado' : 'Pendiente'}
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <span>Supabase Project URL</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Ej: https://usvxopzgpqjlrruhznmg.supabase.co)</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://[project-ref].supabase.co"
                    className="w-full p-2.5 bg-slate-950/80 border border-slate-700 rounded-xl font-mono text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Supabase Publishable Key / Anon Key</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Project API Keys &gt; anon public)</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full p-2.5 bg-slate-950/80 border border-slate-700 rounded-xl font-mono text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-200'
                  : 'bg-red-950/60 border-red-600/60 text-red-200'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className="font-medium">{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">
                Al guardar, las credenciales quedan almacenadas de forma segura y se activará la sincronización en vivo.
              </span>
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={isTestingSupabase || !supabaseUrl.trim()}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isTestingSupabase ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Probando...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Probar Conexión (Ping)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* REQUERIMIENTO: MODIFICACIÓN DE JORNADA LABORAL */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-purple-950 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-700" />
                <span>Configuración de Jornada Laboral (Ley 2101 de 2021)</span>
              </h4>
              <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-md">
                Tope Legal 2026: 42h Semanales
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jornada Laboral Máxima Semanal (Horas) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={36}
                    max={48}
                    step={1}
                    value={formData.jornadaMaximaSemanal}
                    onChange={(e) => handleChange('jornadaMaximaSemanal', parseInt(e.target.value) || 42)}
                    className="w-full p-2.5 border border-purple-300 rounded-xl bg-white font-mono font-bold text-xs text-purple-950 focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-purple-600">
                    hrs / semana
                  </span>
                </div>
                <p className="text-[10px] text-purple-700 mt-1">
                  Base legal para cálculo del valor de la hora ordinaria y activación de horas extras.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jornada Diaria Base (Horas por Turno) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={4}
                    max={10}
                    step={0.5}
                    value={formData.jornadaDiariaBase}
                    onChange={(e) => handleChange('jornadaDiariaBase', parseFloat(e.target.value) || 7)}
                    className="w-full p-2.5 border border-purple-300 rounded-xl bg-white font-mono font-bold text-xs text-purple-950 focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-purple-600">
                    hrs / día
                  </span>
                </div>
                <p className="text-[10px] text-purple-700 mt-1">
                  Tope diario estándar para distribución de turnos antes de extras diurnas.
                </p>
              </div>
            </div>
          </div>

          {/* REQUERIMIENTO: MODIFICACIÓN DE SUELDO Y VALORES LEGALES */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3">
            <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Sueldos y Parámetros Salariales Vigentes (Colombia 2026)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Salario Mínimo Legal Vigente (SMMLV) ($ COP) *
                </label>
                <input
                  type="number"
                  value={formData.smmlv}
                  onChange={(e) => handleChange('smmlv', parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-emerald-300 rounded-xl font-mono font-bold text-xs bg-white text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-emerald-700 block mt-1">
                  Referencia 2026: $1.423.500 COP
                </span>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Auxilio de Transporte Mensual ($ COP) *
                </label>
                <input
                  type="number"
                  value={formData.auxilioTransporteMensual}
                  onChange={(e) => handleChange('auxilioTransporteMensual', parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-emerald-300 rounded-xl font-mono font-bold text-xs bg-white text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-emerald-700 block mt-1">
                  Aplica para devengados hasta 2 SMMLV ($200.000 COP)
                </span>
              </div>
            </div>
          </div>

          {/* REQUERIMIENTO: MODIFICACIÓN DE TARIFAS PARA LOS CLIENTES */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-700" />
                <span>Tarifas Generales de Facturación para Clientes ($ COP)</span>
              </h4>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                Tarifario SERGEM
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tarifa Salida Fuera Perímetro */}
              <div className="bg-amber-100/70 p-2.5 rounded-xl border border-amber-300/90 sm:col-span-3">
                <label className="block font-black text-amber-950 mb-1 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-700" />
                  <span>Tarifa por Salida Fuera del Perímetro Urbano ($ COP) *</span>
                </label>
                <input
                  type="number"
                  value={formData.tarifasGeneralesClientes.tarifaSalidaFueraPerimetro}
                  onChange={(e) => handleClientTariffChange('tarifaSalidaFueraPerimetro', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-amber-400 rounded-lg bg-white font-mono font-black text-sm text-amber-950 focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-amber-800 mt-1 font-semibold">
                  Monto estándar facturado y liquidado por cada viaje/salida a municipios fuera del perímetro de Cali (ej. Yumbo, Jamundí, Palmira, Candelaria).
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tarifa Base por Paquete ($)</label>
                <input
                  type="number"
                  value={formData.tarifasGeneralesClientes.tarifaBasePaquete}
                  onChange={(e) => handleClientTariffChange('tarifaBasePaquete', parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hora Ordinaria Cliente ($)</label>
                <input
                  type="number"
                  value={formData.tarifasGeneralesClientes.tarifaHoraOrdinaria}
                  onChange={(e) => handleClientTariffChange('tarifaHoraOrdinaria', parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Extra Diurna (+25%) ($)</label>
                <input
                  type="number"
                  value={formData.tarifasGeneralesClientes.tarifaHoraExtraDiurna}
                  onChange={(e) => handleClientTariffChange('tarifaHoraExtraDiurna', parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Extra Nocturna (+75%) ($)</label>
                <input
                  type="number"
                  value={formData.tarifasGeneralesClientes.tarifaHoraExtraNocturna}
                  onChange={(e) => handleClientTariffChange('tarifaHoraExtraNocturna', parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Recargo Dominical/Festivo ($)</label>
                <input
                  type="number"
                  value={formData.tarifasGeneralesClientes.tarifaRecargoDominical}
                  onChange={(e) => handleClientTariffChange('tarifaRecargoDominical', parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Recargo Nocturno ($)</label>
                <input
                  type="number"
                  value={formData.tarifasGeneralesClientes.tarifaRecargoNocturno}
                  onChange={(e) => handleClientTariffChange('tarifaRecargoNocturno', parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Company Corporate Data */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Building className="w-4 h-4 text-red-600" />
              <span>Datos Corporativos de SERGEM</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Razón Social</label>
                <input
                  type="text"
                  value={formData.nombreEmpresa}
                  onChange={(e) => handleChange('nombreEmpresa', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">NIT</label>
                <input
                  type="text"
                  value={formData.nit}
                  onChange={(e) => handleChange('nit', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs font-bold focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección Principal</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => handleChange('direccion', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Teléfonos y PBX</label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) => handleChange('telefono', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* Exemption Checkbox */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="pr-4">
              <span className="font-bold text-slate-900 block text-xs">Exención Art. 114-1 Estatuto Tributario</span>
              <span className="text-[11px] text-slate-500">Exime a la empresa de aportes a Salud Patronal (8.5%), Sena (2%) e ICBF (3%) para devengados &lt; 10 SMMLV.</span>
            </div>
            <input
              type="checkbox"
              checked={formData.aplicaExencionArt114}
              onChange={(e) => handleChange('aplicaExencionArt114', e.target.checked)}
              className="w-5 h-5 text-red-600 rounded-md cursor-pointer accent-red-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
