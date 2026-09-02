import React, { useState } from 'react';
import { Employee, EmployeeNovedades } from '../types/payroll';
import { X, Clock, DollarSign, Calendar, Save, ClipboardList } from 'lucide-react';

interface NovedadesModalProps {
  employee: Employee;
  novedades: EmployeeNovedades;
  onSave: (employeeId: string, updatedNovedades: EmployeeNovedades) => void;
  onClose: () => void;
}

export const NovedadesModal: React.FC<NovedadesModalProps> = ({
  employee,
  novedades,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<EmployeeNovedades>({ ...novedades });

  const handleChange = (field: keyof EmployeeNovedades, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleHorasChange = (horaField: keyof EmployeeNovedades['horas'], value: number) => {
    setFormData((prev) => ({
      ...prev,
      horas: {
        ...prev.horas,
        [horaField]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(employee.id, formData);
  };

  return (
    <div id="novedades-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-slate-50 text-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 border border-red-200/80 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Reporte de Novedades del Período</span>
              <h3 className="text-base font-bold text-slate-900">{employee.nombre} {employee.apellido}</h3>
              <p className="text-[11px] text-slate-500 font-medium">C.C. {employee.cedula} • {employee.cargo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          
          {/* Section 1: Días Trabajados */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              <span>Tiempo Laborado</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Días Trabajados en el Período (Máx 15 o 30)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={formData.diasTrabajados}
                  onChange={(e) => handleChange('diasTrabajados', parseInt(e.target.value) || 0)}
                  className="w-full text-xs font-bold font-mono p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Horas Extras y Recargos */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600" />
              <span>Horas Extras y Recargos</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">H.E. Diurna (25%)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.horas.horasExtrasDiurnas}
                  onChange={(e) => handleHorasChange('horasExtrasDiurnas', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">H.E. Nocturna (75%)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.horas.horasExtrasNocturnas}
                  onChange={(e) => handleHorasChange('horasExtrasNocturnas', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">H.E. Dom. Diurna (100%)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.horas.horasExtrasDominicalesDiurnas}
                  onChange={(e) => handleHorasChange('horasExtrasDominicalesDiurnas', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Recargo Nocturno (35%)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.horas.horasRecargoNocturno}
                  onChange={(e) => handleHorasChange('horasRecargoNocturno', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Recargo Dominical (75%)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.horas.horasRecargoDominical}
                  onChange={(e) => handleHorasChange('horasRecargoDominical', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Devengados Adicionales */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Comisiones y Bonificaciones</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Comisiones (Salarial)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.comisiones}
                  onChange={(e) => handleChange('comisiones', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Bonificación No Salarial / Rodamiento</label>
                <input
                  type="number"
                  min="0"
                  value={formData.bonificacionesNoConstitutivas}
                  onChange={(e) => handleChange('bonificacionesNoConstitutivas', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Deducciones Especiales */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 mb-3">Deducciones Adicionales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Préstamos / Anticipos ($ COP)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.prestamosYDeducciones}
                  onChange={(e) => handleChange('prestamosYDeducciones', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-rose-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Otras Deducciones ($ COP)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.otrasDeducciones}
                  onChange={(e) => handleChange('otrasDeducciones', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-rose-700"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Guardar y Recalcular</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
