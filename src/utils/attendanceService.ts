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
