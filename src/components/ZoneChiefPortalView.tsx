import React, { useState, useMemo, useEffect } from 'react';
import {
  Employee,
  WeeklySchedule,
  ZoneChiefNovedad,
  ShiftDetails,
  ShiftType,
  DriverDailyAttendance
} from '../types/payroll';
import {
  Calendar,
  Clock,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileText,
  UploadCloud,
  ChevronRight,
  UserCheck,
  Building2,
  CalendarDays,
  ShieldAlert,
  Users,
  X,
  Phone,
  PhoneCall,
  MessageCircle,
  AlertTriangle,
  Radio,
  ExternalLink,
  Paperclip
} from 'lucide-react';
import { ContactDriverModal } from './ContactDriverModal';
import { FileUpload } from './FileUpload';
import { AuthUser } from '../types/payroll';

interface ZoneChiefPortalViewProps {
  employees: Employee[];
  schedules: WeeklySchedule[];
  novedades: ZoneChiefNovedad[];
  currentUser?: AuthUser | null;
  attendanceMap?: Record<string, DriverDailyAttendance>;
  onSaveSchedule: (schedule: WeeklySchedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  onAddNovedad: (novedad: ZoneChiefNovedad) => void;
  onDeleteNovedad: (novedadId: string) => void;
  onRecordContact?: (
    employeeId: string,
    tipo: 'WhatsApp' | 'Llamada',
    mensaje?: string,
    respuesta?: string
  ) => void;
  onMarkShiftStarted?: (employeeId: string) => void;
}

const DAYS_OF_WEEK: ('Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo')[] = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

const STANDARD_CLIENTS = [
  'Almacenes Éxito S.A.',
  'Droguerías Comfandi',
  'Nutresa Logistics',
  'Banco Davivienda S.A.',
  'Postobón S.A.',
  'Mercado Libre Colombia',
  'Unilever Colombia',
  'Droguerías San Jorge',
  'Operación Directa SERGEM',
];

export const ZoneChiefPortalView: React.FC<ZoneChiefPortalViewProps> = ({
  employees,
  schedules,
  novedades,
  currentUser,
  attendanceMap = {},
  onSaveSchedule,
  onDeleteSchedule,
  onAddNovedad,
  onDeleteNovedad,
  onRecordContact,
  onMarkShiftStarted,
}) => {
  // Select active Zone Chief
  const jefesDeZona = employees.filter((e) => e.rol === 'Jefe de Zona' || e.rol === 'Jefe de Operaciones');
  const [selectedJefeId, setSelectedJefeId] = useState<string>(() => {
    if (currentUser && (currentUser.rol === 'Jefe de Zona' || currentUser.rol === 'Jefe de Operaciones')) {
      return currentUser.id;
    }
    return jefesDeZona[0]?.id || '';
  });

  useEffect(() => {
    if (currentUser && (currentUser.rol === 'Jefe de Zona' || currentUser.rol === 'Jefe de Operaciones')) {
      setSelectedJefeId(currentUser.id);
    }
  }, [currentUser]);
  const [selectedWeek, setSelectedWeek] = useState<string>('2026-08-03');
  const [filterClient, setFilterClient] = useState<string>('TODOS');
  const [contactingDriver, setContactingDriver] = useState<{
    employee: Employee;
    attendance?: DriverDailyAttendance;
  } | null>(null);

  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState<string>('');

  const jefeSeleccionado = employees.find((e) => e.id === selectedJefeId);

  // Repartidores assigned to this Zone Chief or with schedules in the active week
  const repartidoresAsignados = employees.filter((e) => {
    if (e.rol !== 'Repartidor') return false;
    const isAssigned = !e.jefeZonaId || e.jefeZonaId === selectedJefeId;
    const hasScheduleInWeek = schedules.some(
      (s) => s.repartidorId === e.id && s.semanaInicio === selectedWeek
    );
    return isAssigned || hasScheduleInWeek;
  });

  // Quick Action Handlers for Direct WhatsApp and Calling
  const handleQuickWhatsApp = (emp: Employee, att?: DriverDailyAttendance) => {
    const rawPhone = emp.telefono || '3000000000';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const waPhone = cleanDigits.length === 10 ? `57${cleanDigits}` : cleanDigits;
    const clientName = att?.clienteNombre || 'Sede Asignada';
    const startTime = att?.horaInicioProgramada || '07:00 AM';
    const jefeName = jefeSeleccionado ? `${jefeSeleccionado.nombre} ${jefeSeleccionado.apellido}` : 'tu Jefe de Zona';

    const defaultMsg = `¡Hola ${emp.nombre}! Te saluda ${jefeName}, Jefe de Zona en SERGEM S.A.S. Te contacto porque tu turno de hoy con "${clientName}" estaba programado para las ${startTime} y aún no registras conexión en el portal. Por favor ingresa a iniciar turno o indícame si tienes alguna novedad en la ruta.`;

    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(defaultMsg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    if (onRecordContact) {
      onRecordContact(emp.id, 'WhatsApp', defaultMsg);
    }
  };

  const handleQuickCall = (emp: Employee) => {
    const cleanDigits = (emp.telefono || '').replace(/\D/g, '');
    window.location.href = `tel:${cleanDigits}`;

    if (onRecordContact) {
      onRecordContact(emp.id, 'Llamada', `Llamada directa efectuada por Jefe de Zona (${jefeSeleccionado?.nombre || 'Jefe'})`);
    }
  };

  // Compute Live Drivers for Today in this Zone
  const zoneAttendanceSummary = useMemo(() => {
    const unstarted: { employee: Employee; attendance?: DriverDailyAttendance }[] = [];
    const connected: { employee: Employee; attendance?: DriverDailyAttendance }[] = [];

    repartidoresAsignados.forEach((rep) => {
      const att = attendanceMap[rep.id];
      if (att) {
        if (att.estado === 'INICIADO') {
          connected.push({ employee: rep, attendance: att });
        } else if (att.estado === 'PENDIENTE_INICIO') {
          unstarted.push({ employee: rep, attendance: att });
        }
      } else {
        const sched = schedules.find((s) => s.repartidorId === rep.id);
        const shiftToday = sched?.dias['Lunes'];
        if (shiftToday && shiftToday.tipo !== 'Descanso') {
          unstarted.push({
            employee: rep,
            attendance: {
              repartidorId: rep.id,
              diaSemana: 'Lunes',
              fecha: '2026-08-03',
              estado: 'PENDIENTE_INICIO',
              horaInicioProgramada: shiftToday.horaInicio1 || '07:00',
              horaFinProgramada: shiftToday.horaFin1 || '15:00',
              clienteNombre: shiftToday.clienteNombre || 'Cliente Asignado',
              minutosRetraso: 15,
            },
          });
        }
      }
    });

    return { unstarted, connected };
  }, [repartidoresAsignados, schedules, attendanceMap]);

  // Tab State inside Portal: 'programacion' | 'novedades_horas' | 'carga_masiva'
  const [activeSubTab, setActiveSubTab] = useState<'programacion' | 'novedades_horas' | 'carga_masiva'>('programacion');

  // Modal State for Schedule Editing
  const [editingSchedule, setEditingSchedule] = useState<WeeklySchedule | null>(null);
  const [selectedRepartidorId, setSelectedRepartidorId] = useState<string>('');

  // Form State for Novedades con Horas
  const [novRepartidorId, setNovRepartidorId] = useState<string>('');
  const [novFecha, setNovFecha] = useState<string>('2026-08-04');
  const [novTipo, setNovTipo] = useState<'Permiso Remunerado' | 'Permiso No Remunerado' | 'Incapacidad'>('Permiso Remunerado');
  const [novHoraInicio, setNovHoraInicio] = useState<string>('09:00');
  const [novHoraFin, setNovHoraFin] = useState<string>('10:00');
  const [novObservaciones, setNovObservaciones] = useState<string>('');
  const [novArchivoUrl, setNovArchivoUrl] = useState<string>('');
  const [novArchivoNombre, setNovArchivoNombre] = useState<string>('');

  // Bulk Upload File State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreviewCount, setBulkPreviewCount] = useState<number>(0);
  const [bulkStatus, setBulkStatus] = useState<string>('');

  // Schedule Modal Helper
  const openScheduleModal = (repartidorId: string) => {
    setSelectedRepartidorId(repartidorId);
    const existing = schedules.find(
      (s) => s.repartidorId === repartidorId && s.semanaInicio === selectedWeek
    );

    if (existing) {
      setEditingSchedule(JSON.parse(JSON.stringify(existing)));
    } else {
      setEditingSchedule({
        id: `SCHED-${Date.now().toString().slice(-5)}`,
        repartidorId,
        jefeZonaId: selectedJefeId,
        semanaInicio: selectedWeek,
        dias: {
          Lunes: { tipo: 'Partido', clienteNombre: 'Almacenes Éxito S.A.', horaInicio1: '07:00', horaFin1: '11:00', horaInicio2: '14:00', horaFin2: '18:00' },
          Martes: { tipo: 'Continua', clienteNombre: 'Droguerías Comfandi', horaInicio1: '07:00', horaFin1: '15:00' },
          Miércoles: { tipo: 'Partido', clienteNombre: 'Nutresa Logistics', horaInicio1: '07:00', horaFin1: '11:00', horaInicio2: '14:00', horaFin2: '18:00' },
          Jueves: { tipo: 'Continua', clienteNombre: 'Almacenes Éxito S.A.', horaInicio1: '08:00', horaFin1: '16:00' },
          Viernes: { tipo: 'Partido', clienteNombre: 'Banco Davivienda S.A.', horaInicio1: '07:00', horaFin1: '11:00', horaInicio2: '14:00', horaFin2: '18:00' },
          Sábado: { tipo: 'Continua', clienteNombre: 'Postobón S.A.', horaInicio1: '08:00', horaFin1: '13:00' },
          Domingo: { tipo: 'Descanso' },
        },
      });
    }
  };

  const handleShiftTypeChange = (day: typeof DAYS_OF_WEEK[number], newType: ShiftType) => {
    if (!editingSchedule) return;
    const currentDay = editingSchedule.dias[day] || { tipo: 'Continua' };

    let updatedDay: ShiftDetails = { ...currentDay, tipo: newType };
    if (newType === 'Descanso') {
      updatedDay = { tipo: 'Descanso' };
    } else {
      if (!updatedDay.clienteNombre) {
        updatedDay.clienteNombre = 'Almacenes Éxito S.A.';
      }
      if (newType === 'Continua') {
        updatedDay.horaInicio1 = '07:00';
        updatedDay.horaFin1 = '15:00';
      } else if (newType === 'Medio Tiempo Mañana') {
        updatedDay.horaInicio1 = '07:00';
        updatedDay.horaFin1 = '11:00';
      } else if (newType === 'Medio Tiempo Tarde') {
        updatedDay.horaInicio1 = '13:00';
        updatedDay.horaFin1 = '17:00';
      } else if (newType === 'Partido' && (!updatedDay.horaInicio2 || !updatedDay.horaInicio1)) {
        updatedDay.horaInicio1 = '07:00';
        updatedDay.horaFin1 = '11:00';
        updatedDay.horaInicio2 = '14:00';
        updatedDay.horaFin2 = '18:00';
      }
    }

    setEditingSchedule({
      ...editingSchedule,
      dias: {
        ...editingSchedule.dias,
        [day]: updatedDay,
      },
    });
  };

  const handleShiftTimeChange = (
    day: typeof DAYS_OF_WEEK[number],
    field: keyof ShiftDetails,
    val: string
  ) => {
    if (!editingSchedule) return;
    const currentDay = editingSchedule.dias[day] || { tipo: 'Continua' };

    setEditingSchedule({
      ...editingSchedule,
      dias: {
        ...editingSchedule.dias,
        [day]: {
          ...currentDay,
          [field]: val,
        },
      },
    });
  };

  const handleSaveScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSchedule) {
      const repObj = employees.find((emp) => emp.id === editingSchedule.repartidorId);
      const repName = repObj ? `${repObj.nombre} ${repObj.apellido}` : 'el repartidor';

      // Auto update active week & filter so the newly created shift appears immediately
      if (editingSchedule.semanaInicio && editingSchedule.semanaInicio !== selectedWeek) {
        setSelectedWeek(editingSchedule.semanaInicio);
      }
      setFilterClient('TODOS');

      onSaveSchedule({
        ...editingSchedule,
        jefeZonaId: editingSchedule.jefeZonaId || selectedJefeId,
      });

      setEditingSchedule(null);

      setScheduleSuccessMsg(
        `¡Turno y programación asignados correctamente a ${repName} para la semana del ${editingSchedule.semanaInicio}!`
      );
      setTimeout(() => setScheduleSuccessMsg(''), 7000);
    }
  };

