import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Employee,
  WeeklySchedule,
  ClientOrderReport,
  DriverAttendanceRecord,
  AppRole,
  AppUserProfile,
  PuntoVenta,
  CompanyClient,
  Empresa
} from '../types/payroll';
import {
  getCurrentDateTimeInfo,
  buildCallLink,
  buildDriverShiftWhatsAppLink,
  buildDriverToZoneChiefWhatsAppLink,
  getMondayOfDate,
  formatWeekRangeSpanish,
  getAvailableScheduleWeeks,
  MONTHS_SPANISH,
  normalizeExcelWeekDate
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
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  X
} from 'lucide-react';

interface DriverPortalViewProps {
  employees: Employee[];
  schedules: WeeklySchedule[];
  clientReports: ClientOrderReport[];
  attendanceRecords?: DriverAttendanceRecord[];
  pointsOfSale?: PuntoVenta[];
  clients?: CompanyClient[];
  companies?: Empresa[];
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
  pointsOfSale = [],
  clients = [],
  companies = [],
  onAddClientReport,
  onRecordAttendance,
  defaultDriverId,
  currentRole = 'Repartidor',
  userProfile,
}) => {
  const isRepartidorRole = currentRole === 'Repartidor';

  // Extract invite query parameters for direct link authentication
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const inviteEmail = urlParams?.get('invite_email') || null;
  const inviteEmpId = urlParams?.get('emp_id') || null;
  const inviteCedula = urlParams?.get('cedula') || null;
  const inviteEmpName = urlParams?.get('emp_name') || null;
  const inviteToken = urlParams?.get('token') || null;

  // Local override state when driver enters their cédula/email directly to validate access
  const [driverValidationOverride, setDriverValidationOverride] = useState<Employee | null>(null);

  const cleanDigits = (v: any) => String(v || '').replace(/\D/g, '');
  const normalizeText = (v: any) =>
    String(v || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const targetEmail = (userProfile?.email || inviteEmail || '').trim().toLowerCase();
  const targetEmpId = (userProfile?.employeeId || defaultDriverId || inviteEmpId || '').trim();
  const targetCedula = (userProfile?.cedula || inviteCedula || '').trim();

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

  // STRICT AUTHENTICATION: Match logged-in user or link to their specific employee record
  const matchedDriver = useMemo<Employee | null>(() => {
    if (driverValidationOverride) return driverValidationOverride;

    // 1. Match by employee ID or clean digits of ID
    if (targetEmpId) {
      const targetEmpDigits = cleanDigits(targetEmpId);
      const byId = employees.find(
        (emp) =>
          emp.id.trim() === targetEmpId ||
          (emp.cedula && emp.cedula.trim() === targetEmpId) ||
          (targetEmpDigits && cleanDigits(emp.id) === targetEmpDigits) ||
          (targetEmpDigits && emp.cedula && cleanDigits(emp.cedula) === targetEmpDigits) ||
          (targetEmpId.startsWith('EMP-') && emp.id.trim() === targetEmpId)
      );
      if (byId) return byId;
    }

    // 2. Match by cédula (clean numeric digits)
    if (targetCedula) {
      const targetCedDigits = cleanDigits(targetCedula);
      if (targetCedDigits) {
        const byCedula = employees.find(
          (emp) =>
            (emp.cedula && cleanDigits(emp.cedula) === targetCedDigits) ||
            cleanDigits(emp.id) === targetCedDigits
        );
        if (byCedula) return byCedula;
      }
    }

    // 3. Match by email
    if (targetEmail) {
      const byEmail = employees.find(
        (emp) => emp.email && emp.email.trim().toLowerCase() === targetEmail
      );
      if (byEmail) return byEmail;
    }

    // 4. Match by displayName or inviteEmpName
    const searchName = normalizeText(userProfile?.displayName || inviteEmpName || '');
    if (searchName && searchName.length >= 3) {
      const byName = employees.find((emp) => {
        const full = normalizeText(`${emp.nombre} ${emp.apellido}`);
        return (
          full === searchName ||
          (searchName.length >= 6 && (full.includes(searchName) || searchName.includes(full)))
        );
      });
      if (byName) return byName;
    }

    return null;
  }, [employees, targetEmpId, targetEmail, targetCedula, userProfile?.displayName, inviteEmpName, driverValidationOverride]);

  // Resolved driver record for this session
  const myRepartidorRecord = useMemo<Employee>(() => {
    if (matchedDriver) return matchedDriver;

    return {
      id: targetEmpId || defaultDriverId || 'EMP-REP-01',
      cedula: targetCedula || 'Sin Cédula Registrada',
      nombre: userProfile?.displayName?.split(' ')[0] || inviteEmpName?.split(' ')[0] || 'Repartidor',
      apellido: userProfile?.displayName?.split(' ').slice(1).join(' ') || inviteEmpName?.split(' ').slice(1).join(' ') || 'SERGEM',
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
      email: targetEmail || 'repartidor@sergem.com.co',
    };
  }, [matchedDriver, targetEmpId, targetCedula, targetEmail, defaultDriverId, userProfile?.displayName, inviteEmpName]);

  // STRICT ACCESS ISOLATION: A driver can ONLY and EXCLUSIVELY see their own profile, schedule, and reports.
  const isStrictRepartidor = isRepartidorRole || !!inviteEmail || !!inviteEmpId || userProfile?.role === 'Repartidor';

  // The active driver profile is ALWAYS locked to the authenticated user in driver mode
  const selectedDriver = myRepartidorRecord;

  // Derived / Effective Points of Sale list (from pointsOfSale or clients)
  const effectivePointsOfSale = useMemo<PuntoVenta[]>(() => {
    if (pointsOfSale && pointsOfSale.length > 0) return pointsOfSale;
    if (clients && clients.length > 0) {
      return clients.map((cli) => ({
        id: cli.id,
        centroCostoId: cli.centroCostoId || 'CC-01',
        centroCostoNombre: cli.centroCostoNombre || 'Operación General y Despacho',
        empresaId: cli.empresaId || 'EMP-01',
        empresaNombre: cli.empresaNombre || cli.nombre.split(' - ')[0] || cli.nombre,
        codigo: cli.codigoPunto || `PV-${cli.id.slice(-3)}`,
        nombre: cli.nombre,
        ciudad: cli.ciudad || 'Cali',
        direccion: cli.direccion || 'Sede Principal',
        supervisorContacto: cli.contactoNombre,
        telefonoContacto: cli.contactoTelefono,
        emailContacto: cli.contactoEmail,
        tarifaHoraBase: cli.tarifaHoraBase,
        observaciones: cli.observaciones,
        activo: cli.activo,
        fechaCreacion: cli.fechaCreacion || new Date().toISOString().split('T')[0],
      }));
    }
    return [];
  }, [pointsOfSale, clients]);

  // Current Monday of reference date (mes en curso)
  const currentMonday = useMemo(() => getMondayOfDate(new Date()), []);

  // Compute available weeks dynamically: includes current month, adjacent months and existing schedules
  const availableWeeks = useMemo(() => {
    return getAvailableScheduleWeeks(schedules, selectedDriver?.id, new Date(), selectedDriver);
  }, [schedules, selectedDriver]);

  // Selected week for schedule view: defaults dynamically to current Monday of the active month
  const [selectedWeek, setSelectedWeek] = useState<string>(() => currentMonday);

  // If selectedWeek is not in availableWeeks and availableWeeks is loaded, fallback to currentMonday
  useEffect(() => {
    if (availableWeeks.length > 0 && !availableWeeks.some((w) => w.value === selectedWeek)) {
      setSelectedWeek(currentMonday);
    }
  }, [availableWeeks, currentMonday, selectedWeek]);

  // Helper to match schedule to driver (by ID, clean numeric cédula, substring, or employee registry)
  const isScheduleForDriver = (s: WeeklySchedule, driver: Employee) => {
    if (!s || !driver) return false;
    const sRepId = (s.repartidorId || '').trim();
    if (!sRepId) return false;

    // 1. Direct ID match
    if (sRepId === driver.id.trim()) return true;

    // 2. ID without EMP- prefix
    if (driver.id.replace(/^EMP-?/i, '').trim() === sRepId.replace(/^EMP-?/i, '').trim()) return true;

    // 3. Clean numeric digits comparison (cédula or numeric ID, e.g. 1020456789 vs 1.020.456.789 vs EMP-1020456789)
    const cleanDriverCedula = cleanDigits(driver.cedula);
    const cleanSchedId = cleanDigits(sRepId);
    if (cleanDriverCedula && cleanSchedId && cleanDriverCedula === cleanSchedId) return true;

    // 4. Substring cédula match
    if (cleanDriverCedula && sRepId.includes(cleanDriverCedula)) return true;
    if (cleanSchedId && driver.cedula && driver.cedula.includes(cleanSchedId)) return true;

    // 5. Look up via employees map
    const schedEmp = employees.find((e) => e.id === sRepId || e.cedula === sRepId);
    if (schedEmp) {
      if (schedEmp.id === driver.id) return true;
      const cleanSchedEmpCedula = cleanDigits(schedEmp.cedula);
      if (cleanDriverCedula && cleanSchedEmpCedula && cleanDriverCedula === cleanSchedEmpCedula) return true;
      if (driver.email && schedEmp.email && driver.email.toLowerCase() === schedEmp.email.toLowerCase()) return true;
      const norm1 = normalizeText(`${schedEmp.nombre} ${schedEmp.apellido}`);
      const norm2 = normalizeText(`${driver.nombre} ${driver.apellido}`);
      if (norm1 && norm2 && (norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1))) return true;
    }

    return false;
  };

  // Helper to match schedule to week (normalizing any ISO, Excel integer, or date format)
  const isScheduleForWeek = (s: WeeklySchedule, targetWeek: string) => {
    const sWeek = normalizeExcelWeekDate(s.semanaInicio, targetWeek);
    return sWeek === targetWeek;
  };

  // Driver's schedule for selected week (STRICTLY ISOLATED TO THIS DRIVER)
  const driverSchedule = useMemo(() => {
    if (!selectedDriver) return undefined;
    return schedules.find(
      (s) =>
        isScheduleForDriver(s, selectedDriver) &&
        isScheduleForWeek(s, selectedWeek)
    );
  }, [schedules, selectedDriver, selectedWeek, employees]);

  // Current week schedule (specifically for today's live shift check-in)
  const currentWeekSchedule = useMemo(() => {
    if (!selectedDriver) return undefined;
    return schedules.find(
      (s) =>
        isScheduleForDriver(s, selectedDriver) &&
        isScheduleForWeek(s, currentMonday)
    );
  }, [schedules, selectedDriver, currentMonday, employees]);

  // AUTO-SELECT WEEK: If currently selected week has no shifts, but there is an active week with shifts for this driver, select it!
  useEffect(() => {
    if (!selectedDriver) return;
    const hasCurrent = schedules.some(
      (s) => isScheduleForDriver(s, selectedDriver) && isScheduleForWeek(s, selectedWeek)
    );
    if (!hasCurrent) {
      const driverSchedules = schedules.filter((s) => isScheduleForDriver(s, selectedDriver));
      if (driverSchedules.length > 0) {
        const normWeeks = driverSchedules
          .map((s) => normalizeExcelWeekDate(s.semanaInicio))
          .filter(Boolean)
          .sort();
        if (normWeeks.includes(currentMonday)) {
          setSelectedWeek(currentMonday);
        } else if (normWeeks.length > 0) {
          setSelectedWeek(normWeeks[normWeeks.length - 1]);
        }
      }
    }
  }, [schedules, selectedDriver, currentMonday]);

  // Label for current month in course
  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    return `${MONTHS_SPANISH[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  const currentMonthWeeks = useMemo(() => {
    return availableWeeks.filter((w) => w.isCurrentMonth);
  }, [availableWeeks]);

  const otherScheduledWeeks = useMemo(() => {
    return availableWeeks.filter((w) => !w.isCurrentMonth && w.hasSchedule);
  }, [availableWeeks]);

  const otherWeeks = useMemo(() => {
    return availableWeeks.filter((w) => !w.isCurrentMonth && !w.hasSchedule);
  }, [availableWeeks]);

  const currentWeekIndex = availableWeeks.findIndex((w) => w.value === selectedWeek);
  const canGoPrev = currentWeekIndex > 0;
  const canGoNext = currentWeekIndex >= 0 && currentWeekIndex < availableWeeks.length - 1;

  const handlePrevWeek = () => {
    if (canGoPrev) {
      setSelectedWeek(availableWeeks[currentWeekIndex - 1].value);
    }
  };

  const handleNextWeek = () => {
    if (canGoNext) {
      setSelectedWeek(availableWeeks[currentWeekIndex + 1].value);
    }
  };

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
  const todayShift =
    (selectedWeek === currentMonday ? driverSchedule?.dias[todayDayName] : currentWeekSchedule?.dias[todayDayName]) ||
    currentWeekSchedule?.dias[todayDayName] ||
    driverSchedule?.dias[todayDayName] ||
    null;

  const isTurnoPartido = todayShift?.tipo === 'Partido';
  const clienteHoy = todayShift?.clienteNombre || 'Sin cliente asignado';
  const hasScheduledShiftToday = !!todayShift && todayShift.tipo !== 'Descanso';

  // Restore today's attendance state if already registered
  useEffect(() => {
    const todayInfo = getCurrentDateTimeInfo();
    const existing = attendanceRecords.find(
      (a) => a.repartidorId === myRepartidorRecord.id && a.fecha === todayInfo.fecha
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
  }, [myRepartidorRecord.id, attendanceRecords, isTurnoPartido, auditPhoto, horaInicio]);

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

  // Driver reports filter (strictly isolated to the current driver)
  const driverReports = useMemo(() => {
    if (!selectedDriver) return [];
    const cleanCed = cleanDigits(selectedDriver.cedula);
    return clientReports.filter(
      (rep) =>
        rep.repartidorId === selectedDriver.id ||
        (cleanCed && cleanDigits(rep.repartidorId) === cleanCed) ||
        (selectedDriver.cedula && rep.repartidorId === selectedDriver.cedula)
    );
  }, [clientReports, selectedDriver]);

  // Selected client for report with searchable picker
  const [selectedClientForReport, setSelectedClientForReport] = useState<string>('');
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('');
  const [isClientSearchOpen, setIsClientSearchOpen] = useState<boolean>(false);
  const clientPickerRef = useRef<HTMLDivElement>(null);

  // Close client search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (clientPickerRef.current && !clientPickerRef.current.contains(event.target as Node)) {
        setIsClientSearchOpen(false);
      }
    };
    if (isClientSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isClientSearchOpen]);

  // Unified available clients for searchable delivery client picker
  const availableClientOptions = useMemo(() => {
    const list: Array<{ id: string; nombre: string; ciudad?: string; empresaNombre?: string }> = [];
    const seenNames = new Set<string>();

    if (clients && clients.length > 0) {
      clients.forEach((c) => {
        if (c.nombre && !seenNames.has(c.nombre.toLowerCase().trim())) {
          seenNames.add(c.nombre.toLowerCase().trim());
          list.push({
            id: c.id,
            nombre: c.nombre,
            ciudad: c.ciudad,
            empresaNombre: c.empresaNombre,
          });
        }
      });
    }

    // Default fallback clients if none registered
    if (list.length === 0) {
      const defaults = [
        { id: 'CLI-001', nombre: 'Almacenes Éxito S.A.', ciudad: 'Bogotá', empresaNombre: 'Grupo Éxito' },
        { id: 'CLI-002', nombre: 'Homecenter Colombia', ciudad: 'Cali', empresaNombre: 'Sodimac Corona' },
        { id: 'CLI-003', nombre: 'Decathlon Colombia', ciudad: 'Medellín', empresaNombre: 'Decathlon' },
        { id: 'CLI-004', nombre: 'Mercado Libre S.A.S.', ciudad: 'Bogotá', empresaNombre: 'Mercado Libre' },
        { id: 'CLI-005', nombre: 'Alkosto S.A.', ciudad: 'Cali', empresaNombre: 'Corbeta' },
      ];
      defaults.forEach((d) => {
        seenNames.add(d.nombre.toLowerCase().trim());
        list.push(d);
      });
    }

    // If clienteHoy is defined and not yet in list, ensure it's included
    if (
      clienteHoy &&
      clienteHoy !== 'Sin cliente asignado' &&
      !seenNames.has(clienteHoy.toLowerCase().trim())
    ) {
      list.unshift({
        id: 'CLI-TODAY',
        nombre: clienteHoy,
        ciudad: todayShift?.ciudad,
        empresaNombre: todayShift?.empresaNombre,
      });
    }

    return list;
  }, [clients, clienteHoy, todayShift]);

  // Filtered client options based on driver search query
  const filteredClientOptions = useMemo(() => {
    const term = clientSearchTerm.trim().toLowerCase();
    if (!term) return availableClientOptions;
    return availableClientOptions.filter((c) => {
      const matchName = c.nombre.toLowerCase().includes(term);
      const matchCity = c.ciudad ? c.ciudad.toLowerCase().includes(term) : false;
      const matchEmp = c.empresaNombre ? c.empresaNombre.toLowerCase().includes(term) : false;
      return matchName || matchCity || matchEmp;
    });
  }, [availableClientOptions, clientSearchTerm]);

  const currentSelectedClientName = selectedClientForReport || clienteHoy || availableClientOptions[0]?.nombre || '';
  const currentSelectedClientObj = availableClientOptions.find(
    (c) => c.nombre.toLowerCase().trim() === currentSelectedClientName.toLowerCase().trim()
  );

  // Access validation form state for drivers without direct link
  const [accessValidationInput, setAccessValidationInput] = useState('');
  const [accessValidationMsg, setAccessValidationMsg] = useState<{ error?: string; success?: string } | null>(null);

  // Submit Daily Report
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDriver) return;

    const chosenClient = currentSelectedClientName || selectedClientForReport || clienteHoy || 'Almacenes Éxito S.A.';
    const chosenPosName = todayShift?.puntoVentaNombre;
    const matchingClient = clients.find((c) => c.nombre === chosenClient);

    const countSalidas = Number(salidasFueraPerimetro) || 0;

    const newReport: ClientOrderReport = {
      id: `REP-${Date.now()}`,
      clienteId: matchingClient?.id || (chosenClient.includes('Éxito') ? 'CLI-001' : chosenClient.includes('Homecenter') ? 'CLI-002' : 'CLI-003'),
      nombreCliente: chosenClient,
      puntoVentaNombre: chosenPosName,
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

          <div className="bg-white border border-blue-200/90 p-4 rounded-2xl w-full sm:w-72 shadow-2xs">
            <div className="text-[10px] font-black uppercase text-blue-700 tracking-wider flex items-center space-x-1.5 mb-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Sesión Exclusiva de Repartidor</span>
            </div>
            <div className="text-sm font-black text-slate-900 tracking-tight">
              {selectedDriver.nombre} {selectedDriver.apellido}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between font-semibold border-t border-slate-100 pt-2">
              <span>C.C. <strong className="text-slate-800 font-mono">{selectedDriver.cedula}</strong></span>
              <span>Placa: <strong className="text-red-700 font-mono font-black bg-red-50 px-2 py-0.5 rounded border border-red-200">{selectedDriver.placaVehiculo || 'VTX-89D'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* VALIDACIÓN OBLIGATORIA DE ENLACE DE REPARTIDOR (PRIORIDAD 1) */}
      {!matchedDriver && !inviteEmail && !inviteEmpId && (
        <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-sm text-slate-800 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-900">
                🔒 Acceso Exclusivo de Repartidor mediante Enlace Oficial
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Para garantizar la confidencialidad de la programación de turnos y que <strong>únicamente tú puedas ver tus turnos asignados</strong>, es obligatorio ingresar con tu enlace personal único enviado a tu correo o WhatsApp por tu Jefe de Zona.
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row items-center gap-2.5">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
              Validar mi identidad con Cédula o Correo:
            </label>
            <input
              type="text"
              value={accessValidationInput}
              onChange={(e) => setAccessValidationInput(e.target.value)}
              placeholder="Ingresa tu cédula o correo registrado..."
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-500 w-full"
            />
            <button
              type="button"
              onClick={() => {
                const clean = cleanDigits(accessValidationInput);
                const email = accessValidationInput.trim().toLowerCase();
                const found = employees.find(
                  (e) =>
                    (e.rol === 'Repartidor' || e.cargo.toLowerCase().includes('repartidor')) &&
                    ((clean && cleanDigits(e.cedula) === clean) ||
                      (clean && cleanDigits(e.id) === clean) ||
                      (e.email && e.email.trim().toLowerCase() === email))
                );
                if (found) {
                  setDriverValidationOverride(found);
                  setAccessValidationMsg({ success: `¡Identidad validada con éxito para ${found.nombre} ${found.apellido}!` });
                } else {
                  setAccessValidationMsg({ error: 'No se encontró un repartidor activo con ese documento o correo. Solicita tu enlace a tu Jefe de Zona.' });
                }
              }}
              className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Validar Acceso
            </button>
          </div>
          {accessValidationMsg?.error && (
            <p className="text-xs text-red-600 font-bold px-1">{accessValidationMsg.error}</p>
          )}
          {accessValidationMsg?.success && (
            <p className="text-xs text-emerald-700 font-bold px-1">{accessValidationMsg.success}</p>
          )}
        </div>
      )}

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
            <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <h3 className="font-black text-sm text-slate-900">
                1. Programación Semanal de Turnos para {selectedDriver?.nombre} {selectedDriver?.apellido}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-md">
                  {formatWeekRangeSpanish(selectedWeek)}
                </span>
                {selectedWeek === currentMonday && (
                  <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center space-x-1 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>Semana en Curso (Actual)</span>
                  </span>
                )}
                {availableWeeks.find((w) => w.value === selectedWeek)?.isCurrentMonth && selectedWeek !== currentMonday && (
                  <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Mes en Curso ({currentMonthLabel})
                  </span>
                )}
                {driverSchedule ? (
                  <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    ✓ Turnos Asignados
                  </span>
                ) : (
                  <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Sin Turnos Registrados
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Week Selection Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {/* Quick jump to current week button */}
            <button
              type="button"
              onClick={() => setSelectedWeek(currentMonday)}
              className={`px-2.5 py-1.5 rounded-xl border flex items-center space-x-1.5 transition-all cursor-pointer ${
                selectedWeek === currentMonday
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                  : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
              }`}
              title="Ir a la semana en curso"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Semana Actual</span>
            </button>

            {/* Previous / Select / Next Week navigation bar */}
            <div className="inline-flex items-center rounded-xl shadow-2xs border border-slate-300 bg-white overflow-hidden">
              <button
                type="button"
                onClick={handlePrevWeek}
                disabled={!canGoPrev}
                className="px-2 py-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-slate-200"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Dynamic Week Select with optgroups by current month, shifts and other weeks */}
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-transparent px-3 py-1.5 font-mono text-xs text-slate-800 font-bold focus:outline-none cursor-pointer max-w-[260px] sm:max-w-[320px] truncate"
              >
                {/* 1. Group: Mes en Curso */}
                {currentMonthWeeks.length > 0 && (
                  <optgroup label={`📅 Mes en Curso (${currentMonthLabel})`}>
                    {currentMonthWeeks.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* 2. Group: Otras Semanas con Turno Asignado */}
                {otherScheduledWeeks.length > 0 && (
                  <optgroup label="📋 Otras Semanas con Turno Asignado">
                    {otherScheduledWeeks.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* 3. Group: Otras Semanas Disponibles */}
                {otherWeeks.length > 0 && (
                  <optgroup label="🗓️ Otras Semanas">
                    {otherWeeks.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <button
                type="button"
                onClick={handleNextWeek}
                disabled={!canGoNext}
                className="px-2 py-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-slate-200"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Weekly Schedule Grid */}
        <div className="p-6">
          {!driverSchedule ? (
            <div className="text-center py-10 px-4 bg-slate-50/80 rounded-2xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-100">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Sin programación de turnos para la semana del {formatWeekRangeSpanish(selectedWeek)}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                No hay turnos registrados en el sistema para la semana seleccionada. Tu Jefe de Zona asignará la programación de turnos y clientes correspondientes.
              </p>
              {selectedWeek !== currentMonday && (
                <button
                  type="button"
                  onClick={() => setSelectedWeek(currentMonday)}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center space-x-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Volver a la Semana en Curso</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {daysOfWeek.map((dayName, dayIndex) => {
                const dayData = driverSchedule.dias[dayName];
                const isToday = selectedWeek === currentMonday && dayName === todayDayName;
                const isDescanso = !dayData || dayData.tipo === 'Descanso';

                // Calendar date for this day
                const [y, m, d] = selectedWeek.split('-').map(Number);
                const dayDateObj = new Date(y, m - 1, d + dayIndex);
                const dayNumberStr = String(dayDateObj.getDate()).padStart(2, '0');
                const monthShortStr = MONTHS_SPANISH[dayDateObj.getMonth()]?.slice(0, 3) || '';

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
                          {dayName} <span className="font-mono text-[10px] text-slate-400 font-normal">({dayNumberStr} {monthShortStr})</span>
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
                            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate">{dayData.clienteNombre || 'Sin cliente'}</span>
                          </div>

                          {dayData.puntoVentaNombre && (
                            <div className="text-[11px] font-bold text-red-700 bg-red-50/80 px-2 py-0.5 rounded-md border border-red-200/80 flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-red-600 shrink-0" />
                              <span className="truncate">PDV: {dayData.puntoVentaNombre}</span>
                              {dayData.ciudad && <span className="text-slate-500 font-normal">({dayData.ciudad})</span>}
                            </div>
                          )}

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

                      {/* Recomendación / Observación del día */}
                      {dayData?.observaciones && (
                        <div className="mt-2 bg-amber-50/90 border border-amber-200/90 rounded-xl p-2 text-amber-900 shadow-2xs">
                          <div className="flex items-center space-x-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                            <span>💡</span>
                            <span>Recomendación:</span>
                          </div>
                          <p className="text-[11px] font-medium leading-snug mt-0.5 break-words">
                            {dayData.observaciones}
                          </p>
                        </div>
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

                  <div className="flex items-center justify-center pt-2">
                    <label className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-sm transition-all flex items-center space-x-2 active:scale-95">
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
                  {todayShift?.puntoVentaNombre && (
                    <p className="text-[11px] text-red-700 font-bold flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>PDV Asignado: <strong>{todayShift.puntoVentaNombre}</strong> {todayShift.ciudad ? `(${todayShift.ciudad})` : ''}</span>
                    </p>
                  )}
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

            {/* Cliente Asignado con Buscador Rápido */}
            <div className="space-y-1.5" ref={clientPickerRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Cliente de la Entrega</span>
                </label>
                {clienteHoy && clienteHoy !== 'Sin cliente asignado' && currentSelectedClientName !== clienteHoy && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientForReport(clienteHoy);
                      setClientSearchTerm('');
                      setIsClientSearchOpen(false);
                    }}
                    className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                    title="Seleccionar el cliente programado en tu turno de hoy"
                  >
                    <span>⚡ Turno hoy: {clienteHoy.length > 18 ? clienteHoy.slice(0, 16) + '...' : clienteHoy}</span>
                  </button>
                )}
              </div>

              {/* Botón trigger / selector actual */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsClientSearchOpen((prev) => !prev)}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 border rounded-xl text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
                    isClientSearchOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white' : 'border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                    <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-black text-slate-900 block truncate">
                        {currentSelectedClientName || 'Seleccionar cliente de entrega...'}
                      </span>
                      {currentSelectedClientObj?.ciudad && (
                        <span className="text-[10px] font-semibold text-slate-500 block truncate">
                          📍 {currentSelectedClientObj.ciudad} {currentSelectedClientObj.empresaNombre ? `• ${currentSelectedClientObj.empresaNombre}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0 text-slate-400">
                    <span className="text-[10px] font-extrabold text-slate-400 hidden sm:inline">Buscar</span>
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isClientSearchOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                  </div>
                </button>

                {/* Dropdown flotante con buscador en tiempo real */}
                {isClientSearchOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
                    {/* Barra de búsqueda con autoFocus */}
                    <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          autoFocus
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          placeholder="Buscar cliente, sede o ciudad..."
                          className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {clientSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setClientSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lista scrolleable de clientes */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
                      {filteredClientOptions.length > 0 ? (
                        filteredClientOptions.map((cli) => {
                          const isSelected = cli.nombre.toLowerCase().trim() === currentSelectedClientName.toLowerCase().trim();
                          const isTodayClient = clienteHoy && cli.nombre.toLowerCase().trim() === clienteHoy.toLowerCase().trim();
                          return (
                            <button
                              key={cli.id}
                              type="button"
                              onClick={() => {
                                setSelectedClientForReport(cli.nombre);
                                setClientSearchTerm('');
                                setIsClientSearchOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50 text-indigo-950 font-bold border border-indigo-200'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center space-x-1.5">
                                  <span className={`text-xs ${isSelected ? 'font-black text-indigo-950' : 'font-bold text-slate-900'} truncate`}>
                                    {cli.nombre}
                                  </span>
                                  {isTodayClient && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md shrink-0">
                                      Turno Hoy
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                                  {cli.ciudad && <span className="font-semibold text-slate-600">📍 {cli.ciudad}</span>}
                                  {cli.empresaNombre && cli.empresaNombre !== cli.nombre && (
                                    <span className="truncate opacity-80">🏢 {cli.empresaNombre}</span>
                                  )}
                                </div>
                              </div>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-6 px-4 text-center">
                          <p className="text-xs text-slate-500">
                            No se encontraron clientes para <strong className="text-slate-800">"{clientSearchTerm}"</strong>.
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Solo se pueden seleccionar clientes registrados por la administración.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer informativo */}
                    <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>{filteredClientOptions.length} de {availableClientOptions.length} clientes</span>
                      <button
                        type="button"
                        onClick={() => setIsClientSearchOpen(false)}
                        className="text-slate-600 hover:text-slate-900 font-bold hover:underline"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
