import React, { useState } from 'react';
import {
  Employee,
  WeeklySchedule,
  ZoneChiefNovedad,
  ShiftDetails,
  ShiftType,
  AppRole,
  AppUserProfile,
  DriverAttendanceRecord,
  ClientOrderReport,
  CompanyClient,
} from '../types/payroll';
import { UnconnectedDriversSection } from './UnconnectedDriversSection';
import {
  getCurrentDateTimeInfo,
  buildCallLink,
  buildDriverShiftWhatsAppLink
} from '../utils/attendanceService';
import {
  generateShiftScheduleExcel,
  parseShiftScheduleExcel
} from '../utils/shiftExcelService';
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
  ShieldCheck,
  Phone,
  MessageCircle,
  Download,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface ZoneChiefPortalViewProps {
  employees: Employee[];
  schedules: WeeklySchedule[];
  novedades: ZoneChiefNovedad[];
  attendanceRecords?: DriverAttendanceRecord[];
  clientReports?: ClientOrderReport[];
  clients?: CompanyClient[];
  onSaveSchedule: (schedule: WeeklySchedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  onAddNovedad: (novedad: ZoneChiefNovedad) => void;
  onDeleteNovedad: (novedadId: string) => void;
  onRecordAttendance?: (record: DriverAttendanceRecord) => void;
  onAddEmployee?: (employee: Employee) => void;
  currentRole?: AppRole;
  userProfile?: AppUserProfile | null;
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
  attendanceRecords = [],
  clientReports = [],
  clients = [],
  onSaveSchedule,
  onDeleteSchedule,
  onAddNovedad,
  onDeleteNovedad,
  onRecordAttendance,
  onAddEmployee,
  currentRole = 'Jefe de Zona',
  userProfile,
}) => {
  const isChiefRole = currentRole === 'Jefe de Zona';

  // Select active Zone Chief
  const jefesDeZona = employees.filter((e) => e.rol === 'Jefe de Zona');

  const myChiefRecord = React.useMemo<Employee>(() => {
    const found = employees.find(
      (emp) =>
        (userProfile?.employeeId && emp.id === userProfile.employeeId) ||
        (userProfile?.email && emp.email?.toLowerCase() === userProfile.email.toLowerCase())
    );
    if (found) return found;

    return {
      id: userProfile?.employeeId || 'CHIEF-01',
      cedula: userProfile?.cedula || '1018999888',
      nombre: userProfile?.displayName?.split(' ')[0] || 'Carlos',
      apellido: userProfile?.displayName?.split(' ').slice(1).join(' ') || 'Restrepo',
      cargo: 'Jefe de Operaciones y Zona',
      departamento: 'Logística y Despachos',
      salarioBase: 2600000,
      tipoContrato: 'Término Indefinido',
      nivelRiesgoARL: 1,
      fechaIngreso: '2026-01-01',
      banco: 'Bancolombia',
      tipoCuenta: 'Ahorros',
      numeroCuenta: '300-000000-01',
      eps: 'Sura EPS',
      afp: 'Protección',
      ccf: 'Comfandi',
      activo: true,
      rol: 'Jefe de Zona',
      email: userProfile?.email || 'carlos.restrepo@sergem.com.co',
    };
  }, [employees, userProfile]);

  const [selectedJefeId, setSelectedJefeId] = useState<string>(() => {
    if (isChiefRole) return myChiefRecord.id;
    return jefesDeZona[0]?.id || myChiefRecord.id;
  });

  const effectiveJefeId = isChiefRole ? myChiefRecord.id : (selectedJefeId || myChiefRecord.id);

  const [selectedWeek, setSelectedWeek] = useState<string>('2026-08-03');
  const [filterClient, setFilterClient] = useState<string>('TODOS');

  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState<string>('');

  // Repartidores assigned to this Zone Chief or with schedules in the active week
  const repartidoresAsignados = employees.filter((e) => {
    if (e.rol !== 'Repartidor') return false;
    const isAssigned = !e.jefeZonaId || e.jefeZonaId === effectiveJefeId;
    const hasScheduleInWeek = schedules.some(
      (s) => s.repartidorId === e.id && s.semanaInicio === selectedWeek
    );
    return isAssigned || hasScheduleInWeek;
  });

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

  // Bulk Upload File State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [isProcessingBulk, setIsProcessingBulk] = useState<boolean>(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkWarnings, setBulkWarnings] = useState<string[]>([]);

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
          Lunes: { tipo: 'Descanso' },
          Martes: { tipo: 'Descanso' },
          Miércoles: { tipo: 'Descanso' },
          Jueves: { tipo: 'Descanso' },
          Viernes: { tipo: 'Descanso' },
          Sábado: { tipo: 'Descanso' },
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
    };

    onAddNovedad(newNov);
    setNovObservaciones('');
    setNovHoraInicio('09:00');
    setNovHoraFin('10:00');
  };

  // Descargar Plantilla Oficial Excel (.xlsx)
  const handleDownloadTemplate = () => {
    generateShiftScheduleExcel(employees, clients, selectedWeek);
  };

  // Procesar Carga Masiva Real de Turnos desde Excel (.xlsx, .xls, .csv)
  const handleBulkProcess = async () => {
    if (!bulkFile) {
      setBulkError('Por favor selecciona primero un archivo Excel (.xlsx, .xls) o CSV antes de procesar.');
      return;
    }

    setIsProcessingBulk(true);
    setBulkError(null);
    setBulkStatus('');
    setBulkWarnings([]);

    try {
      const result = await parseShiftScheduleExcel(
        bulkFile,
        employees,
        effectiveJefeId,
        selectedWeek
      );

      if (result.schedules.length === 0) {
        setBulkError('No se encontraron registros de turnos válidos en el archivo Excel.');
        setIsProcessingBulk(false);
        return;
      }

      // 1. Si se detectaron repartidores nuevos en el archivo, registrarlos en el sistema
      if (result.newEmployeesToCreate.length > 0 && onAddEmployee) {
        for (const newEmp of result.newEmployeesToCreate) {
          onAddEmployee(newEmp);
        }
      }

      // 2. Guardar cada programación semanal en Firestore y estado
      for (const sched of result.schedules) {
        onSaveSchedule(sched);
      }

      setBulkWarnings(result.warnings);
      setBulkStatus(
        `✅ ¡Carga masiva completada con éxito! Se procesaron e importaron ${result.schedules.length} cuadrantes semanales para la semana del ${result.summary.weekStart}.` +
        (result.newEmployeesToCreate.length > 0
          ? ` (${result.newEmployeesToCreate.length} repartidores nuevos fueron registrados automáticamente en el equipo).`
          : '')
      );
    } catch (err) {
      console.error('❌ [Error al procesar archivo de turnos]:', err);
      setBulkError(err instanceof Error ? err.message : 'Error al procesar el archivo Excel. Verifica el formato.');
    } finally {
      setIsProcessingBulk(false);
    }
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

        {/* Chief Selector or Locked Identity Badge */}
        {isChiefRole ? (
          <div className="bg-white p-4 rounded-2xl border border-amber-300 shadow-2xs flex items-center space-x-3.5 shrink-0 max-w-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200 shrink-0">
              <UserCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                Jefe de Zona Autenticado
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                {myChiefRecord.nombre} {myChiefRecord.apellido}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                C.C. {myChiefRecord.cedula} • {myChiefRecord.cargo}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs flex items-center space-x-3.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-purple-800 uppercase mb-0.5">Supervisar Jefe de Zona (Admin):</label>
              {jefesDeZona.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No hay jefes de zona registrados aún.</p>
              ) : (
                <select
                  value={selectedJefeId}
                  onChange={(e) => setSelectedJefeId(e.target.value)}
                  className="bg-slate-50 text-slate-900 font-extrabold text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  {jefesDeZona.map((jefe) => (
                    <option key={jefe.id} value={jefe.id}>
                      {jefe.nombre} {jefe.apellido} ({jefe.cargo})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Driver Shift Attendance & Contact Section (Solo Jefe de Zona) */}
      <UnconnectedDriversSection
        employees={employees}
        schedules={schedules}
        attendanceRecords={attendanceRecords}
        clientReports={clientReports}
        jefeZonaId={effectiveJefeId}
        variant="chief-portal"
        title="🚨 Repartidores No Conectados a su Turno (Llamada / WhatsApp)"
        subtitle="Monitoreo de asistencia para el día de hoy según la programación oficial. Comunícate de inmediato con el colaborador si no ha registrado inicio de turno."
        onQuickRecordAttendance={(empId) => {
          const emp = employees.find((e) => e.id === empId);
          if (emp && onRecordAttendance) {
            const info = getCurrentDateTimeInfo();
            onRecordAttendance({
              id: `${emp.id}_${info.fecha}`,
              repartidorId: emp.id,
              nombreRepartidor: `${emp.nombre} ${emp.apellido}`,
              fecha: info.fecha,
              diaSemana: info.diaSemana,
              horaInicioReal: info.horaActual,
              estado: 'CONECTADO',
              timestamp: new Date().toISOString(),
            });
          }
        }}
        onOpenNovedadModal={(empId) => {
          setNovRepartidorId(empId);
          setActiveSubTab('novedades_horas');
        }}
      />

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
                    const assignedClient = schedule
                      ? (Object.values(schedule.dias) as Array<{ clienteNombre?: string } | undefined>).find(
                          (d) => d && d.clienteNombre
                        )?.clienteNombre
                      : undefined;

                  return (
                    <div key={rep.id} className="p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 font-black flex items-center justify-center text-sm">
                            {rep.nombre.charAt(0)}{rep.apellido.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {rep.nombre} {rep.apellido}
                            </div>
                            <div className="text-xs text-slate-500">
                              Placa: <span className="font-mono font-bold text-slate-800">{rep.placaVehiculo || 'Sin Placa'}</span> • C.C. {rep.cedula} • Tel: <span className="font-mono font-semibold text-slate-700">{rep.telefono || 'Sin registrar'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons: Permanent Contact & Shift Scheduling */}
                        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                          {/* Permanent Call Button */}
                          <a
                            href={buildCallLink(rep.telefono)}
                            id={`btn-call-shift-${rep.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                            title={`Llamar a ${rep.nombre} (${rep.telefono || 'Sin teléfono'})`}
                          >
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                            <span>Llamar</span>
                          </a>

                          {/* Permanent WhatsApp Button */}
                          <a
                            href={buildDriverShiftWhatsAppLink(
                              rep.telefono,
                              `${rep.nombre} ${rep.apellido}`,
                              selectedWeek,
                              assignedClient
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            id={`btn-whatsapp-shift-${rep.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold shadow-2xs transition-colors cursor-pointer"
                            title={`Escribir por WhatsApp a ${rep.nombre} (${rep.telefono || 'Sin teléfono'})`}
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-white" />
                            <span>WhatsApp</span>
                          </a>

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

                          return (
                            <div
                              key={day}
                              className={`p-2.5 rounded-xl border text-xs font-medium space-y-1.5 flex flex-col justify-between ${
                                isDescanso
                                  ? 'bg-slate-50 border-slate-200 text-slate-400'
                                  : shift?.tipo === 'Partido'
                                  ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              }`}
                            >
                              <div>
                                <span className="font-bold text-[11px] block uppercase border-b border-slate-200/60 pb-0.5">
                                  {day}
                                </span>

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
                              </div>

                              {/* Client Badge */}
                              {!isDescanso && (
                                <div className="flex items-center space-x-1 bg-white/90 px-1.5 py-0.5 rounded-lg border border-slate-200 text-[10px] font-extrabold text-slate-800 truncate shadow-2xs mt-1">
                                  <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                                  <span className="truncate" title={shift.clienteNombre || 'Almacenes Éxito S.A.'}>
                                    {shift.clienteNombre || 'Almacenes Éxito S.A.'}
                                  </span>
                                </div>
                              )}
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
                        <div className="space-y-1">
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
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-8">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs mb-2 border border-emerald-200/80">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Importador Oficial de Malla de Turnos</span>
            </div>
            <h3 className="font-black text-xl text-slate-900 flex items-center space-x-2">
              <span>Carga Masiva de Programación Semanal</span>
            </h3>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Descarga la plantilla oficial prediseñada en Excel, diligencia los turnos y clientes asignados a tu equipo para la semana del <strong>{selectedWeek}</strong>, y súbela para actualizar automáticamente el sistema en Firestore.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PASO 1: Descargar Plantilla */}
            <div className="bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 border-2 border-emerald-200/90 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-2xs">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Descargar Plantilla Oficial Excel
                    </h4>
                    <p className="text-xs text-slate-500">
                      Formato .xlsx con estructura validada
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Genera automáticamente un libro de Excel pre-configurado con las columnas oficiales de los 7 días de la semana, listado de clientes activos y los repartidores de tu zona.
                </p>

                <div className="bg-white p-3 rounded-xl border border-emerald-100 text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-emerald-900">Incluye en el archivo:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                    <li>Hoja 1: Matriz semanal de Lunes a Domingo por repartidor</li>
                    <li>Hoja 2: Guía de tipos de turno válidos y códigos de clientes</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Plantilla Excel (.xlsx)</span>
                </button>
                <div className="text-center">
                  <a
                    href="/Plantilla_Carga_Masiva_Turnos_SERGEM.xlsx"
                    download="Plantilla_Carga_Masiva_Turnos_SERGEM.xlsx"
                    className="inline-flex items-center space-x-1 text-[11px] text-slate-500 hover:text-emerald-700 underline"
                  >
                    <span>O descargar copia estática del archivo base</span>
                  </a>
                </div>
              </div>
            </div>

            {/* PASO 2: Subir y Procesar */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-2xs">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
                    2
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Cargar y Procesar Archivo
                    </h4>
                    <p className="text-xs text-slate-500">
                      Soporta .xlsx, .xls y .csv (Hasta 10MB)
                    </p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50 hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setBulkFile(e.target.files[0]);
                        setBulkError(null);
                        setBulkStatus('');
                        setBulkWarnings([]);
                      }
                    }}
                    className="hidden"
                    id="bulk-file-input"
                  />

                  {bulkFile ? (
                    <div className="space-y-2">
                      <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{bulkFile.name} ({(bulkFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <div>
                        <label
                          htmlFor="bulk-file-input"
                          className="text-[11px] text-indigo-600 hover:underline cursor-pointer font-bold"
                        >
                          Cambiar archivo seleccionado
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileSpreadsheet className="w-8 h-8 text-indigo-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">
                        Selecciona o arrastra el archivo de Excel diligenciado
                      </p>
                      <label
                        htmlFor="bulk-file-input"
                        className="inline-block px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs cursor-pointer border border-indigo-200 transition-colors"
                      >
                        Examinar equipo...
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  disabled={!bulkFile || isProcessingBulk}
                  onClick={handleBulkProcess}
                  className={`w-full py-3 px-4 font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all ${
                    !bulkFile || isProcessingBulk
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  {isProcessingBulk ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Compilando y guardando turnos...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Procesar Carga Masiva e Importar Turnos</span>
                    </>
                  )}
                </button>

                {/* Mensajes de Resultado */}
                {bulkStatus && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-start space-x-2.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{bulkStatus}</span>
                  </div>
                )}

                {bulkError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs font-semibold flex items-start space-x-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{bulkError}</span>
                  </div>
                )}

                {bulkWarnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
                    <div className="font-bold flex items-center space-x-1 text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Avisos de importación:</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                      {bulkWarnings.slice(0, 4).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                      {bulkWarnings.length > 4 && (
                        <li>... y {bulkWarnings.length - 4} avisos más.</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Guía Rápida de Tipos de Turnos */}
          <div className="border border-slate-200 bg-slate-50/70 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Glosario de Tipos de Turno para la Carga</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-blue-700">Continua</span>
                <p className="text-slate-500 text-[11px]">Jornada corrida estándar de 8 horas. Requiere Hora Inicio 1 y Hora Fin 1 (ej: 07:00 a 15:00).</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-amber-700">Partido</span>
                <p className="text-slate-500 text-[11px]">Dos bloques de turno. Diligencia Inicio 1 / Fin 1 e Inicio 2 / Fin 2 (ej: 07:00-11:00 y 14:00-18:00).</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-emerald-700">Descanso</span>
                <p className="text-slate-500 text-[11px]">Día libre compensatorio. Los campos de cliente y horarios pueden dejarse vacíos.</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-purple-700">Medio Tiempo</span>
                <p className="text-slate-500 text-[11px]">Mañana o Tarde. Diligencia 'Medio Tiempo Mañana' o 'Medio Tiempo Tarde' con sus 4 horas.</p>
              </div>
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
                          {rep.nombre} {rep.apellido} — C.C. {rep.cedula} ({rep.ciudad || rep.cargo})
                        </option>
                      ))}
                  </select>

                  {/* Immediate WhatsApp / Call to Driver in Schedule Modal */}
                  {(() => {
                    const selectedModalRep = employees.find((e) => e.id === editingSchedule.repartidorId);
                    if (!selectedModalRep) return null;
                    return (
                      <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-200/80">
                        <a
                          href={buildCallLink(selectedModalRep.telefono)}
                          id="btn-modal-call-driver"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                          title={`Llamar a ${selectedModalRep.nombre}`}
                        >
                          <Phone className="w-3 h-3 text-blue-600" />
                          <span>Llamar ({selectedModalRep.telefono || 'Sin teléfono'})</span>
                        </a>
                        <a
                          href={buildDriverShiftWhatsAppLink(
                            selectedModalRep.telefono,
                            `${selectedModalRep.nombre} ${selectedModalRep.apellido}`,
                            editingSchedule.semanaInicio
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          id="btn-modal-whatsapp-driver"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold shadow-2xs transition-colors cursor-pointer"
                          title={`WhatsApp a ${selectedModalRep.nombre}`}
                        >
                          <MessageCircle className="w-3 h-3 text-white" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    );
                  })()}
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
    </div>
  );
};