  // Submit Novedad por Hora
  const handleNovedadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novRepartidorId) return;

    // Calculate duration in hours
    const startH = parseInt(novHoraInicio.split(':')[0]) + parseInt(novHoraInicio.split(':')[1]) / 60;
    const endH = parseInt(novHoraFin.split(':')[0]) + parseInt(novHoraFin.split(':')[1]) / 60;
    const duracionHoras = Math.max(0.5, endH - startH);

    const newNov: ZoneChiefNovedad = {
      id: `ZNOV-${Date.now().toString().slice(-6)}`,
      repartidorId: novRepartidorId,
      jefeZonaId: selectedJefeId,
      fecha: novFecha,
      tipo: novTipo,
      horaInicio: novHoraInicio,
      horaFin: novHoraFin,
      duracionHoras,
      observaciones: novObservaciones || `Permiso/Novedad reportado por Jefe de Zona`,
      fechaRegistro: new Date().toISOString(),
      archivoUrl: novArchivoUrl || undefined,
      archivoNombre: novArchivoNombre || undefined,
    };

    onAddNovedad(newNov);
    setNovObservaciones('');
    setNovArchivoUrl('');
    setNovArchivoNombre('');
    setNovHoraInicio('09:00');
    setNovHoraFin('10:00');
  };

  // Process Carga Masiva (CSV/XLS Simulator)
  const handleBulkProcess = () => {
    if (repartidoresAsignados.length === 0) {
      setBulkStatus('No hay repartidores asignados a esta zona para cargar.');
      return;
    }

    repartidoresAsignados.forEach((rep, idx) => {
      const clientIndex = idx % STANDARD_CLIENTS.length;
      const primaryClient = STANDARD_CLIENTS[clientIndex];
      const secondaryClient = STANDARD_CLIENTS[(clientIndex + 1) % STANDARD_CLIENTS.length];

      const newSched: WeeklySchedule = {
        id: `SCHED-BULK-${rep.id}-${selectedWeek}`,
        repartidorId: rep.id,
        jefeZonaId: selectedJefeId,
        semanaInicio: selectedWeek,
        dias: {
          Lunes: { tipo: 'Partido', clienteNombre: primaryClient, horaInicio1: '07:00', horaFin1: '11:00', horaInicio2: '14:00', horaFin2: '18:00', observaciones: 'Cargado vía XLS' },
          Martes: { tipo: 'Continua', clienteNombre: primaryClient, horaInicio1: '07:00', horaFin1: '15:00', observaciones: 'Cargado vía XLS' },
          Miércoles: { tipo: 'Partido', clienteNombre: secondaryClient, horaInicio1: '07:00', horaFin1: '11:00', horaInicio2: '14:00', horaFin2: '18:00', observaciones: 'Cargado vía XLS' },
          Jueves: { tipo: 'Continua', clienteNombre: secondaryClient, horaInicio1: '08:00', horaFin1: '16:00', observaciones: 'Cargado vía XLS' },
          Viernes: { tipo: 'Partido', clienteNombre: primaryClient, horaInicio1: '07:00', horaFin1: '11:00', horaInicio2: '14:00', horaFin2: '18:00', observaciones: 'Cargado vía XLS' },
          Sábado: { tipo: 'Continua', clienteNombre: primaryClient, horaInicio1: '08:00', horaFin1: '13:00', observaciones: 'Cargado vía XLS' },
          Domingo: { tipo: 'Descanso' },
        },
      };
      onSaveSchedule(newSched);
    });

    setBulkStatus(`¡Éxito! Se cargaron automáticamente ${repartidoresAsignados.length} programaciones semanales asignando sus respectivos clientes para la semana ${selectedWeek}.`);
  };

  return (
    <div id="zone-chief-portal" className="space-y-6">
      {/* Top Banner & Zone Chief Selector - Light Slate Grey Premium Design */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/60 text-slate-900 rounded-2xl p-7 md:p-8 shadow-xs border border-slate-300/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-white border border-slate-300/80 text-red-700 font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-2xs">
            <UserCheck className="w-4 h-4 text-red-600" />
            <span>Portal de Operaciones - Jefe de Zona</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Programación Semanal & Novedades por Hora
          </h2>
          <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
            Gestiona la programación diaria (Lunes a Domingo), turnos partidos o continuos, carga masiva de XLS/CSV y reporta permisos con hora de inicio/fin.
          </p>
        </div>

        {/* Chief Selector */}
        <div className="bg-white p-4 rounded-2xl border border-slate-300/90 shadow-2xs flex items-center space-x-3.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center border border-red-200 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Jefe de Zona Activo:</label>
            <select
              value={selectedJefeId}
              onChange={(e) => setSelectedJefeId(e.target.value)}
              className="bg-slate-50 text-slate-900 font-extrabold text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              {jefesDeZona.length === 0 ? (
                <option value="">Sin Jefes de Zona registrados</option>
              ) : (
                jefesDeZona.map((jefe) => (
                  <option key={jefe.id} value={jefe.id}>
                    {jefe.nombre} {jefe.apellido} ({jefe.cargo})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Week Selector and Sub-Navigation */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex space-x-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('programacion')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'programacion'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Programación 1 a 1 (Lunes a Domingo)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('novedades_horas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'novedades_horas'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Novedades por Hora (Permisos/Incapacidades)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('carga_masiva')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'carga_masiva'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Carga Masiva XLS / CSV</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
          <span>Semana Objetivo:</span>
          <input
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="border border-slate-300 rounded-lg p-1.5 font-mono text-xs bg-slate-50"
          />
        </div>
      </div>

      {/* SUBTAB 1: Programación 1 a 1 */}
      {activeSubTab === 'programacion' && (
        <div className="space-y-4">
          {scheduleSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{scheduleSuccessMsg}</span>
              </div>
              <button
                onClick={() => setScheduleSuccessMsg('')}
                className="text-emerald-700 hover:text-emerald-950 text-xs font-black px-2 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Connection Alert Banner for Today's Scheduled Drivers in this Zone */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
                  <Radio className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>Control de Conexión & Asistencia en Vivo (Hoy)</span>
                    <span className="bg-red-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">Zona Activa</span>
                  </h4>
                  <p className="text-slate-500 text-xs font-medium">
                    Notifica a tus repartidores asignados que aún no inician su turno programado del día.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs font-bold">
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>En Turno: <strong>{zoneAttendanceSummary.connected.length}</strong></span>
                </span>
                <span className="bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  <span>Sin Iniciar: <strong>{zoneAttendanceSummary.unstarted.length}</strong></span>
                </span>
              </div>
            </div>

            {zoneAttendanceSummary.unstarted.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Atención Jefe de Zona: {zoneAttendanceSummary.unstarted.length} repartidor(es) tienen turno hoy y no han marcado inicio en el portal.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {zoneAttendanceSummary.unstarted.map(({ employee: rep, attendance: att }) => {
                    const startTime = att?.horaInicioProgramada || '07:00 AM';
                    const clientName = att?.clienteNombre || 'Sede asignada';
                    const delayMin = att?.minutosRetraso || 15;

                    return (
                      <div
                        key={rep.id}
                        className="bg-white border-2 border-red-300 rounded-xl p-3 shadow-2xs hover:shadow-xs transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs">
                              {rep.nombre} {rep.apellido}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {clientName} • Turno: <strong className="text-red-700 font-mono">{startTime}</strong>
                            </div>
                          </div>
                          <span className="font-black text-amber-700 bg-amber-100 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded">
                            +{delayMin} min
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => handleQuickWhatsApp(rep, att)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1 text-[11px] cursor-pointer transition-all active:scale-95 shadow-2xs"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => handleQuickCall(rep)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1 text-[11px] cursor-pointer transition-all active:scale-95 shadow-2xs"
                            title="Llamar directamente"
                          >
                            <PhoneCall className="w-3 h-3 text-emerald-400" />
                            <span>Llamar</span>
                          </button>

                          <button
                            onClick={() => setContactingDriver({ employee: rep, attendance: att })}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-1.5 px-2 rounded-lg text-[11px] cursor-pointer transition-all flex items-center justify-center"
                            title="Opciones avanzadas y mensajes predeterminados"
                          >
                            <span>Opciones</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-xl flex items-center space-x-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Excelente: todos los repartidores asignados a esta zona con turno hoy han registrado su inicio correctamente.</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Repartidores Asignados a la Zona ({repartidoresAsignados.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Programación individual día por día asignando Repartidor, Cliente / Sede Operativa y Horarios.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Client Filter Selector */}
                <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs text-xs">
                  <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-bold text-slate-700">Cliente:</span>
                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-hidden cursor-pointer"
                  >
                    <option value="TODOS">-- Todos los Clientes --</option>
                    {STANDARD_CLIENTS.map((cli) => (
                      <option key={cli} value={cli}>
                        {cli}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Crear Turno Button */}
                <button
                  onClick={() => {
                    const firstRep = repartidoresAsignados[0] || employees.find((e) => e.rol === 'Repartidor');
                    if (firstRep) {
                      openScheduleModal(firstRep.id);
                    } else {
                      alert('No hay repartidores registrados en la plataforma.');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-red-600/20 flex items-center space-x-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Turno / Programación</span>
                </button>
              </div>
            </div>

            {repartidoresAsignados.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No hay repartidores asignados a este Jefe de Zona actualmente. Puedes asignar repartidores en el Portal de Administración.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {repartidoresAsignados
                  .filter((rep) => {
                    if (filterClient === 'TODOS') return true;
                    const sched = schedules.find(
                      (s) => s.repartidorId === rep.id && s.semanaInicio === selectedWeek
                    );
                    if (!sched) return false;
                    return Object.values(sched.dias).some((d: any) => d?.clienteNombre === filterClient);
                  })
                  .map((rep) => {
                    const schedule = schedules.find(
                      (s) => s.repartidorId === rep.id && s.semanaInicio === selectedWeek
                    );
                    const repAtt = attendanceMap[rep.id];

                  return (
                    <div key={rep.id} className="p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 font-black flex items-center justify-center text-sm">
                            {rep.nombre.charAt(0)}{rep.apellido.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <span>{rep.nombre} {rep.apellido}</span>
                              {repAtt?.estado === 'INICIADO' ? (
                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                  🟢 En Turno ({repAtt.horaConexionReal || '06:52'})
                                </span>
                              ) : repAtt?.estado === 'PENDIENTE_INICIO' ? (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                  ⚠️ Sin Iniciar (+{repAtt.minutosRetraso || 15}m)
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-slate-500">
                              Placa: <span className="font-mono font-bold text-slate-800">{rep.placaVehiculo || 'Sin Placa'}</span> • C.C. {rep.cedula} • Tel: <span className="font-mono font-bold text-slate-700">{rep.telefono || 'Sin teléfono'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Quick Contact Buttons in Header */}
                          <button
                            onClick={() => handleQuickWhatsApp(rep, repAtt)}
                            title="Contactar por WhatsApp"
                            className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleQuickCall(rep)}
                            title="Llamar al Repartidor"
                            className="p-2 bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-300 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                          >
                            <PhoneCall className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setContactingDriver({ employee: rep, attendance: repAtt })}
                            title="Opciones de contacto"
                            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
                          >
                            Contactar
                          </button>

                          {schedule && (
                            <button
                              onClick={() => onDeleteSchedule(schedule.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold cursor-pointer"
                              title="Eliminar programación"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => openScheduleModal(rep.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-xs shadow-red-600/20 flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{schedule ? 'Editar Turnos y Cliente' : 'Programar Turnos'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Weekly Grid Preview */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2">
                        {DAYS_OF_WEEK.map((day) => {
                          const shift = schedule?.dias[day];
                          const isDescanso = shift?.tipo === 'Descanso' || !shift;
                          const isToday = day === 'Lunes';
                          const isUnstartedToday = isToday && !isDescanso && repAtt?.estado === 'PENDIENTE_INICIO';
                          const isStartedToday = isToday && !isDescanso && repAtt?.estado === 'INICIADO';

                          return (
                            <div
                              key={day}
                              className={`p-2.5 rounded-xl border text-xs font-medium space-y-1.5 flex flex-col justify-between transition-all ${
                                isUnstartedToday
                                  ? 'bg-amber-50/90 border-2 border-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-400/20'
                                  : isStartedToday
                                  ? 'bg-emerald-50/90 border-2 border-emerald-400 text-emerald-950 shadow-xs'
                                  : isDescanso
                                  ? 'bg-slate-50 border-slate-200 text-slate-400'
                                  : shift?.tipo === 'Partido'
                                  ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
                                  <span className="font-bold text-[11px] block uppercase">
                                    {day}
                                  </span>
                                  {isToday && (
                                    <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-slate-800 text-white">
                                      Hoy
                                    </span>
                                  )}
                                </div>

                                {isDescanso ? (
                                  <span className="text-[11px] italic block mt-1">Descanso</span>
                                ) : shift.tipo === 'Partido' ? (
                                  <div className="text-[10px] space-y-0.5 font-mono font-bold mt-1">
                                    <span className="block text-indigo-800">M: {shift.horaInicio1}-{shift.horaFin1}</span>
                                    <span className="block text-indigo-800">T: {shift.horaInicio2}-{shift.horaFin2}</span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] font-mono font-bold text-emerald-800 mt-1">
                                    <span>{shift.horaInicio1} - {shift.horaFin1}</span>
                                    <span className="block text-[9px] text-emerald-700 font-sans font-bold">
                                      {shift.tipo === 'Medio Tiempo Mañana'
                                        ? 'Medio T. (Mañana)'
                                        : shift.tipo === 'Medio Tiempo Tarde'
                                        ? 'Medio T. (Tarde)'
                                        : 'Continua'}
                                    </span>
                                  </div>
                                )}

                                {/* Today status badge inside cell */}
                                {isUnstartedToday && (
                                  <div className="mt-1.5 bg-red-100 border border-red-300 text-red-800 text-[10px] font-black px-1.5 py-0.5 rounded text-center">
                                    🔴 Sin Iniciar
                                  </div>
                                )}
                                {isStartedToday && (
                                  <div className="mt-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded text-center">
                                    🟢 En Turno
                                  </div>
                                )}
                              </div>

                              {/* Client Badge & Quick Action Button inside cell */}
                              <div>
                                {!isDescanso && (
                                  <div className="flex items-center space-x-1 bg-white/90 px-1.5 py-0.5 rounded-lg border border-slate-200 text-[10px] font-extrabold text-slate-800 truncate shadow-2xs mt-1">
                                    <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                                    <span className="truncate" title={shift.clienteNombre || 'Almacenes Éxito S.A.'}>
                                      {shift.clienteNombre || 'Almacenes Éxito S.A.'}
                                    </span>
                                  </div>
                                )}

                                {isUnstartedToday && (
                                  <div className="flex items-center space-x-1 mt-1.5 pt-1 border-t border-amber-200">
                                    <button
                                      onClick={() => handleQuickWhatsApp(rep, repAtt)}
                                      title="WhatsApp rápido"
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1 rounded text-[10px] flex items-center justify-center cursor-pointer"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleQuickCall(rep)}
                                      title="Llamar rápido"
                                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold p-1 rounded text-[10px] flex items-center justify-center cursor-pointer"
                                    >
                                      <PhoneCall className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Novedades por Hora */}
      {activeSubTab === 'novedades_horas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Column */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Reportar Novedad / Permiso por Hora</span>
            </h3>
            <p className="text-xs text-slate-500">
              Registra permisos remunerados, no remunerados o incapacidades con rango exacto de hora inicio y fin. El resto de la jornada continuará programado normalmente.
            </p>

            <form onSubmit={handleNovedadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Repartidor *</label>
                <select
                  required
                  value={novRepartidorId}
                  onChange={(e) => setNovRepartidorId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold bg-slate-50"
                >
                  <option value="">-- Seleccionar Repartidor --</option>
                  {repartidoresAsignados.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} {r.apellido} ({r.placaVehiculo || 'Sin Placa'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de la Novedad *</label>
                <input
                  type="date"
                  required
                  value={novFecha}
                  onChange={(e) => setNovFecha(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Novedad *</label>
                <select
                  value={novTipo}
                  onChange={(e) => setNovTipo(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-bold bg-amber-50 text-amber-900"
                >
                  <option value="Permiso Remunerado">Permiso Remunerado</option>
                  <option value="Permiso No Remunerado">Permiso No Remunerado</option>
                  <option value="Incapacidad">Incapacidad</option>
                </select>
              </div>

              {/* Hora Inicio y Fin */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora Inicio *</label>
                  <input
                    type="time"
                    required
                    value={novHoraInicio}
                    onChange={(e) => setNovHoraInicio(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora Fin *</label>
                  <input
                    type="time"
                    required
                    value={novHoraFin}
                    onChange={(e) => setNovHoraFin(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                  />
                </div>
              </div>

              {/* Behavior explanation */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                <span className="font-bold block mb-0.5">Ejemplo de Reincorporación:</span>
                Entra a las 7:00 AM → Permiso de 9:00 AM a 10:00 AM (no programado en este rango) → Se reincorpora a las 10:00 AM hasta la salida.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones / Soporte</label>
                <textarea
                  rows={2}
                  placeholder="Detalle o motivo del permiso..."
                  value={novObservaciones}
                  onChange={(e) => setNovObservaciones(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Supabase Storage File Attachment */}
              <div className="pt-1">
                <FileUpload
                  bucket="novedades-attachments"
                  pathPrefix={`novedades/${novRepartidorId || 'general'}`}
                  label="Documento Soporte / Incapacidad Médica (Opcional)"
                  description="Adjunte certificado médico, fórmula o constancia en PDF o imagen"
                  accept="image/*,application/pdf"
                  maxSizeMB={15}
                  currentFileUrl={novArchivoUrl}
                  onUploadComplete={(res) => {
                    setNovArchivoUrl(res.url);
                    setNovArchivoNombre(res.path.split('/').pop() || 'documento_soporte');
                  }}
                  onRemoveFile={() => {
                    setNovArchivoUrl('');
                    setNovArchivoNombre('');
                  }}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Novedad por Hora</span>
              </button>
            </form>
          </div>

          {/* Table Column */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-800">
                Historial de Novedades por Hora Reportadas ({novedades.length})
              </h3>
            </div>

            <div className="p-4 overflow-y-auto max-h-[500px]">
              {novedades.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-xs">
                  No se han registrado novedades de permisos por hora todavía.
                </div>
              ) : (
                <div className="space-y-3">
                  {novedades.map((nov) => {
                    const rep = employees.find((e) => e.id === nov.repartidorId);

                    return (
                      <div
                        key={nov.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {rep ? `${rep.nombre} ${rep.apellido}` : nov.repartidorId}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              {nov.tipo}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 flex items-center space-x-3 font-medium">
                            <span>Fecha: <strong>{nov.fecha}</strong></span>
                            <span>
                              Rango: <strong className="font-mono text-slate-800">{nov.horaInicio} - {nov.horaFin}</strong> ({nov.duracionHoras} hrs)
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 italic">
                            "{nov.observaciones}"
                          </div>

                          {nov.archivoUrl && (
                            <div className="pt-1.5 flex items-center gap-2">
                              <a
                                href={nov.archivoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-colors"
                              >
                                <Paperclip className="w-3 h-3 text-indigo-600" />
                                <span>Ver Soporte Adjunto</span>
                                <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                              </a>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => onDeleteNovedad(nov.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Carga Masiva XLS / CSV */}
      {activeSubTab === 'carga_masiva' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-indigo-600" />
              <span>Carga Masiva de Programación Semanal (Excel / CSV)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sube el archivo Excel (.xlsx, .xls) o CSV con las cuadrantes de turnos semanales para todos los repartidores de tu zona.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-4 hover:border-indigo-500 transition-colors bg-slate-50">
              <FileSpreadsheet className="w-12 h-12 text-indigo-500 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Arrastra tu archivo XLS / CSV o haz clic para seleccionar
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Formatos soportados: .csv, .xlsx, .xls (Hasta 5MB)
                </p>
              </div>

              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setBulkFile(e.target.files[0]);
                    setBulkPreviewCount(repartidoresAsignados.length);
                  }
                }}
                className="hidden"
                id="bulk-file-input"
              />

              <label
                htmlFor="bulk-file-input"
                className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Seleccionar Archivo de Mi Equipo
              </label>

              {bulkFile && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Archivo cargado: {bulkFile.name} ({repartidoresAsignados.length} registros detectados)</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 text-sm">Instrucciones y Formato Esperado</h4>
              <p className="text-slate-600">
                El archivo debe contener las columnas: <code className="bg-white px-1 py-0.5 rounded border border-slate-300 font-mono text-[11px]">Cedula, Nombre, Lunes_Tipo, Lunes_Inicio1, Lunes_Fin1, Lunes_Inicio2, Lunes_Fin2...</code>
              </p>

              <button
                type="button"
                onClick={handleBulkProcess}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Procesar Carga Masiva e Importar Turnos</span>
              </button>

              {bulkStatus && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl font-bold">
                  {bulkStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Edit Modal */}
      {editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-50 text-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 border border-red-200/80 flex items-center justify-center">
                  <CalendarDays className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Programación Semanal 1 a 1 ({selectedWeek})
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Asignación diaria de turnos, horarios y cliente</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSchedule(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScheduleSubmit} className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              {/* Header Info: Repartidor & Week Selector */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-red-600" />
                    <span>Nombre del Repartidor *</span>
                  </label>
                  <select
                    value={editingSchedule.repartidorId}
                    onChange={(e) => {
                      const newRepId = e.target.value;
                      setSelectedRepartidorId(newRepId);
                      const existing = schedules.find(
                        (s) => s.repartidorId === newRepId && s.semanaInicio === editingSchedule.semanaInicio
                      );
                      if (existing) {
                        setEditingSchedule(JSON.parse(JSON.stringify(existing)));
                      } else {
                        setEditingSchedule({
                          ...editingSchedule,
                          repartidorId: newRepId,
                        });
                      }
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 shadow-2xs cursor-pointer"
                  >
                    {employees
                      .filter((e) => e.rol === 'Repartidor')
                      .map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.nombre} {rep.apellido} — C.C. {rep.cedula} ({rep.cargo})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-red-600" />
                    <span>Semana de Inicio (Fecha Lunes) *</span>
                  </label>
                  <input
                    type="date"
                    value={editingSchedule.semanaInicio}
                    onChange={(e) => {
                      const newWeek = e.target.value;
                      const existing = schedules.find(
                        (s) => s.repartidorId === editingSchedule.repartidorId && s.semanaInicio === newWeek
                      );
                      if (existing) {
                        setEditingSchedule(JSON.parse(JSON.stringify(existing)));
                      } else {
                        setEditingSchedule({
                          ...editingSchedule,
                          semanaInicio: newWeek,
                        });
                      }
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Day-by-Day Shifts */}
              <div className="space-y-4 divide-y divide-slate-200">
                {DAYS_OF_WEEK.map((day) => {
                  const shift = editingSchedule.dias[day] || { tipo: 'Continua' };

                  return (
                    <div key={day} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-900 text-xs uppercase w-28">
                          {day}
                        </span>

                        <select
                          value={shift.tipo}
                          onChange={(e) => handleShiftTypeChange(day, e.target.value as ShiftType)}
                          className="p-1.5 border border-slate-300 rounded-lg font-bold bg-slate-50 text-xs cursor-pointer focus:ring-2 focus:ring-red-500"
                        >
                          <option value="Partido">Turno Partido (Mañana / Tarde)</option>
                          <option value="Continua">Jornada Continua (8h)</option>
                          <option value="Medio Tiempo Mañana">Medio Tiempo - Mañana (4h)</option>
                          <option value="Medio Tiempo Tarde">Medio Tiempo - Tarde (4h)</option>
                          <option value="Descanso">Descanso</option>
                        </select>
                      </div>

                      {shift.tipo !== 'Descanso' && (
                        <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                          <div>
                            <label className="block text-[10px] font-extrabold text-indigo-950 uppercase mb-1 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Cliente / Empresa Asignada *</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <select
                                value={shift.clienteNombre || 'Almacenes Éxito S.A.'}
                                onChange={(e) => handleShiftTimeChange(day, 'clienteNombre', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                              >
                                {STANDARD_CLIENTS.map((cli) => (
                                  <option key={cli} value={cli}>
                                    {cli}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="O nombre de cliente personalizado..."
                                value={shift.clienteNombre || ''}
                                onChange={(e) => handleShiftTimeChange(day, 'clienteNombre', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-semibold bg-white text-xs text-slate-800 placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500">
                                {shift.tipo === 'Partido' ? 'Mañana Inicio' : 'Hora Inicio'}
                              </label>
                              <input
                                type="time"
                                value={shift.horaInicio1 || '07:00'}
                                onChange={(e) => handleShiftTimeChange(day, 'horaInicio1', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded-lg font-mono font-bold bg-white text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500">
                                {shift.tipo === 'Partido' ? 'Mañana Fin' : 'Hora Fin'}
                              </label>
                              <input
                                type="time"
                                value={shift.horaFin1 || '11:00'}
                                onChange={(e) => handleShiftTimeChange(day, 'horaFin1', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded-lg font-mono font-bold bg-white text-xs"
                              />
                            </div>

                            {shift.tipo === 'Partido' && (
                              <>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500">Tarde Inicio</label>
                                  <input
                                    type="time"
                                    value={shift.horaInicio2 || '14:00'}
                                    onChange={(e) => handleShiftTimeChange(day, 'horaInicio2', e.target.value)}
                                    className="w-full p-1.5 border border-slate-300 rounded-lg font-mono font-bold bg-white text-xs"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500">Tarde Fin</label>
                                  <input
                                    type="time"
                                    value={shift.horaFin2 || '18:00'}
                                    onChange={(e) => handleShiftTimeChange(day, 'horaFin2', e.target.value)}
                                    className="w-full p-1.5 border border-slate-300 rounded-lg font-mono font-bold bg-white text-xs"
                                  />
                                </div>
                              </>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-200/60">
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              Observaciones / Ruta / Sede Operativa
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: Ruta Cali Norte, Chipichape, Paquetera Yumbo..."
                              value={shift.observaciones || ''}
                              onChange={(e) => handleShiftTimeChange(day, 'observaciones', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md cursor-pointer shadow-red-600/20"
                >
                  Guardar Programación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Contact Driver Modal */}
      {contactingDriver && (
        <ContactDriverModal
          employee={contactingDriver.employee}
          attendance={contactingDriver.attendance}
          callerRole="Jefe de Zona"
          callerName={jefeSeleccionado ? `${jefeSeleccionado.nombre} ${jefeSeleccionado.apellido}` : 'Jefe de Zona'}
          onClose={() => setContactingDriver(null)}
          onRecordContact={onRecordContact}
          onMarkShiftStarted={onMarkShiftStarted}
        />
      )}
    </div>
  );
};
