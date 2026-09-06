import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
  Building2,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  Employee,
  WeeklySchedule,
  DriverAttendanceRecord,
  ClientOrderReport
} from '../types/payroll';
import {
  evaluateDriverAttendance,
  getCurrentDateTimeInfo
} from '../utils/attendanceService';

interface AdminAttendanceNotificationProps {
  employees: Employee[];
  schedules: WeeklySchedule[];
  attendanceRecords: DriverAttendanceRecord[];
  clientReports: ClientOrderReport[];
  onNavigateToPortal?: (portal: 'admin-portal' | 'zone-chief') => void;
}

export const AdminAttendanceNotification: React.FC<AdminAttendanceNotificationProps> = ({
  employees,
  schedules,
  attendanceRecords,
  clientReports,
  onNavigateToPortal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentInfo = getCurrentDateTimeInfo();
  const { unconnectedDrivers, totalUnconnectedCount } = evaluateDriverAttendance({
    employees,
    schedules,
    attendanceRecords,
    clientReports,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasUnconnected = totalUnconnectedCount > 0;

  return (
    <div className="relative" ref={containerRef} id="admin-attendance-notification-wrapper">
      {/* Bell Trigger Button */}
      <button
        id="btn-attendance-notification-bell"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer ${
          hasUnconnected
            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
        }`}
        title={
          hasUnconnected
            ? `Atención: ${totalUnconnectedCount} repartidores no han iniciado turno hoy`
            : 'Sin alertas de inasistencia hoy'
        }
        aria-label="Ver notificaciones de asistencia de repartidores"
      >
        <Bell className={`w-5 h-5 ${hasUnconnected ? 'text-amber-600 animate-wiggle' : 'text-slate-500'}`} />

        {/* Animated Badge */}
        {hasUnconnected && (
          <span
            id="attendance-notification-badge"
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-xs animate-pulse"
          >
            {totalUnconnectedCount}
          </span>
        )}
      </button>

      {/* Dropdown Floating Card */}
      {isOpen && (
        <div
          id="attendance-notification-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div
            className={`p-3.5 border-b flex items-center justify-between ${
              hasUnconnected
                ? 'bg-gradient-to-r from-amber-50 to-red-50 border-amber-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  hasUnconnected ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {hasUnconnected ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 leading-tight">
                  {hasUnconnected
                    ? `${totalUnconnectedCount} ${
                        totalUnconnectedCount === 1
                          ? 'Repartidor Sin Conectar'
                          : 'Repartidores Sin Conectar'
                      }`
                    : 'Asistencia al 100%'}
                </h3>
                <p className="text-[10px] text-slate-500">
                  Hoy {currentInfo.diaSemana} • {currentInfo.horaActual}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
              aria-label="Cerrar notificaciones"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-2">
            {!hasUnconnected ? (
              <div className="py-6 px-4 text-center">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-800">Turnos iniciados puntualmente</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Todos los repartidores programados para hoy se encuentran conectados.
                </p>
              </div>
            ) : (
              unconnectedDrivers.map((item) => {
                const emp = item.employee;
                return (
                  <div
                    key={emp.id}
                    className="p-2.5 rounded-xl hover:bg-amber-50/50 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-900">
                          {emp.nombre} {emp.apellido}
                        </h4>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[170px]">{item.clienteNombre}</span>
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 shrink-0">
                        <Clock className="w-3 h-3 text-red-600" />
                        {item.delayFormatted}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-600 flex items-center justify-between">
                      <span>Hora programada: <strong>{item.scheduledStartTime}</strong></span>
                      <span className="font-mono text-slate-500">{emp.telefono || 'Sin tel'}</span>
                    </div>

                    {/* Quick Call and WhatsApp Action Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <a
                        href={item.callUrl}
                        className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                        title={`Llamar a ${emp.nombre}`}
                      >
                        <Phone className="w-3 h-3 text-blue-600" />
                        <span>Llamar</span>
                      </a>

                      <a
                        href={item.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold shadow-2xs transition-colors cursor-pointer"
                        title={`Escribir WhatsApp a ${emp.nombre}`}
                      >
                        <MessageCircle className="w-3 h-3 text-white" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Navigation */}
          {hasUnconnected && onNavigateToPortal && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToPortal('admin-portal');
                }}
                className="text-xs text-red-700 hover:text-red-800 font-bold hover:underline cursor-pointer"
              >
                Ver panel completo en Portal Administración →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
