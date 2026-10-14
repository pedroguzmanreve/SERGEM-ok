import {
  Employee,
  WeeklySchedule,
  DriverAttendanceRecord,
  ClientOrderReport,
  ShiftDetails,
  DriverShiftAttendanceStatus
} from '../types/payroll';

export const DAYS_SPANISH: ('Domingo' | 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado')[] = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const MONTHS_SPANISH = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * Returns the Monday (ISO week start) of any given date in "YYYY-MM-DD" format
 */
export function getMondayOfDate(refDate: Date = new Date()): string {
  const d = new Date(refDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

/**
 * Formats a Monday ISO string (YYYY-MM-DD) into a friendly Colombian week range string
 * e.g., "05 al 11 de Octubre 2026"
 */
export function formatWeekRangeSpanish(mondayStr: string): string {
  if (!mondayStr) return '';
  const parts = mondayStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return mondayStr;
  const [y, m, d] = parts;
  const mon = new Date(y, m - 1, d);
  const sun = new Date(y, m - 1, d + 6);

  const mDay = String(mon.getDate()).padStart(2, '0');
  const mMonth = MONTHS_SPANISH[mon.getMonth()];
  const sDay = String(sun.getDate()).padStart(2, '0');
  const sMonth = MONTHS_SPANISH[sun.getMonth()];
  const sYear = sun.getFullYear();

  if (mMonth === sMonth) {
    return `${mDay} al ${sDay} de ${mMonth} ${sYear}`;
  }
  return `${mDay} de ${mMonth} al ${sDay} de ${sMonth} ${sYear}`;
}

export interface WeekOption {
  value: string; // YYYY-MM-DD (Monday)
  label: string; // "05 al 11 de Octubre 2026 (Semana Actual)"
  isCurrentWeek: boolean;
  isCurrentMonth: boolean;
  hasSchedule?: boolean;
  monthName: string;
  year: number;
  monthLabel: string;
}

/**
 * Normalizes any week date representation (ISO YYYY-MM-DD, Excel serial integer e.g. 46309,
 * Colombian DD/MM/YYYY, or arbitrary day of the week) into the ISO YYYY-MM-DD format of that week's MONDAY.
 */
export function normalizeExcelWeekDate(rawVal: any, fallback?: string): string {
  if (rawVal === null || rawVal === undefined || rawVal === '') {
    return fallback ? normalizeExcelWeekDate(fallback) : getMondayOfDate();
  }

  // 1. If numeric Excel serial date (e.g. 46309)
  const num = typeof rawVal === 'number' ? rawVal : Number(String(rawVal).trim());
  if (!isNaN(num) && num > 30000 && num < 60000 && !String(rawVal).includes('-') && !String(rawVal).includes('/')) {
    const d = new Date((num - 25569) * 86400 * 1000);
    return getMondayOfDate(d);
  }

  const str = String(rawVal).trim();

  // 2. If ISO string YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return getMondayOfDate(new Date(str.slice(0, 10) + 'T12:00:00'));
  }

  // 3. If DD/MM/YYYY or DD-MM-YYYY
  const partsDmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (partsDmy) {
    const day = parseInt(partsDmy[1], 10);
    const month = parseInt(partsDmy[2], 10) - 1;
    const year = parseInt(partsDmy[3], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    return getMondayOfDate(d);
  }

  // 4. Try standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return getMondayOfDate(parsed);
  }

  return fallback ? normalizeExcelWeekDate(fallback) : getMondayOfDate();
}

/**
 * Returns all available schedule weeks for selection, dynamically updated according to
 * the current month in course, adjacent months, and all existing schedules in the database.
 */
export function getAvailableScheduleWeeks(
  schedules: WeeklySchedule[] = [],
  repartidorId?: string,
  refDate: Date = new Date(),
  driverRecord?: { id?: string; cedula?: string; email?: string }
): WeekOption[] {
  const currentMonday = getMondayOfDate(refDate);
  const weekSet = new Set<string>();

  // 1. Add all unique weeks present in existing schedules (normalizing any format e.g. Excel serials)
  schedules.forEach((s) => {
    if (s.semanaInicio) {
      const norm = normalizeExcelWeekDate(s.semanaInicio);
      if (norm) weekSet.add(norm);
    }
  });

  // 2. Generate weeks covering 2 months prior, the current month in course, and 2 months ahead
  const startRef = new Date(refDate.getFullYear(), refDate.getMonth() - 2, 1);
  const endRef = new Date(refDate.getFullYear(), refDate.getMonth() + 3, 0);

  const iter = new Date(startRef);
  while (iter <= endRef) {
    const monday = getMondayOfDate(iter);
    weekSet.add(monday);
    iter.setDate(iter.getDate() + 7);
  }

  // Guarantee current week is included
  weekSet.add(currentMonday);

  // Sort ascending: chronological order
  const sortedWeeks = Array.from(weekSet).sort();

  return sortedWeeks.map((weekVal) => {
    const [y, m, d] = weekVal.split('-').map(Number);
    const mon = new Date(y, m - 1, d);
    const sun = new Date(y, m - 1, d + 6);

    const isCurrent = weekVal === currentMonday;
    const isThisMonth =
      (mon.getMonth() === refDate.getMonth() && mon.getFullYear() === refDate.getFullYear()) ||
      (sun.getMonth() === refDate.getMonth() && sun.getFullYear() === refDate.getFullYear());

    const hasSched = (repartidorId || driverRecord)
      ? schedules.some((s) => {
          const sWeek = normalizeExcelWeekDate(s.semanaInicio, weekVal);
          if (sWeek !== weekVal) return false;
          const sRepId = (s.repartidorId || '').trim();
          if (!sRepId) return false;

          const testId = repartidorId || driverRecord?.id || '';
          if (testId && sRepId === testId) return true;
          if (testId && sRepId.replace(/^EMP-?/i, '') === testId.replace(/^EMP-?/i, '')) return true;

          const cedulaClean = (driverRecord?.cedula || testId).replace(/\D/g, '');
          const sRepClean = sRepId.replace(/\D/g, '');
          if (cedulaClean && sRepClean && cedulaClean === sRepClean) return true;
          if (cedulaClean && sRepId.includes(cedulaClean)) return true;

          return false;
        })
      : schedules.some((s) => normalizeExcelWeekDate(s.semanaInicio, weekVal) === weekVal);

    const baseLabel = formatWeekRangeSpanish(weekVal);
    let label = baseLabel;
    if (isCurrent && hasSched) {
      label += ' (Semana Actual • Con Turno)';
    } else if (isCurrent) {
      label += ' (Semana Actual)';
    } else if (hasSched) {
      label += ' • Con Turno';
    }

    // Identify representative month
    const targetMonthDate = sun.getMonth() === refDate.getMonth() ? sun : mon;
    const monthName = MONTHS_SPANISH[targetMonthDate.getMonth()];
    const year = targetMonthDate.getFullYear();
    const monthLabel = `${monthName} ${year}`;

    return {
      value: weekVal,
      label,
      isCurrentWeek: isCurrent,
      isCurrentMonth: isThisMonth,
      hasSchedule: hasSched,
      monthName,
      year,
      monthLabel,
    };
  });
}

/**
 * Returns current date and time info in standard Colombian format
 */
export function getCurrentDateTimeInfo(refDate: Date = new Date()): {
  fecha: string; // YYYY-MM-DD
  diaSemana: 'Domingo' | 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';
  horaActual: string; // HH:mm
  minutosDesdeMedianoche: number;
} {
  const year = refDate.getFullYear();
  const month = String(refDate.getMonth() + 1).padStart(2, '0');
  const day = String(refDate.getDate()).padStart(2, '0');
  const fecha = `${year}-${month}-${day}`;

  const dayIndex = refDate.getDay();
  const diaSemana = DAYS_SPANISH[dayIndex];

  const hours = String(refDate.getHours()).padStart(2, '0');
  const minutes = String(refDate.getMinutes()).padStart(2, '0');
  const horaActual = `${hours}:${minutes}`;
  const minutosDesdeMedianoche = refDate.getHours() * 60 + refDate.getMinutes();

  return {
    fecha,
    diaSemana,
    horaActual,
    minutosDesdeMedianoche,
  };
}

/**
 * Parses "HH:mm" to minutes from midnight
 */
export function timeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Formats minutes into human-readable delay text
 */
export function formatDelay(minutes: number): string {
  if (minutes <= 0) return 'A tiempo';
  if (minutes < 60) return `${minutes} min de retraso`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m de retraso` : `${hrs}h de retraso`;
}

/**
 * Generates an official WhatsApp Web / App link with a pre-filled professional query message
 */
export function buildWhatsAppLink(
  telefono: string | undefined,
  driverName: string,
  clienteNombre: string,
  horaInicio: string,
  diaSemana: string
): string {
  const rawPhone = telefono || '3128091102';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const phone57 = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;

  const message = `Hola ${driverName}, te saludamos desde SERGEM Mensajería y Logística. Notamos que tenías turno programado para hoy (${diaSemana}) a las ${horaInicio} con el cliente ${clienteNombre || 'asignado'} y aún no registras inicio de turno en la plataforma. ¿Qué pasó con tu conexión, te encuentras bien o presentas alguna novedad operativa? Quedamos muy atentos.`;

  return `https://wa.me/${phone57}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a WhatsApp link specifically for coordinating driver shifts and schedules
 */
export function buildDriverShiftWhatsAppLink(
  telefono: string | undefined,
  driverName: string,
  semanaTexto?: string,
  clienteTexto?: string
): string {
  const rawPhone = telefono || '3128091102';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const phone57 = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
  const details = clienteTexto ? ` para el cliente ${clienteTexto}` : '';
  const weekInfo = semanaTexto ? ` de la semana (${semanaTexto})` : '';
  const message = `Hola ${driverName}, te escribimos desde Coordinación / Jefatura de Zona SERGEM sobre tu programación de turnos${weekInfo}${details}. Por favor confírmanos si tienes alguna duda, confirmación de asistencia o novedad con tus horarios asignados. Quedamos atentos.`;

  return `https://wa.me/${phone57}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a WhatsApp link from a driver directly to their Zone Chief / Supervisor
 */
export function buildDriverToZoneChiefWhatsAppLink(
  chiefPhone: string | undefined,
  chiefName: string,
  driverName: string,
  driverPlate?: string,
  clienteHoy?: string,
  tipoTurno?: string
): string {
  const rawPhone = chiefPhone || '3147890123';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const phone57 = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
  const plateText = driverPlate ? ` (Placa: ${driverPlate})` : '';
  const clientText = clienteHoy && clienteHoy !== 'Sin cliente asignado' ? ` asignado al cliente *${clienteHoy}*` : '';
  const shiftText = tipoTurno ? ` en jornada *${tipoTurno}*` : '';
  const message = `Hola Jefe ${chiefName}, le saluda el repartidor ${driverName}${plateText}${clientText}${shiftText}. Me comunico desde mi Portal de Repartidor de SERGEM para coordinar una novedad / consulta sobre mi turno. Quedo muy atento a sus indicaciones.`;

  return `https://wa.me/${phone57}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a tel: link for direct smartphone or softphone calling
 */
export function buildCallLink(telefono: string | undefined): string {
  const rawPhone = telefono || '3128091102';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  return `tel:${cleanPhone}`;
}

/**
 * Resolves the shift details for a driver on a specific day of the week
 */
export function findShiftForDriver(
  driverId: string,
  schedules: WeeklySchedule[],
  targetDay: 'Domingo' | 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado',
  targetWeek?: string
): ShiftDetails | null {
  if (!schedules || schedules.length === 0) return null;

  // 1. Try exact week match
  if (targetWeek) {
    const exact = schedules.find(
      (s) => s.repartidorId === driverId && s.semanaInicio === targetWeek
    );
    if (exact && exact.dias && exact.dias[targetDay]) {
      return exact.dias[targetDay] || null;
    }
  }

  // 2. Fallback to any schedule for this driver with this day configured
  const anySchedule = schedules.find(
    (s) => s.repartidorId === driverId && s.dias && s.dias[targetDay]
  );
  if (anySchedule && anySchedule.dias[targetDay]) {
    return anySchedule.dias[targetDay] || null;
  }

  return null;
}

/**
 * Evaluates the attendance and connectivity of drivers for a given reference date and time.
 * Returns:
 * - unconnectedDrivers: drivers with a scheduled shift whose start time has arrived/passed and have NOT connected.
 * - connectedDrivers: drivers who have started their shift or submitted reports today.
 * - allScheduled: all drivers scheduled for today.
 */
export function evaluateDriverAttendance({
  employees,
  schedules,
  attendanceRecords,
  clientReports,
  referenceDate = new Date(),
  targetDayOfWeek,
  jefeZonaId,
}: {
  employees: Employee[];
  schedules: WeeklySchedule[];
  attendanceRecords: DriverAttendanceRecord[];
  clientReports: ClientOrderReport[];
  referenceDate?: Date;
  targetDayOfWeek?: 'Domingo' | 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';
  jefeZonaId?: string;
}): {
  allScheduled: DriverShiftAttendanceStatus[];
  unconnectedDrivers: DriverShiftAttendanceStatus[];
  connectedDrivers: DriverShiftAttendanceStatus[];
  currentDayOfWeek: string;
  currentDateFormatted: string;
  currentTimeFormatted: string;
  totalScheduledCount: number;
  totalConnectedCount: number;
  totalUnconnectedCount: number;
} {
  const dateInfo = getCurrentDateTimeInfo(referenceDate);
  const activeDay = targetDayOfWeek || dateInfo.diaSemana;
  const activeDate = dateInfo.fecha;
  const currentMinutes = dateInfo.minutosDesdeMedianoche;

  // Filter Repartidores
  const activeDrivers = employees.filter(
    (emp) =>
      emp.activo &&
      (emp.rol === 'Repartidor' ||
        emp.cargo.toLowerCase().includes('repartidor') ||
        emp.cargo.toLowerCase().includes('conductor')) &&
      (!jefeZonaId || !emp.jefeZonaId || emp.jefeZonaId === jefeZonaId)
  );

  const allScheduled: DriverShiftAttendanceStatus[] = [];
  const unconnectedDrivers: DriverShiftAttendanceStatus[] = [];
  const connectedDrivers: DriverShiftAttendanceStatus[] = [];

  for (const driver of activeDrivers) {
    const shift = findShiftForDriver(driver.id, schedules, activeDay);

    // Skip if no shift or rest day ("Descanso")
    if (!shift || shift.tipo === 'Descanso' || !shift.horaInicio1) {
      continue;
    }

    const scheduledStartTime = shift.horaInicio1;
    const scheduledEndTime = shift.horaFin2 || shift.horaFin1;
    const clienteNombre = shift.clienteNombre || 'Cliente Asignado SERGEM';

    // Check if connected:
    // 1. Explicit attendance record for this driver today with status CONECTADO / INICIADO
    const attRecord = attendanceRecords.find(
      (a) => a.repartidorId === driver.id && a.fecha === activeDate && a.estado !== 'FINALIZADO'
    );

    // 2. Or driver already filed a client report today
    const hasReportToday = clientReports.some(
      (r) => r.repartidorId === driver.id && r.fecha === activeDate
    );

    const isConnected = !!attRecord || hasReportToday;

    // Check if scheduled time has passed
    const progMinutes = timeToMinutes(scheduledStartTime);
    const hasStartTimeArrived = currentMinutes >= progMinutes;
    const delayMinutes = Math.max(0, currentMinutes - progMinutes);
    const isOverdue = !isConnected && hasStartTimeArrived;

    const callUrl = buildCallLink(driver.telefono);
    const whatsappUrl = buildWhatsAppLink(
      driver.telefono,
      driver.nombre,
      clienteNombre,
      scheduledStartTime,
      activeDay
    );

    const statusObj: DriverShiftAttendanceStatus = {
      employee: driver,
      scheduledShift: shift,
      scheduledStartTime,
      scheduledEndTime,
      clienteNombre,
      diaSemana: activeDay,
      fecha: activeDate,
      isConnected,
      attendanceRecord: attRecord,
      hasClientReport: hasReportToday,
      isOverdue,
      delayMinutes,
      delayFormatted: formatDelay(delayMinutes),
      callUrl,
      whatsappUrl,
    };

    allScheduled.push(statusObj);

    if (isConnected) {
      connectedDrivers.push(statusObj);
    } else if (isOverdue) {
      unconnectedDrivers.push(statusObj);
    }
  }

  // Sort unconnected by greatest delay first
  unconnectedDrivers.sort((a, b) => b.delayMinutes - a.delayMinutes);

  return {
    allScheduled,
    unconnectedDrivers,
    connectedDrivers,
    currentDayOfWeek: activeDay,
    currentDateFormatted: activeDate,
    currentTimeFormatted: dateInfo.horaActual,
    totalScheduledCount: allScheduled.length,
    totalConnectedCount: connectedDrivers.length,
    totalUnconnectedCount: unconnectedDrivers.length,
  };
}
