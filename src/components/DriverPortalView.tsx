import React, { useState, useMemo, useEffect } from 'react';
import { Employee, WeeklySchedule, ClientOrderReport, AuthUser, DriverDailyAttendance } from '../types/payroll';
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
  Plus,
  Trash2,
  UploadCloud,
  Loader2
} from 'lucide-react';
import { storageService } from '../services/storage';

interface DriverPortalViewProps {
  employees: Employee[];
  schedules: WeeklySchedule[];
  clientReports: ClientOrderReport[];
  currentUser?: AuthUser | null;
  attendanceMap?: Record<string, DriverDailyAttendance>;
  onAddClientReport?: (report: ClientOrderReport) => void;
  onUpdateAttendance?: (employeeId: string, updates: Partial<DriverDailyAttendance>) => void;
}

export const DriverPortalView: React.FC<DriverPortalViewProps> = ({
  employees,
  schedules,
  clientReports,
  currentUser,
  attendanceMap = {},
  onAddClientReport,
  onUpdateAttendance,
}) => {
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

  // Active Driver state (default to logged in driver or first driver)
  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    if (currentUser && currentUser.rol === 'Repartidor') {
      return currentUser.id;
    }
    return drivers[0]?.id || '';
  });

  useEffect(() => {
    if (currentUser && currentUser.rol === 'Repartidor') {
      setSelectedDriverId(currentUser.id);
    }
  }, [currentUser]);

  const selectedDriver = useMemo(() => {
    return (
      employees.find((emp) => emp.id === selectedDriverId) ||
      (currentUser && currentUser.id === selectedDriverId
        ? ({
            id: currentUser.id,
            cedula: currentUser.cedula,
            nombre: currentUser.nombre,
            apellido: currentUser.apellido,
            cargo: currentUser.cargo,
            departamento: currentUser.departamento || 'Operaciones y Mensajería',
            salarioBase: 1423500,
            tipoContrato: 'Término Indefinido',
            nivelRiesgoARL: 4,
            fechaIngreso: '2026-01-01',
            banco: 'Bancolombia',
            tipoCuenta: 'Ahorros',
            numeroCuenta: '394-112390-12',
            eps: 'SURA EPS',
            afp: 'Protección',
            ccf: 'Comfandi',
            activo: true,
            rol: currentUser.rol,
            placaVehiculo: currentUser.placaVehiculo || 'VTX-89D',
          } as Employee)
        : undefined) ||
      drivers[0] ||
      undefined
    );
  }, [employees, selectedDriverId, drivers, currentUser]);

  // Selected week for schedule view
  const [selectedWeek, setSelectedWeek] = useState<string>('2026-08-03');

  // Driver's schedule for selected week
  const driverSchedule = useMemo(() => {
    return schedules.find(
      (s) =>
        s.repartidorId === selectedDriverId && s.semanaInicio === selectedWeek
    );
  }, [schedules, selectedDriverId, selectedWeek]);

  // Shift Control State for Today
  const [auditPhoto, setAuditPhoto] = useState<string | null>(null);
  const [auditPhotoLocked, setAuditPhotoLocked] = useState<boolean>(false);

  // Shift status
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
  const [paquetesCount, setPaquetesCount] = useState<number | ''>(35);
  const [ventaNeta, setVentaNeta] = useState<number | ''>(1250000);

  // REQUERIMIENTO: SALIDAS FUERA DEL PERÍMETRO EN EL PORTAL DE REPARTIDOR
  const [salidasFueraCount, setSalidasFueraCount] = useState<number>(0);
  const [tarifaSalidaPerimetro, setTarifaSalidaPerimetro] = useState<number>(22000);
  const [destinoPerimetro, setDestinoPerimetro] = useState<string>('Yumbo (Zona Industrial)');
  const [observacionPerimetro, setObservacionPerimetro] = useState<string>('');

  // Desglose de horas del turno (Base 42h)
  const [horasOrd, setHorasOrd] = useState<number>(8);
  const [horasExtDiurnas, setHorasExtDiurnas] = useState<number>(0);
  const [horasExtNocturnas, setHorasExtNocturnas] = useState<number>(0);
  const [horasDomFestivas, setHorasDomFestivas] = useState<number>(0);
  const [recargoNocturnoHoras, setRecargoNocturnoHoras] = useState<number>(0);
  const [recargoFestivoHoras, setRecargoFestivoHoras] = useState<number>(0);

  // Success message state
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Default client & shift type for today
  const todayShift = driverSchedule?.dias['Lunes'] || {
    tipo: 'Partido' as const,
    clienteNombre: 'Almacenes Éxito S.A.',
    horaInicio1: '07:00',
    horaFin1: '11:00',
    horaInicio2: '14:00',
    horaFin2: '18:00',
  };

  const isTurnoPartido = todayShift.tipo === 'Partido';
  const clienteHoy = todayShift.clienteNombre || 'Almacenes Éxito S.A.';

  // Photo Capture
  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (auditPhotoLocked) return;

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAuditPhoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSimulatePhoto = () => {
    if (auditPhotoLocked) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 320, 240);

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(40, 40, 240, 160);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('AUDITORIA SERGEM', 70, 90);
      ctx.fillText(`C.C. ${selectedDriver?.cedula || '12345'}`, 70, 120);
      ctx.fillText(`PLACA: ${selectedDriver?.placaVehiculo || 'VTX-89D'}`, 70, 150);
      ctx.fillText(new Date().toLocaleTimeString('es-CO'), 70, 180);

      setAuditPhoto(canvas.toDataURL());
    }
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleLockPhotoAndValidate = async () => {
    if (!auditPhoto) return;
    setAuditPhotoLocked(true);

    let finalPhotoUrl = auditPhoto;

    // Asynchronously persist to Supabase Storage bucket 'driver-audits'
    if (selectedDriver) {
      setIsUploadingPhoto(true);
      try {
        const path = `repartidores/${selectedDriver.cedula}/auditoria_${new Date().toISOString().split('T')[0]}_${Date.now()}.jpg`;
        const uploadRes = await storageService.uploadBase64('driver-audits', path, auditPhoto, 'image/jpeg');
        if (uploadRes.url) {
          finalPhotoUrl = uploadRes.url;
        }
      } catch (err) {
        console.warn('[DriverPortalView] Error subiendo foto a Supabase Storage:', err);
      } finally {
        setIsUploadingPhoto(false);
      }

      if (onUpdateAttendance) {
        onUpdateAttendance(selectedDriver.id, {
          fotoAuditoria: finalPhotoUrl,
          estado: 'PENDIENTE_INICIO',
        });
      }
    }
  };

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

    if (selectedDriver && onUpdateAttendance) {
      onUpdateAttendance(selectedDriver.id, {
        estado: 'INICIADO',
        horaConexionReal: nowTime,
      });
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

    if (selectedDriver && onUpdateAttendance) {
      onUpdateAttendance(selectedDriver.id, {
        estado: 'FINALIZADO',
        salidasFueraPerimetro: salidasFueraCount,
        valorFueraPerimetro: salidasFueraCount * tarifaSalidaPerimetro,
      });
    }
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
    const valorFueraTotal = salidasFueraCount * tarifaSalidaPerimetro;
    const totalHorasCalculadas = Number(horasOrd) + Number(horasExtDiurnas) + Number(horasExtNocturnas) + Number(horasDomFestivas);

    const newReport: ClientOrderReport = {
      id: `REP-${Date.now()}`,
      clienteId: chosenClient.includes('Éxito')
        ? 'CLI-001'
        : chosenClient.includes('Homecenter')
        ? 'CLI-002'
        : chosenClient.includes('Alkosto')
        ? 'CLI-003'
        : chosenClient.includes('Cruz Verde')
        ? 'CLI-004'
        : 'CLI-GEN',
      nombreCliente: chosenClient,
      repartidorId: selectedDriver.id,
      nombreRepartidor: `${selectedDriver.nombre} ${selectedDriver.apellido}`,
      placaVehiculo: selectedDriver.placaVehiculo || 'VTX-89D',
      fecha: new Date().toISOString().split('T')[0],
      horasTrabajadas: totalHorasCalculadas > 0 ? totalHorasCalculadas : 8,
      horasOrdinarias: Number(horasOrd) || 8,
      horasExtrasDiurnas: Number(horasExtDiurnas) || 0,
      horasExtrasNocturnas: Number(horasExtNocturnas) || 0,
      horasFestivas: Number(horasDomFestivas) || 0,
      recargoNocturno: Number(recargoNocturnoHoras) || 0,
      recargoFestivo: Number(recargoFestivoHoras) || 0,
      // Salidas fuera de perímetro
      salidasFueraPerimetro: salidasFueraCount,
      valorFueraPerimetro: valorFueraTotal,
      detallesFueraPerimetro:
        salidasFueraCount > 0
          ? [
              {
                destino: destinoPerimetro,
                cantidad: salidasFueraCount,
                tarifaUnitaria: tarifaSalidaPerimetro,
                observacion: observacionPerimetro || undefined,
              },
            ]
          : undefined,
      paquetesEntregados: Number(paquetesCount) || 0,
      ventaNeta: Number(ventaNeta) || 0,
    };

    if (onAddClientReport) {
      onAddClientReport(newReport);
    }

    setIsSavedRecently(true);
    setSuccessMessage(
      `¡Reporte diario guardado exitosamente para ${selectedDriver.nombre}! Se registraron ${paquetesCount} paquetes, $${Number(
        ventaNeta
      ).toLocaleString('es-CO')} en venta, ${salidasFueraCount} salidas fuera de perímetro ($${valorFueraTotal.toLocaleString(
        'es-CO'
      )}) y ${totalHorasCalculadas || 8} horas de jornada (${chosenClient}).`
    );

    setTimeout(() => {
      setIsSavedRecently(false);
    }, 4000);

    setTimeout(() => {
      setSuccessMessage('');
    }, 9000);
  };

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div id="driver-portal-view" className="space-y-6">
      {/* Header Banner */}
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
            Consulte su programación semanal, capture la foto obligatoria de auditoría antes de iniciar turno, controle el cierre de jornada, registre sus entregas diarias y reporte sus salidas fuera del perímetro urbano.
          </p>
        </div>

        {/* Driver Selector Switcher */}
        <div className="bg-white border border-slate-300/90 p-4 rounded-2xl shrink-0 w-full md:w-80 shadow-2xs">
          <label className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center space-x-1.5 mb-2">
            <UserCheck className="w-4 h-4 text-red-600" />
            <span>Repartidor Seleccionado</span>
          </label>
          <select
            value={selectedDriverId}
            onChange={(e) => {
              setSelectedDriverId(e.target.value);
              setAuditPhoto(null);
              setAuditPhotoLocked(false);
              setShiftStatus('PENDIENTE_INICIO');
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            {drivers.length === 0 ? (
              <option value="">Sin Repartidores registrados</option>
            ) : (
              drivers.map((drv) => (
                <option key={drv.id} value={drv.id}>
                  {drv.nombre} {drv.apellido} - C.C. {drv.cedula} ({drv.placaVehiculo || 'Sin Placa'})
                </option>
              ))
            )}
          </select>
          <div className="mt-2.5 text-[11px] text-slate-500 flex items-center justify-between font-semibold border-t border-slate-100 pt-2">
            <span>Cargo: <strong className="text-slate-800">{selectedDriver?.cargo || 'N/A'}</strong></span>
            <span>Placa: <strong className="text-red-700 font-mono font-black">{selectedDriver?.placaVehiculo || 'Sin Placa'}</strong></span>
          </div>
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
            <Calendar className="w-5 h-5 text-red-600" />
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide">
              1. Programación de la Semana
            </h3>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-bold">Semana:</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 cursor-pointer focus:ring-2 focus:ring-red-500"
            >
              <option value="2026-08-03">03 Ago - 09 Ago 2026</option>
              <option value="2026-08-10">10 Ago - 16 Ago 2026</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {daysOfWeek.map((day) => {
              const shift = driverSchedule?.dias[day as keyof WeeklySchedule['dias']];
              const isRest = !shift || shift.tipo === 'Descanso';
              const isToday = day === 'Lunes';

              return (
                <div
                  key={day}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isToday
                      ? 'bg-red-50/70 border-red-300 shadow-xs ring-2 ring-red-400/20'
                      : isRest
                      ? 'bg-slate-50 border-slate-200 text-slate-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-black uppercase ${isToday ? 'text-red-700' : 'text-slate-700'}`}>
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded-md">
                        HOY
                      </span>
                    )}
                  </div>

                  {isRest ? (
                    <div className="py-3 text-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Descanso
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded block truncate">
                        {shift.clienteNombre || 'Cliente General'}
                      </span>
                      <div className="font-mono text-[11px] font-black text-slate-800">
                        {shift.horaInicio1} - {shift.horaFin1}
                      </div>
                      {shift.tipo === 'Partido' && shift.horaInicio2 && (
                        <div className="font-mono text-[11px] font-black text-indigo-900 border-t border-slate-100 pt-0.5">
                          {shift.horaInicio2} - {shift.horaFin2}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 font-semibold block pt-1">
                        {shift.tipo}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2 & 3. CONTROL DE JORNADA & AUDITORIA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: FOTO AUDITORIA & CONTROL DE TURNOS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* REQUERIMIENTO 2: FOTO OBLIGATORIA DE AUDITORÍA */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-100 text-red-700 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    2. Foto Obligatoria de Auditoría (Antes de Iniciar Turno)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Evidencia fotográfica obligatoria antes de habilitar el inicio de jornada.
                  </p>
                </div>
              </div>
              {auditPhotoLocked && (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Auditado</span>
                </span>
              )}
            </div>

            {/* Photo Capture Preview Box */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center min-h-[220px]">
              {auditPhoto ? (
                <div className="relative w-full flex flex-col items-center space-y-3">
                  <img
                    src={auditPhoto}
                    alt="Auditoría Repartidor"
                    className="max-h-52 rounded-xl object-cover border-2 border-slate-400 shadow-md"
                  />
                  <div className="text-center text-xs font-bold text-slate-700">
                    Foto capturada: <strong>{selectedDriver?.nombre}</strong> ({selectedDriver?.placaVehiculo || 'VTX-89D'})
                  </div>
                  {!auditPhotoLocked && (
                    <button
                      type="button"
                      onClick={handleLockPhotoAndValidate}
                      disabled={isUploadingPhoto}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black rounded-xl text-xs flex items-center space-x-2 shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando en Storage...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Validar y Bloquear Foto (Habilitar Turno)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-3 p-4">
                  <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Tome una fotografía clara de su dotación y carnet</p>
                    <p className="text-[11px] text-slate-400">Requerido por seguridad y auditoría de SERGEM</p>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <label className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs flex items-center space-x-1.5 transition-all">
                      <Camera className="w-4 h-4" />
                      <span>Abrir Cámara / Subir</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleCapturePhoto}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleSimulatePhoto}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs flex items-center space-x-1.5 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Simular Captura</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* REQUERIMIENTO 3: CONTROL DE TURNOS (INICIAR, PAUSAR/MEDIO TIEMPO, CERRAR) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    3. Control de Turno de Hoy ({isTurnoPartido ? 'Turno Partido' : 'Jornada Continua'})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cliente asignado hoy: <strong>{clienteHoy}</strong>
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {isTurnoPartido ? '2 Tramos (Mañana / Tarde)' : '1 Tramo Continuo'}
              </span>
            </div>

            {/* Shift Flow Stage Cards */}
            <div className="space-y-4">
              
              {/* STAGE 1: PENDIENTE INICIO */}
              {shiftStatus === 'PENDIENTE_INICIO' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-center">
                  <div className="text-xs text-slate-600 font-medium">
                    {auditPhotoLocked ? (
                      <span className="text-emerald-700 font-bold flex items-center justify-center space-x-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Foto validada con éxito. Ya puede iniciar su turno de hoy.</span>
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold flex items-center justify-center space-x-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>Primero tome y bloquee la foto obligatoria arriba para habilitar el botón.</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!auditPhotoLocked}
                    onClick={handleStartShift}
                    className={`w-full py-3.5 px-4 font-black rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md transition-all ${
                      auditPhotoLocked
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer hover:scale-[1.01]'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>INICIAR TURNO {isTurnoPartido ? 'MAÑANA' : 'JORNADA'}</span>
                  </button>
                </div>
              )}

              {/* STAGE 2: TURNO PARTIDO - MAÑANA EN CURSO */}
              {isTurnoPartido && shiftStatus === 'INICIADO_MANANA' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-bold flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Jornada Mañana Iniciada a las: <strong>{horaInicio}</strong></span>
                    </span>
                    <span className="text-[11px] bg-blue-200 px-2 py-0.5 rounded-md">En Curso</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseMorningShift}
                    className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    <span>CERRAR TURNO MAÑANA (IR A ALMUERZO/DESCANSO)</span>
                  </button>
                </div>
              )}

              {/* STAGE 3: TURNO PARTIDO - ESPERANDO TARDE */}
              {isTurnoPartido && shiftStatus === 'FINALIZADO_MANANA' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold">
                    ✓ Turno mañana cerrado a las: <strong>{horaFinManana}</strong>. En pausa de almuerzo/receso.
                  </div>

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

              {/* STAGE 5: JORNADA CONTINUA EN CURSO */}
              {!isTurnoPartido && shiftStatus === 'INICIADO_CONTINUA' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-bold flex items-center justify-between">
                    <span>Jornada Continua Iniciada a las: <strong>{horaInicio}</strong></span>
                    <span className="text-[11px] bg-blue-200 px-2 py-0.5 rounded-md">En Curso</span>
                  </div>

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

        {/* RIGHT COLUMN: REGISTRO DIARIO, SALIDAS FUERA DE PERÍMETRO Y HORAS */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSubmitReport} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">4, 5 & Extras. Registro Diario de Producción</h3>
                  <p className="text-xs text-slate-500">Paquetes, ventas, salidas fuera de perímetro y horas.</p>
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
                <option value="Sodimac Colombia S.A. (Homecenter)">Sodimac Colombia S.A. (Homecenter)</option>
                <option value="Colombiana de Comercio S.A. (Alkosto)">Colombiana de Comercio S.A. (Alkosto)</option>
                <option value="Droguerías Cruz Verde S.A.S.">Droguerías Cruz Verde S.A.S.</option>
              </select>
            </div>

            {/* REQUERIMIENTO EXPLÍCITO: SALIDAS FUERA DEL PERÍMETRO */}
            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                  <Compass className="w-4 h-4 text-amber-700" />
                  <span>Salidas Fuera del Perímetro Urbano (Extra-Radio)</span>
                </label>
                <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  {salidasFueraCount > 0 ? `${salidasFueraCount} Salidas ($${(salidasFueraCount * tarifaSalidaPerimetro).toLocaleString('es-CO')})` : '0 Registradas'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-amber-900 block mb-1">Cantidad de Salidas:</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={salidasFueraCount}
                    onChange={(e) => setSalidasFueraCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-mono font-black text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-900 block mb-1">Tarifa por Salida ($):</label>
                  <input
                    type="number"
                    min={0}
                    value={tarifaSalidaPerimetro}
                    onChange={(e) => setTarifaSalidaPerimetro(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-mono font-black text-sm text-amber-950 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-amber-900 block mb-1">Destino / Municipio:</label>
                <select
                  value={destinoPerimetro}
                  onChange={(e) => setDestinoPerimetro(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="Yumbo (Zona Industrial / Acopi)">Yumbo (Zona Industrial / Acopi)</option>
                  <option value="Jamundí (Ciudad Country / Alfaguara)">Jamundí (Ciudad Country / Alfaguara)</option>
                  <option value="Palmira (Zona Franca / Centro)">Palmira (Zona Franca / Centro)</option>
                  <option value="Candelaria / Poblado Campestre">Candelaria / Poblado Campestre</option>
                  <option value="Puerto Tejada (Parques Industriales)">Puerto Tejada (Parques Industriales)</option>
                  <option value="La Buitrera / Dapa / Zona Rural">La Buitrera / Dapa / Zona Rural</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Justificación / Número de guía o remisión..."
                  value={observacionPerimetro}
                  onChange={(e) => setObservacionPerimetro(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* REQUERIMIENTO 4: INGRESAR MANUALMENTE CANTIDAD DE PAQUETES */}
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
            </div>

            {/* DESGLOSE DE HORAS DEL TURNO */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Desglose de Horas del Día (Base 42h)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block">Horas Ord:</label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={horasOrd}
                    onChange={(e) => setHorasOrd(parseFloat(e.target.value) || 0)}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-blue-700 block">HED (+25%):</label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={horasExtDiurnas}
                    onChange={(e) => setHorasExtDiurnas(parseFloat(e.target.value) || 0)}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-700 block">HEN (+75%):</label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={horasExtNocturnas}
                    onChange={(e) => setHorasExtNocturnas(parseFloat(e.target.value) || 0)}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-purple-700 block">Dom/Fest (+100%):</label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={horasDomFestivas}
                    onChange={(e) => setHorasDomFestivas(parseFloat(e.target.value) || 0)}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-purple-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 block">Rec. Noct (+35%):</label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={recargoNocturnoHoras}
                    onChange={(e) => setRecargoNocturnoHoras(parseFloat(e.target.value) || 0)}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-purple-600 block">Rec. Fest (+75%):</label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={recargoFestivoHoras}
                    onChange={(e) => setRecargoFestivoHoras(parseFloat(e.target.value) || 0)}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>
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
          </form>

          {/* MIS REPORTES REGISTRADOS LIST */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-xs uppercase text-slate-800 tracking-wider flex items-center space-x-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Mis Reportes Registrados ({driverReports.length})</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-400">Total Período</span>
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
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-all"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{rep.nombreCliente}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {rep.fecha} | Placa: <strong className="text-amber-700">{rep.placaVehiculo}</strong>
                        {rep.salidasFueraPerimetro > 0 && (
                          <span className="ml-1.5 text-amber-800 font-bold bg-amber-100 px-1 rounded">
                            {rep.salidasFueraPerimetro} Fuera Perímetro
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
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
              <p>• Jornada Semanal Máxima: <strong className="text-purple-900 font-bold">42 Horas Semanales</strong></p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
