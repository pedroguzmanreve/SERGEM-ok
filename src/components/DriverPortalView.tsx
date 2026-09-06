import React, { useState, useMemo, useEffect } from 'react';
import {
  Employee,
  WeeklySchedule,
  ClientOrderReport,
  DriverAttendanceRecord,
  AppRole,
  AppUserProfile
} from '../types/payroll';
import {
  getCurrentDateTimeInfo,
  buildCallLink,
  buildDriverShiftWhatsAppLink,
  buildDriverToZoneChiefWhatsAppLink
} from '../utils/attendanceService';
import {
  Truck,
  Calendar,
  Camera,
  Play,
  Square,
  CheckCircle2,
  Clock,
  Lock,
  Building2,
  Package,
  DollarSign,
  AlertCircle,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Sun,
  Sunset,
  ArrowRight,
  FileCheck,
  Compass,
  MapPin,
  Phone,
  MessageCircle
} from 'lucide-react';

interface DriverPortalViewProps {
  employees: Employee[];
  schedules: WeeklySchedule[];
  clientReports: ClientOrderReport[];
  attendanceRecords?: DriverAttendanceRecord[];
  onAddClientReport?: (report: ClientOrderReport) => void;
  onRecordAttendance?: (record: DriverAttendanceRecord) => void;
  defaultDriverId?: string;
  currentRole?: AppRole;
  userProfile?: AppUserProfile | null;
}

