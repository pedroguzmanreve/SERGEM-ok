import React, { useState } from 'react';
import {
  Phone,
  MessageCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  RotateCw
} from 'lucide-react';
import {
  Employee,
  WeeklySchedule,
  DriverAttendanceRecord,
  ClientOrderReport,
  DriverShiftAttendanceStatus
} from '../types/payroll';
import {
  evaluateDriverAttendance,
  DAYS_SPANISH,
  getCurrentDateTimeInfo
} from '../utils/attendanceService';

interface UnconnectedDriversSectionProps {
  employees: Employee[];
  schedules: WeeklySchedule[];
  attendanceRecords: DriverAttendanceRecord[];
  clientReports: ClientOrderReport[];
  jefeZonaId?: string;
  title?: string;
  subtitle?: string;
  variant?: 'chief-portal' | 'admin-notification';
  onQuickRecordAttendance?: (driverId: string) => void;
  onOpenNovedadModal?: (driverId: string) => void;
}

export const UnconnectedDriversSection: React.FC<UnconnectedDriversSectionProps> = ({
  employees,
  schedules,
  attendanceRecords,
  clientReports,
  jefeZonaId,
  title,
  subtitle,
  variant = 'chief-portal',
  onQuickRecordAttendance,
  onOpenNovedadModal,
}) => {
  const [selectedDayOverride, setSelectedDayOverride] = useState<
    'HOY' | 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo'
  >('HOY');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const currentInfo = getCurrentDateTimeInfo();
  const effectiveDay =
    selectedDayOverride === 'HOY' ? currentInfo.diaSemana : selectedDayOverride;

  const attendanceData = evaluateDriverAttendance({
    employees,
    schedules,
    attendanceRecords,
    clientReports,
    targetDayOfWeek: effectiveDay,
    jefeZonaId,
  });

  const {
    unconnectedDrivers,
    connectedDrivers,
    totalScheduledCount,
    totalUnconnectedCount,
    currentTimeFormatted,
  } = attendanceData;

  const handleCopyPhone = (empId: string, phone?: string) => {
    if (!phone) return;
    navigator.clipboard?.writeText(phone);
    setCopiedPhoneId(empId);
    setTimeout(() => setCopiedPhoneId(null), 2500);
  };

  const isWarning = totalUnconnectedCount > 0;

  return (
    <section
      id={`unconnected-drivers-${variant}`}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
        isWarning
          ? 'bg-gradient-to-b from-amber-50/70 via-white to-white border-amber-300 ring-1 ring-amber-400/20'
          : 'bg-gradient-to-b from-emerald-50/60 via-white to-white border-emerald-200'
      }`}
    >
      {/* Top Banner / Header */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100">
        <div className="flex items-start space-x-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              isWarning
                ? 'bg-amber-500 text-white shadow-amber-500/25 ring-2 ring-amber-400/30'
                : 'bg-emerald-600 text-white shadow-emerald-600/25'
            }`}
          >
            {isWarning ? (
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {title ||
                  (variant === 'admin-notification'
                    ? '🔔 Notificación: Repartidores Sin Conectar a su Turno'
                    : '🚨 Repartidores No Conectados a su Turno')}
              </h2>
              {isWarning ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white animate-bounce shadow-xs">
                  {totalUnconnectedCount} {totalUnconnectedCount === 1 ? 'pendiente' : 'pendientes'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Conectados
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {subtitle ||
                (variant === 'admin-notification'
                  ? 'Notificación automática para coordinar con el colaborador por llamada telefónica o WhatsApp.'
                  : 'Monitoreo de inicio de jornada laboral en tiempo real basado en la hora programada.')}
            </p>
          </div>
        </div>

        {/* Status controls & Day selector */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Ref: <strong className="font-bold text-slate-900">{currentTimeFormatted}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              id="day-reference-select"
              aria-label="Seleccionar día de referencia"
              value={selectedDayOverride}
              onChange={(e) => setSelectedDayOverride(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 text-xs cursor-pointer focus:outline-none"
            >
              <option value="HOY">Hoy ({currentInfo.diaSemana})</option>
              {DAYS_SPANISH.filter((d) => d !== 'Domingo').map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            title={isExpanded ? 'Contraer panel' : 'Expandir panel'}
            aria-label="Alternar visibilidad del panel"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="bg-slate-50/80 px-4 sm:px-5 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 text-slate-600 flex-wrap font-medium">
          <span>
            Turnos programados hoy: <strong className="text-slate-900 font-bold">{totalScheduledCount}</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 font-semibold">
            Iniciaron turno: <strong className="font-bold">{connectedDrivers.length}</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span className={totalUnconnectedCount > 0 ? 'text-amber-800 font-bold' : 'text-slate-600'}>
            Sin conectar: <strong className="font-black text-amber-700">{totalUnconnectedCount}</strong>
          </span>
        </div>

        <div className="text-[11px] text-slate-500 italic">
          Día evaluado: <strong className="text-slate-800 not-italic font-bold">{effectiveDay}</strong>
        </div>
      </div>

      {/* Card Content */}
      {isExpanded && (
        <div className="p-4 sm:p-5">
          {totalUnconnectedCount === 0 ? (
            <div className="py-6 px-4 text-center rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-emerald-900">
                ¡Todos los repartidores programados para este día se encuentran conectados!
              </h3>
              <p className="text-xs text-emerald-700 max-w-md">
                No hay novedades de inasistencia o desconexión para la hora actual ({currentTimeFormatted}).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-amber-900 flex items-center justify-between">
                <span>
                  Colaboradores que debían haber iniciado turno y aún no registran conexión:
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Clic en los botones para llamar o enviar mensaje directo
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {unconnectedDrivers.map((item) => {
                  const emp = item.employee;
                  const shift = item.scheduledShift;
                  const phoneFormatted = emp.telefono || 'Sin registrar';

                  return (
                    <div
                      key={emp.id}
                      id={`unconnected-card-${emp.id}`}
                      className="bg-white rounded-xl border border-amber-200/90 p-4 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group"
                    >
                      {/* Top Accent Strip */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-red-500" />

                      {/* Header Driver Info */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 flex items-center justify-center font-black text-sm border border-amber-300 shrink-0 shadow-2xs">
                              {emp.nombre.charAt(0)}
                              {emp.apellido.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                                {emp.nombre} {emp.apellido}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium">
                                CC: {emp.cedula} • {emp.cargo}
                              </p>
                              {emp.placaVehiculo && (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  <Truck className="w-3 h-3 text-slate-500" /> {emp.placaVehiculo}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Delay Badge */}
                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-red-100 text-red-800 border border-red-200 shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              {item.delayFormatted}
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">
                              Inicio: {item.scheduledStartTime}
                            </span>
                          </div>
                        </div>

                        {/* Shift & Client details */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                          <div className="flex items-center space-x-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-bold text-slate-800 truncate max-w-[200px]" title={item.clienteNombre}>
                              {item.clienteNombre}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            Turno: <strong className="text-slate-700 font-semibold">{shift.tipo}</strong>
                            {shift.horaFin1 && ` (${shift.horaInicio1} - ${shift.horaFin1})`}
                          </div>
                        </div>
                      </div>

                      {/* Contact Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                        {/* Call Button */}
                        <a
                          href={item.callUrl}
                          id={`btn-call-${emp.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200/90 transition-colors shadow-2xs cursor-pointer"
                          title={`Llamar a ${emp.nombre} (${phoneFormatted})`}
                        >
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          <span>Llamar ({phoneFormatted})</span>
                        </a>

                        {/* WhatsApp Button */}
                        <a
                          href={item.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          id={`btn-whatsapp-${emp.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 border border-emerald-700 transition-colors shadow-xs hover:shadow-sm cursor-pointer"
                          title={`Escribir a WhatsApp de ${emp.nombre} (${phoneFormatted})`}
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-white" />
                          <span>Escribir por WhatsApp</span>
                        </a>
                      </div>

                      {/* Quick Secondary Options (Quick connect or novelties) */}
                      {(onQuickRecordAttendance || onOpenNovedadModal) && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(emp.id, emp.telefono)}
                            className="text-slate-500 hover:text-slate-800 underline decoration-slate-300 cursor-pointer"
                          >
                            {copiedPhoneId === emp.id ? '¡Número copiado!' : 'Copiar número'}
                          </button>

                          <div className="flex items-center gap-2">
                            {onOpenNovedadModal && (
                              <button
                                type="button"
                                onClick={() => onOpenNovedadModal(emp.id)}
                                className="text-amber-800 hover:text-amber-950 font-semibold cursor-pointer"
                              >
                                Registrar Novedad
                              </button>
                            )}
                            {onQuickRecordAttendance && (
                              <button
                                type="button"
                                onClick={() => onQuickRecordAttendance(emp.id)}
                                className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                                title="Marcar como conectado manualmente si el repartidor confirmó por teléfono"
                              >
                                Confirmar Conexión
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
