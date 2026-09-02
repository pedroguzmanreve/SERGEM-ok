import React, { useState } from 'react';
import { PayrollPeriod } from '../types/payroll';
import { Calendar, Plus, X } from 'lucide-react';

interface NewPeriodModalProps {
  onAddPeriod: (period: PayrollPeriod) => void;
  onClose: () => void;
}

export const NewPeriodModal: React.FC<NewPeriodModalProps> = ({ onAddPeriod, onClose }) => {
  const [nombre, setNombre] = useState('1ra Quincena Agosto 2026');
  const [fechaInicio, setFechaInicio] = useState('2026-08-01');
  const [fechaFin, setFechaFin] = useState('2026-08-15');
  const [tipoPeriodo, setTipoPeriodo] = useState<'Quincenal' | 'Mensual'>('Quincenal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPeriod: PayrollPeriod = {
      id: `PER-${Date.now()}`,
      nombrePeriodo: nombre,
      fechaInicio,
      fechaFin,
      tipoPeriodo,
      diasBasePeriodo: tipoPeriodo === 'Quincenal' ? 15 : 30,
      estado: 'Borrador',
      fechaLiquidacion: new Date().toISOString().slice(0, 10),
    };
    onAddPeriod(newPeriod);
    onClose();
  };

  return (
    <div id="new-period-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 text-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 border border-red-200/80 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Crear Período de Nómina</h3>
              <p className="text-[11px] text-slate-500 font-medium">Definir fechas de liquidación y tipo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nombre del Período *</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fecha Inicio *</label>
              <input
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fecha Fin *</label>
              <input
                type="date"
                required
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tipo de Período</label>
            <select
              value={tipoPeriodo}
              onChange={(e) => setTipoPeriodo(e.target.value as any)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="Quincenal">Quincenal (15 días base)</option>
              <option value="Mensual">Mensual (30 días base)</option>
            </select>
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
              className="px-5 py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Período</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