export const DriverPortalView: React.FC<DriverPortalViewProps> = ({
  employees,
  schedules,
  clientReports,
  attendanceRecords = [],
  onAddClientReport,
  onRecordAttendance,
  defaultDriverId,
  currentRole = 'Repartidor',
  userProfile,
}) => {
  const isRepartidorRole = currentRole === 'Repartidor';

  // Filter employees with Repartidor or Conductor role
  const drivers = useMemo(() => {
    return employees.filter(
      (emp) =>
        emp.activo &&
        (emp.rol === 'Repartidor' ||
          emp.cargo.toLowerCase().includes('repartidor') ||
          emp.cargo.toLowerCase().includes('conductor'))
    );
  }, [employees]);

  // If user is Repartidor, resolve their specific employee record or synthesized profile
  const myRepartidorRecord = useMemo<Employee>(() => {
    const found = employees.find(
      (emp) =>
        (userProfile?.employeeId && emp.id === userProfile.employeeId) ||
        (userProfile?.email && emp.email?.toLowerCase() === userProfile.email.toLowerCase())
    );
    if (found) return found;

    return {
      id: userProfile?.employeeId || defaultDriverId || 'EMP-REP-01',
      cedula: userProfile?.cedula || '1017123456',
      nombre: userProfile?.displayName?.split(' ')[0] || 'Pepito',
      apellido: userProfile?.displayName?.split(' ').slice(1).join(' ') || 'Pérez',
      cargo: 'Repartidor Motorizado',
      departamento: 'Operaciones y Mensajería',
      salarioBase: 1750000,
      tipoContrato: 'Término Indefinido',
      nivelRiesgoARL: 4,
      fechaIngreso: '2026-01-01',
      banco: 'Bancolombia',
      tipoCuenta: 'Ahorros',
      numeroCuenta: '300-000000-00',
      eps: 'Sura EPS',
      afp: 'Protección',
      ccf: 'Comfandi',
      activo: true,
      rol: 'Repartidor',
      placaVehiculo: 'VTX-89D',
      email: userProfile?.email || 'pepito@sergem.com.co',
    };
  }, [employees, userProfile, defaultDriverId]);

  // Active Driver state: If Repartidor, locked to myRepartidorRecord.id. If Admin, can switch.
  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    if (isRepartidorRole) return myRepartidorRecord.id;
    return defaultDriverId || drivers[0]?.id || myRepartidorRecord.id;
  });

  // Keep selectedDriverId locked to the authenticated user's ID if currentRole is Repartidor
  const effectiveDriverId = isRepartidorRole ? myRepartidorRecord.id : selectedDriverId;

  // Synchronize driver selection if defaultDriverId is specified (e.g. from invitation link)
  useEffect(() => {
    if (defaultDriverId) {
      setSelectedDriverId(defaultDriverId);
    }
  }, [defaultDriverId]);

  const selectedDriver = useMemo(() => {
    if (isRepartidorRole) return myRepartidorRecord;
    return (
      employees.find((emp) => emp.id === effectiveDriverId) ||
      drivers[0] ||
      myRepartidorRecord
    );
  }, [isRepartidorRole, myRepartidorRecord, employees, effectiveDriverId, drivers]);

  // Selected week for schedule view
  const [selectedWeek, setSelectedWeek] = useState<string>('2026-08-03');

  // Driver's schedule for selected week
  const driverSchedule = useMemo(() => {
    return schedules.find(
      (s) =>
        s.repartidorId === selectedDriver.id && s.semanaInicio === selectedWeek
    );
  }, [schedules, selectedDriver.id, selectedWeek]);

  // Zone Chiefs list and assigned supervisor for direct communication
  const zoneChiefs = useMemo(() => {
    return employees.filter(
      (emp) =>
        emp.activo &&
        (emp.rol === 'Jefe de Zona' ||
          emp.rol === 'Jefe de Operaciones' ||
          emp.cargo.toLowerCase().includes('jefe') ||
          emp.cargo.toLowerCase().includes('zona'))
    );
  }, [employees]);

  const assignedZoneChief = useMemo(() => {
    return (
      zoneChiefs[0] || {
        id: 'CHIEF-01',
        nombre: 'Carlos Alberto',
        apellido: 'Rincón',
        cargo: 'Jefe de Zona Operativa',
        telefono: '3147890123',
        email: 'jefezona@sergem.com.co',
      }
    );
  }, [zoneChiefs]);

  // Shift Control State for Today
  const [auditPhoto, setAuditPhoto] = useState<string | null>(null);
  const [auditPhotoLocked, setAuditPhotoLocked] = useState<boolean>(false);

  // Shift status: 'PENDIENTE_INICIO' | 'INICIADO_CONTINUA' | 'INICIADO_MANANA' | 'FINALIZADO_MANANA' | 'INICIADO_TARDE' | 'JORNADA_COMPLETADA'
  const [shiftStatus, setShiftStatus] = useState<
    | 'PENDIENTE_INICIO'
    | 'INICIADO_CONTINUA'
    | 'INICIADO_MANANA'
    | 'FINALIZADO_MANANA'
    | 'INICIADO_TARDE'
    | 'JORNADA_COMPLETADA'
  >('PENDIENTE_INICIO');

  // Shift Timestamps
  const [horaInicio, setHoraInicio] = useState<string>('');
  const [horaFinManana, setHoraFinManana] = useState<string>('');
  const [horaInicioTarde, setHoraInicioTarde] = useState<string>('');
  const [horaFinTarde, setHoraFinTarde] = useState<string>('');

  // Manual Numeric Inputs
  const [paquetesCount, setPaquetesCount] = useState<number | ''>('');
  const [ventaNeta, setVentaNeta] = useState<number | ''>('');
  const [salidasFueraPerimetro, setSalidasFueraPerimetro] = useState<number | ''>('');
  const [observacionesSalida, setObservacionesSalida] = useState<string>('');

  // Success message state
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Default client & shift type for today (Dynamically resolves day of week)
  const currentInfo = getCurrentDateTimeInfo();
  const todayDayName = currentInfo.diaSemana;
  const todayShift = driverSchedule?.dias[todayDayName] || driverSchedule?.dias['Lunes'] || null;

  const isTurnoPartido = todayShift?.tipo === 'Partido';
  const clienteHoy = todayShift?.clienteNombre || 'Sin cliente asignado';
  const hasScheduledShiftToday = !!todayShift && todayShift.tipo !== 'Descanso';

  // Restore today's attendance state if already registered
  useEffect(() => {
    const todayInfo = getCurrentDateTimeInfo();
    const existing = attendanceRecords.find(
      (a) => a.repartidorId === selectedDriverId && a.fecha === todayInfo.fecha
    );
    if (existing) {
      if (existing.fotoAuditoria && !auditPhoto) {
        setAuditPhoto(existing.fotoAuditoria);
        setAuditPhotoLocked(true);
      }
      if (existing.horaInicioReal && !horaInicio) {
        setHoraInicio(existing.horaInicioReal);
        setShiftStatus((prev) =>
          prev === 'PENDIENTE_INICIO'
            ? (isTurnoPartido ? 'INICIADO_MANANA' : 'INICIADO_CONTINUA')
            : prev
        );
      }
    }
  }, [selectedDriverId, attendanceRecords, isTurnoPartido, auditPhoto, horaInicio]);

  // Handle Photo Capture Simulation / Upload
  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (auditPhotoLocked) return;

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAuditPhoto(event.target.result as string);
          setAuditPhotoLocked(true); // Lock photo permanently as requested
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSimulatePhoto = () => {
    if (auditPhotoLocked) return;
    // Default audit photo placeholder (delivery driver badge/vehicle inspection)
    const samplePhoto =
      'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&q=80&w=600';
    setAuditPhoto(samplePhoto);
    setAuditPhotoLocked(true); // Lock photo permanently as requested
  };

  // Current time formatted
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Shift Action Handlers
  const handleStartShift = () => {
    if (!auditPhotoLocked) return;

    const nowTime = getCurrentTime();
    setHoraInicio(nowTime);

    if (isTurnoPartido) {
      setShiftStatus('INICIADO_MANANA');
    } else {
      setShiftStatus('INICIADO_CONTINUA');
    }

    if (selectedDriver) {
      const todayInfo = getCurrentDateTimeInfo();
      const attendanceRecord: DriverAttendanceRecord = {
        id: `${selectedDriver.id}_${todayInfo.fecha}`,
        repartidorId: selectedDriver.id,
        nombreRepartidor: `${selectedDriver.nombre} ${selectedDriver.apellido}`,
        fecha: todayInfo.fecha,
        diaSemana: todayInfo.diaSemana,
        horaInicioReal: nowTime,
        estado: 'CONECTADO',
        clienteNombre: clienteHoy,
        fotoAuditoria: auditPhoto || undefined,
        timestamp: new Date().toISOString(),
      };
      onRecordAttendance?.(attendanceRecord);
    }
  };

  const handleCloseMorningShift = () => {
    const nowTime = getCurrentTime();
    setHoraFinManana(nowTime);
    setShiftStatus('FINALIZADO_MANANA');
  };

  const handleStartAfternoonShift = () => {
    const nowTime = getCurrentTime();
    setHoraInicioTarde(nowTime);
    setShiftStatus('INICIADO_TARDE');
  };

  const handleCloseFullShift = () => {
    const nowTime = getCurrentTime();
    if (isTurnoPartido) {
      setHoraFinTarde(nowTime);
    } else {
      setHoraFinManana(nowTime);
    }
    setShiftStatus('JORNADA_COMPLETADA');
  };

  // Driver reports filter
  const driverReports = useMemo(() => {
    return clientReports.filter((rep) => rep.repartidorId === selectedDriverId);
  }, [clientReports, selectedDriverId]);

  // Selected client for report
  const [selectedClientForReport, setSelectedClientForReport] = useState<string>('');

  // Submit Daily Report
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDriver) return;

    const chosenClient = selectedClientForReport || clienteHoy || 'Almacenes Éxito S.A.';

    const countSalidas = Number(salidasFueraPerimetro) || 0;

    const newReport: ClientOrderReport = {
      id: `REP-${Date.now()}`,
      clienteId: chosenClient.includes('Éxito') ? 'CLI-001' : chosenClient.includes('Homecenter') ? 'CLI-002' : 'CLI-003',
      nombreCliente: chosenClient,
      repartidorId: selectedDriver.id,
      nombreRepartidor: `${selectedDriver.nombre} ${selectedDriver.apellido}`,
      placaVehiculo: selectedDriver.placaVehiculo || 'VTX-89D',
      fecha: new Date().toISOString().split('T')[0],
      horasTrabajadas: 8,
      horasOrdinarias: 8,
      horasExtrasDiurnas: 0,
      horasExtrasNocturnas: 0,
      horasFestivas: 0,
      paquetesEntregados: Number(paquetesCount) || 0,
      ventaNeta: Number(ventaNeta) || 0,
      salidasFueraPerimetro: countSalidas,
      observacionesSalida: countSalidas > 0 && observacionesSalida.trim() ? observacionesSalida.trim() : undefined,
    };

    if (onAddClientReport) {
      onAddClientReport(newReport);
    }

    setIsSavedRecently(true);
    setSuccessMessage(
      `¡Reporte diario guardado exitosamente para ${selectedDriver.nombre}! Se registraron ${paquetesCount} paquetes, $${Number(
        ventaNeta
      ).toLocaleString('es-CO')} en venta neta (${chosenClient})${
        countSalidas > 0 ? ` y ${countSalidas} salida(s) fuera del perímetro urbano` : ''
      }.`
    );

    setTimeout(() => {
      setIsSavedRecently(false);
    }, 4000);

    setTimeout(() => {
      setSuccessMessage('');
    }, 8000);
  };

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div id="driver-portal-view" className="space-y-6">
      {/* Header Banner - Light Slate Grey Premium Design */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/60 text-slate-900 rounded-2xl p-7 md:p-8 shadow-xs border border-slate-300/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-white border border-slate-300/80 text-red-700 font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-2xs">
            <Truck className="w-4 h-4 text-red-600" />
            <span>Portal Operativo Repartidor</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Portal del Repartidor - Control de Turnos & Auditoría
          </h2>
          <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
            Consulte su programación semanal, capture la foto obligatoria de auditoría antes de iniciar turno, controle el cierre de jornada y registre sus entregas diarias.
          </p>
        </div>

        {/* Driver Selector or Locked Identity Card */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          {/* Direct Communication Line with Zone Chief */}
          <div className="bg-white border border-emerald-300/80 p-3.5 rounded-2xl w-full sm:w-72 shadow-2xs">
            <div className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                Línea con Jefe de Zona
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Línea activa" />
            </div>
            <div className="text-xs font-black text-slate-900 truncate">
              {assignedZoneChief.nombre} {assignedZoneChief.apellido}
            </div>
            <div className="text-[11px] text-slate-500 font-mono font-bold mt-0.5">
              Tel: {assignedZoneChief.telefono}
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
              <a
                href={buildCallLink(assignedZoneChief.telefono)}
                id="btn-call-zone-chief-direct"
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors cursor-pointer"
                title={`Llamar a ${assignedZoneChief.nombre}`}
              >
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>Llamar</span>
              </a>
              <a
                href={buildDriverToZoneChiefWhatsAppLink(
                  assignedZoneChief.telefono,
                  `${assignedZoneChief.nombre} ${assignedZoneChief.apellido}`,
                  `${selectedDriver.nombre} ${selectedDriver.apellido}`,
                  selectedDriver.placaVehiculo,
                  clienteHoy,
                  todayShift?.tipo
                )}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-whatsapp-zone-chief-direct"
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                title={`Escribir por WhatsApp a ${assignedZoneChief.nombre}`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-white" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {isRepartidorRole ? (
            <div className="bg-white border border-blue-200/90 p-4 rounded-2xl w-full sm:w-72 shadow-2xs">
              <div className="text-[10px] font-black uppercase text-blue-700 tracking-wider flex items-center space-x-1.5 mb-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Sesión de Repartidor</span>
              </div>
              <div className="text-sm font-black text-slate-900 tracking-tight">
                {selectedDriver.nombre} {selectedDriver.apellido}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between font-semibold border-t border-slate-100 pt-2">
                <span>C.C. <strong className="text-slate-800 font-mono">{selectedDriver.cedula}</strong></span>
                <span>Placa: <strong className="text-red-700 font-mono font-black bg-red-50 px-2 py-0.5 rounded border border-red-200">{selectedDriver.placaVehiculo || 'VTX-89D'}</strong></span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-purple-200 p-4 rounded-2xl w-full sm:w-72 shadow-2xs">
              <label className="text-[11px] font-black uppercase text-purple-800 tracking-wider flex items-center space-x-1.5 mb-2">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>Supervisión (Admin)</span>
              </label>
              {drivers.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-1">No hay repartidores registrados.</p>
              ) : (
                <select
                  value={selectedDriverId}
                  onChange={(e) => {
                    setSelectedDriverId(e.target.value);
                    setAuditPhoto(null);
                    setAuditPhotoLocked(false);
                    setShiftStatus('PENDIENTE_INICIO');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  {drivers.map((drv) => (
                    <option key={drv.id} value={drv.id}>
                      {drv.nombre} {drv.apellido} - {drv.placaVehiculo || 'VTX-89D'}
                    </option>
                  ))}
                </select>
              )}
              <div className="mt-2.5 text-[11px] text-slate-500 flex items-center justify-between font-semibold border-t border-slate-100 pt-2">
                <span>Cargo: <strong className="text-slate-800">{selectedDriver?.cargo || 'Repartidor'}</strong></span>
                <span>Placa: <strong className="text-red-700 font-mono font-black">{selectedDriver?.placaVehiculo || 'VTX-89D'}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-black px-2 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* REQUERIMIENTO 1: PROGRAMACIÓN DE LA SEMANA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-black text-sm text-slate-900">
                1. Programación Semanal de Turnos para {selectedDriver?.nombre} {selectedDriver?.apellido}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulta los clientes asignados y el horario programado por tu Jefe de Zona para esta semana.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 pl-1 text-xs font-bold">
            <span className="text-slate-500">Semana:</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="2026-08-03">03 de Agosto - 09 de Agosto 2026</option>
              <option value="2026-08-10">10 de Agosto - 16 de Agosto 2026</option>
            </select>
          </div>
        </div>

        {/* Weekly Schedule Grid */}
        <div className="p-6">
          {!driverSchedule ? (
            <div className="text-center py-10 px-4 bg-slate-50/80 rounded-2xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-100">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Sin programación de turnos para esta semana</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                No hay turnos registrados en el sistema para la semana seleccionada. Tu Jefe de Zona asignará la programación de turnos y clientes correspondientes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {daysOfWeek.map((dayName) => {
                const dayData = driverSchedule.dias[dayName];
                const isToday = dayName === 'Lunes';
                const isDescanso = !dayData || dayData.tipo === 'Descanso';

                return (
                  <div
                    key={dayName}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isToday
                        ? 'bg-red-50/80 border-red-400 ring-2 ring-red-500/20 shadow-xs'
                        : isDescanso
                        ? 'bg-slate-50 border-slate-200 opacity-75'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-black uppercase ${isToday ? 'text-red-900' : 'text-slate-700'}`}>
                          {dayName}
                        </span>
                        {isToday && (
                          <span className="px-1.5 py-0.5 bg-red-600 text-white font-extrabold text-[9px] rounded-md uppercase tracking-wider shadow-2xs shadow-red-600/20">
                            HOY
                          </span>
                        )}
                      </div>

                      <div className="mb-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                            isDescanso
                              ? 'bg-slate-200 text-slate-700'
                              : dayData.tipo === 'Partido'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : dayData.tipo === 'Medio Tiempo Mañana' || dayData.tipo === 'Medio Tiempo Tarde'
                              ? 'bg-sky-100 text-sky-900 border border-sky-200'
                              : 'bg-red-100 text-red-900 border border-red-200'
                          }`}
                        >
                          {!dayData
                            ? 'Sin Asignar'
                            : dayData.tipo === 'Partido'
                            ? 'Turno Partido'
                            : dayData.tipo === 'Medio Tiempo Mañana'
                            ? 'Medio Tiempo (Mañana)'
                            : dayData.tipo === 'Medio Tiempo Tarde'
                            ? 'Medio Tiempo (Tarde)'
                            : dayData.tipo === 'Continua'
                            ? 'Jornada Continua'
                            : 'Descanso'}
                        </span>
                      </div>

                      {!isDescanso && dayData ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="font-extrabold text-slate-900 text-xs flex items-center space-x-1">
                            <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="truncate">{dayData.clienteNombre || 'Sin cliente'}</span>
                          </div>

                          <div className="font-mono text-[11px] text-slate-600 bg-slate-100/80 p-1.5 rounded-lg border border-slate-200/60 font-semibold space-y-0.5">
                            {dayData.tipo === 'Partido' ? (
                              <>
                                <div>M: {dayData.horaInicio1 || '07:00'} - {dayData.horaFin1 || '11:00'}</div>
                                <div>T: {dayData.horaInicio2 || '14:00'} - {dayData.horaFin2 || '18:00'}</div>
                              </>
                            ) : (
                              <div>Turno: {dayData.horaInicio1 || '07:00'} - {dayData.horaFin1 || '15:00'}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-semibold italic py-2">Día Libre de Descanso</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SHIFT OPERATIONAL CONTROL PANEL (REQUERIMIENTOS 2, 3, 4, 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: REQUERIMIENTO 2 - FOTO AUDITORÍA & REQUERIMIENTO 3 - CONTROL DE TURNO */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* REQUERIMIENTO 2: FOTO AUDITORÍA (UNICA Y NO ELIMINABLE) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">2. Foto Auditoría de Inicio de Jornada</h3>
                  <p className="text-xs text-slate-500">Requisito obligatorio para habilitar la iniciación del turno.</p>
                </div>
              </div>

              {auditPhotoLocked && (
                <span className="inline-flex items-center space-x-1.5 bg-rose-100 text-rose-900 border border-rose-300 px-3 py-1 rounded-xl text-xs font-black shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Foto Bloqueada</span>
                </span>
              )}
            </div>

            {/* Photo Capture or Display Box */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              {auditPhoto ? (
                <div className="space-y-3 w-full max-w-sm">
                  <div className="relative rounded-xl overflow-hidden border-2 border-slate-800 shadow-md">
                    <img
                      src={auditPhoto}
                      alt="Foto de Auditoría de Turno"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-rose-600 text-white font-extrabold text-[10px] px-2 py-1 rounded-md shadow-xs flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>NO MODIFICABLE</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-900 flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Foto registrada exitosamente. Conforme a las normas operativas, esta foto no se puede eliminar ni volver a tomar.</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 space-y-3 max-w-md">
                  <div className="w-14 h-14 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-slate-800">Tomar o Cargar Foto de Inspección / Uniforme</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Debes registrar la foto antes de iniciar el turno. <strong>Atención:</strong> Una vez guardada, no podrá ser cambiada ni eliminada.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <label className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-sm transition-all flex items-center space-x-2">
                      <Camera className="w-4 h-4" />
                      <span>Capturar / Seleccionar Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCapturePhoto}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleSimulatePhoto}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-all flex items-center space-x-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Simular Foto Auditoría</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* REQUERIMIENTO 3: BOTONES DE INICIAR Y CERRAR TURNO (TURNO PARTIDO Y CONTINUO) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">3. Control Operativo de Turno</h3>
                  <p className="text-xs text-slate-500">
                    Cliente Hoy: <strong className="text-slate-900">{clienteHoy}</strong> ({isTurnoPartido ? 'Turno Partido' : 'Jornada Continua'})
                  </p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-xl text-xs font-black border ${
                  shiftStatus === 'JORNADA_COMPLETADA'
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : shiftStatus === 'PENDIENTE_INICIO'
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-blue-100 text-blue-950 border-blue-300'
                }`}
              >
                Estado: {shiftStatus.replace('_', ' ')}
              </span>
            </div>

            {/* Instruction Callout if Photo Not Taken */}
            {!auditPhotoLocked && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  <strong>Atención:</strong> El botón de <strong>Iniciar Turno</strong> se encuentra inhabilitado hasta que registre la foto de auditoría obligatoria.
                </span>
              </div>
            )}

            {/* Action Buttons Container */}
            <div className="space-y-4">
              
              {/* STAGE 1: INICIAR TURNO */}
              {shiftStatus === 'PENDIENTE_INICIO' && (
                <button
                  type="button"
                  disabled={!auditPhotoLocked}
                  onClick={handleStartShift}
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-black flex items-center justify-center space-x-2 shadow-md transition-all ${
                    auditPhotoLocked
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>INICIAR TURNO DE HOY</span>
                </button>
              )}

              {/* STAGE 2: TURNO PARTIDO - MAÑANA */}
              {isTurnoPartido && shiftStatus === 'INICIADO_MANANA' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-bold flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Jornada Mañana Iniciada a las: <strong>{horaInicio}</strong></span>
                    </span>
                    <span className="text-[11px] bg-blue-200 px-2 py-0.5 rounded-md">En Curso</span>
                  </div>

                  {/* REQUERIMIENTO 3.1: BOTON CERRAR TURNO MAÑANA */}
                  <button
                    type="button"
                    onClick={handleCloseMorningShift}
                    className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    <span>CERRAR TURNO MAÑANA</span>
                  </button>
                </div>
              )}

              {/* STAGE 3: TURNO PARTIDO - ESPERA O INICIAR TARDE */}
              {isTurnoPartido && shiftStatus === 'FINALIZADO_MANANA' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 font-bold space-y-1">
                    <p className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      <span>Turno Mañana Cerrado Exitosamente a las: <strong>{horaFinManana}</strong></span>
                    </p>
                    <p className="text-[11px] text-amber-800">
                      El turno de la tarde está programado a las <strong>14:00 (02:00 PM)</strong>.
                    </p>
                  </div>

                  {/* REQUERIMIENTO 3.1: HABILITAR TURNO TARDE A LA HORA PROGRAMADA */}
                  <button
                    type="button"
                    onClick={handleStartAfternoonShift}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>INICIAR TURNO TARDE</span>
                  </button>
                </div>
              )}

              {/* STAGE 4: TURNO PARTIDO - TARDE EN CURSO */}
              {isTurnoPartido && shiftStatus === 'INICIADO_TARDE' && (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 font-bold flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Sunset className="w-4 h-4 text-indigo-500" />
                      <span>Jornada Tarde Iniciada a las: <strong>{horaInicioTarde}</strong></span>
                    </span>
                    <span className="text-[11px] bg-purple-200 px-2 py-0.5 rounded-md">En Curso</span>
                  </div>

                  {/* REQUERIMIENTO 3.1: BOTON CERRAR TURNO TARDE */}
                  <button
                    type="button"
                    onClick={handleCloseFullShift}
                    className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    <span>CERRAR TURNO TARDE (FINALIZAR JORNADA)</span>
                  </button>
                </div>
              )}

              {/* STAGE 5: JORNADA CONTINUA EN CURSO (REQUERIMIENTO 3.2) */}
              {!isTurnoPartido && shiftStatus === 'INICIADO_CONTINUA' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-bold flex items-center justify-between">
                    <span>Jornada Continua Iniciada a las: <strong>{horaInicio}</strong></span>
                    <span className="text-[11px] bg-blue-200 px-2 py-0.5 rounded-md">En Curso</span>
                  </div>

                  {/* REQUERIMIENTO 3.2: BOTON CERRAR TURNO JORNADA CONTINUA */}
                  <button
                    type="button"
                    onClick={handleCloseFullShift}
                    className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    <span>CERRAR TURNO</span>
                  </button>
                </div>
              )}

              {/* STAGE 6: JORNADA COMPLETADA */}
              {shiftStatus === 'JORNADA_COMPLETADA' && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-bold space-y-1.5">
                  <div className="flex items-center space-x-2 text-emerald-800 text-sm font-black">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>¡Jornada de Hoy Finalizada Exitosamente!</span>
                  </div>
                  <p className="text-slate-600">
                    Hora de Inicio: <strong>{horaInicio || '07:00 AM'}</strong> | Hora de Cierre Final: <strong>{horaFinTarde || horaFinManana || '06:00 PM'}</strong>
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REQUERIMIENTOS 4 & 5 - CANTIDAD DE PAQUETES Y VENTA DEL DÍA */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSubmitReport} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">4 & 5. Registro de Entregas y Ventas</h3>
                  <p className="text-xs text-slate-500">Ingreso manual diario del repartidor.</p>
                </div>
              </div>
              {isSavedRecently && (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg animate-bounce">
                  ✓ GUARDADO
                </span>
              )}
            </div>

            {/* Cliente Asignado */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Cliente de la Entrega</span>
              </label>
              <select
                value={selectedClientForReport || clienteHoy}
                onChange={(e) => setSelectedClientForReport(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
              >
                <option value="Almacenes Éxito S.A.">Almacenes Éxito S.A.</option>
                <option value="Homecenter Colombia">Homecenter Colombia</option>
                <option value="Decathlon Colombia">Decathlon Colombia</option>
                <option value="Mercado Libre S.A.S.">Mercado Libre S.A.S.</option>
                <option value="Alkosto S.A.">Alkosto S.A.</option>
              </select>
            </div>

            {/* REQUERIMIENTO 4: INGRESAR MANUALMENTE CANTIDAD DE PAQUETES (SOLO NUMERO SIN MAS INFORMACION) */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                <span>4. Cantidad de Paquetes Entregados</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={paquetesCount}
                onChange={(e) => setPaquetesCount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej. 38"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-base font-black text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <p className="text-[11px] text-slate-500 italic">Unidades o pedidos entregados durante la jornada.</p>
            </div>

            {/* REQUERIMIENTO 5: INTRODUCIR LA VENTA DE ESE DÍA */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>5. Venta Neta del Día ($ COP)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 font-mono text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min={0}
                  required
                  value={ventaNeta}
                  onChange={(e) => setVentaNeta(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej. 1250000"
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
              <p className="text-[11px] text-slate-500 italic">Valor total cobrado/liquidado por ventas en entregas.</p>
            </div>

            {/* REQUERIMIENTO: SALIDAS FUERA DEL PERÍMETRO URBANO REGISTRADAS POR EL REPARTIDOR */}
            <div className="space-y-3 p-4 bg-purple-50/70 border border-purple-200/90 rounded-2xl shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-purple-950 flex items-center space-x-1.5">
                  <Compass className="w-4 h-4 text-purple-600" />
                  <span>6. Salidas Fuera del Perímetro Urbano</span>
                </label>
                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-md border border-purple-200">
                  Operación Perimetral
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Cantidad de Salidas / Viajes fuera de perímetro:</label>
                <input
                  type="number"
                  min={0}
                  value={salidasFueraPerimetro}
                  onChange={(e) => setSalidasFueraPerimetro(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-white border border-purple-300 rounded-xl font-mono text-base font-black text-purple-950 focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[11px] text-purple-900/70 italic">
                  Entregas o recorridos hacia municipios o sectores fuera del perímetro urbano (ej. Chía, Soacha, Bello, Jamundí, etc.).
                </p>
              </div>

              {Number(salidasFueraPerimetro) > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-purple-200/70">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    <span>Municipio(s) o Destinos fuera de perímetro:</span>
                  </label>
                  <input
                    type="text"
                    value={observacionesSalida}
                    onChange={(e) => setObservacionesSalida(e.target.value)}
                    placeholder="Ej. Chía / Cajicá (2 entregas), Soacha rural, etc."
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full py-3.5 px-4 font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                isSavedRecently
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 active:scale-[0.99]'
              }`}
            >
              {isSavedRecently ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>¡Reporte Guardado Exitosamente!</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Guardar y Enviar Reporte Diario</span>
                </>
              )}
            </button>

            {isSavedRecently && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-extrabold text-emerald-900 text-center animate-fade-in">
                ✓ Reporte enviado a la base de datos de operación y cliente.
              </div>
            )}
          </form>

          {/* MIS REPORTES REGISTRADOS LIST */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-xs uppercase text-slate-800 tracking-wider flex items-center space-x-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Mis Reportes Registrados ({driverReports.length})</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-400">Total Hoy</span>
            </div>

            {driverReports.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                Aún no has registrado reportes para este repartidor.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {driverReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-all gap-2"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900">{rep.nombreCliente}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {rep.fecha} | Placa: <strong className="text-amber-700">{rep.placaVehiculo}</strong>
                      </div>
                      {(rep.salidasFueraPerimetro ?? 0) > 0 && (
                        <div className="inline-flex items-center space-x-1 px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md text-[10px] font-bold border border-purple-200">
                          <Compass className="w-3 h-3 text-purple-600" />
                          <span>{rep.salidasFueraPerimetro} salida(s) fuera perím.</span>
                          {rep.observacionesSalida && (
                            <span className="text-purple-700 font-medium">({rep.observacionesSalida})</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-indigo-600">
                        {rep.paquetesEntregados} pqtes
                      </div>
                      <div className="font-mono text-[11px] font-bold text-emerald-700">
                        ${rep.ventaNeta.toLocaleString('es-CO')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Driver Info Summary */}
          <div className="bg-[#EBEBEB] text-slate-900 rounded-2xl p-5 border border-slate-300 space-y-3 shadow-2xs">
            <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Soporte de Vinculación & Ley 2101</span>
            </h4>
            <div className="space-y-1.5 text-xs text-slate-700 font-medium">
              <p>• Repartidor: <strong>{selectedDriver?.nombre} {selectedDriver?.apellido}</strong></p>
              <p>• Cédula: <strong className="font-mono">{selectedDriver?.cedula}</strong></p>
              <p>• Placa de Vehículo: <strong className="font-mono text-red-700 font-black">{selectedDriver?.placaVehiculo || 'VTX-89D'}</strong></p>
              <p>• Jefe de Zona: <strong>{employees.find((e) => e.id === selectedDriver?.jefeZonaId)?.nombre ? `${employees.find((e) => e.id === selectedDriver?.jefeZonaId)?.nombre} ${employees.find((e) => e.id === selectedDriver?.jefeZonaId)?.apellido}` : 'Operaciones SERGEM S.A.S.'}</strong></p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
