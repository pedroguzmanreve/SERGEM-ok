import React, { useState } from 'react';
import { CompanySettings } from '../types/payroll';
import { X, Save, Building, DollarSign, Shield, Settings2 } from 'lucide-react';

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
  const [formData, setFormData] = useState<CompanySettings>({ ...company });

  const handleChange = (field: keyof CompanySettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleARLChange = (level: 1 | 2 | 3 | 4 | 5, value: number) => {
    setFormData((prev) => ({
      ...prev,
      tarifasARL: {
        ...prev.tarifasARL,
        [level]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div id="settings-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl border border-slate-200 overflow-hidden my-8">
        
        <div className="bg-slate-50 text-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 border border-red-200/80 flex items-center justify-center">
              <Settings2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Parámetros Legales & Empresa</h3>
              <p className="text-[11px] text-slate-500 font-medium">Configuración de nómina, SMMLV y datos corporativos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          
          {/* Company Data */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Building className="w-4 h-4 text-red-600" />
              <span>Datos de la Empresa</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Razón Social</label>
                <input
                  type="text"
                  value={formData.nombreEmpresa}
                  onChange={(e) => handleChange('nombreEmpresa', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">NIT</label>
                <input
                  type="text"
                  value={formData.nit}
                  onChange={(e) => handleChange('nit', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección Principal</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => handleChange('direccion', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Teléfonos de Contacto</label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) => handleChange('telefono', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Legal Standards (SMMLV & Transport) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Valores Legales Vigentes (Colombia 2026)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">SMMLV ($ COP)</label>
                <input
                  type="number"
                  value={formData.smmlv}
                  onChange={(e) => handleChange('smmlv', parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-xs bg-white text-emerald-700 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Auxilio de Transporte Mensual ($ COP)</label>
                <input
                  type="number"
                  value={formData.auxilioTransporteMensual}
                  onChange={(e) => handleChange('auxilioTransporteMensual', parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-xs bg-white text-emerald-700 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Exemption checkbox */}
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
              Guardar Configuración
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
