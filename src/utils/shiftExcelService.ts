import * as XLSX from 'xlsx';
import {
  WeeklySchedule,
  ShiftDetails,
  ShiftType,
  Employee,
  CompanyClient
} from '../types/payroll';
import { getMondayOfDate, normalizeExcelWeekDate } from './attendanceService';

export interface ParsedScheduleResult {
  schedules: WeeklySchedule[];
  newEmployeesToCreate: Employee[];
  warnings: string[];
  errors: string[];
  summary: {
    totalRows: number;
    parsedCount: number;
    createdEmployeesCount: number;
    weekStart: string;
  };
}

const DAYS_NAMES: ('Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo')[] = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo'
];

/**
 * Normaliza cualquier formato de hora (string "07:00", float decimal de Excel 0.29166, etc.) a "HH:MM".
 */
export function formatExcelTime(val: any, defaultTime = ''): string {
  if (val === null || val === undefined || val === '') return defaultTime;

  if (typeof val === 'number') {
    // En Excel, las horas se guardan como fracción del día (ej. 0.2916666 = 07:00)
    const totalSeconds = Math.round(val * 86400);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  if (val instanceof Date) {
    const hours = val.getHours();
    const minutes = val.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const str = String(val).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return str || defaultTime;
}

/**
 * Normaliza el tipo de turno a los tipos soportados por el sistema SERGEM.
 */
export function normalizeShiftType(raw: string): ShiftType {
  const clean = (raw || '').toLowerCase().trim();
  if (clean.includes('partido')) return 'Partido';
  if (clean.includes('descanso') || clean.includes('libre')) return 'Descanso';
  if (clean.includes('medio') && (clean.includes('tarde') || clean.includes('pm'))) return 'Medio Tiempo Tarde';
  if (clean.includes('medio') || clean.includes('mañana') || clean.includes('manana') || clean.includes('am')) return 'Medio Tiempo Mañana';
  if (clean.includes('continua') || clean.includes('continuo')) return 'Continua';
  return 'Continua';
}

/**
 * Genera el archivo binario y descarga la Plantilla Oficial de Turnos en formato Excel (.xlsx).
 */
export function generateShiftScheduleExcel(
  employees: Employee[] = [],
  clients: CompanyClient[] = [],
  targetWeek?: string
): void {
  const actualTargetWeek = targetWeek || getMondayOfDate();
  const wb = XLSX.utils.book_new();

  // 1. Hoja Principal: Matriz de Turnos Semanales
  const headers = [
    'Cedula',
    'Nombre_Repartidor',
    'Semana_Inicio',
    // Lunes
    'Lunes_Tipo',
    'Lunes_Cliente',
    'Lunes_Inicio1',
    'Lunes_Fin1',
    'Lunes_Inicio2',
    'Lunes_Fin2',
    'Lunes_Observaciones',
    // Martes
    'Martes_Tipo',
    'Martes_Cliente',
    'Martes_Inicio1',
    'Martes_Fin1',
    'Martes_Inicio2',
    'Martes_Fin2',
    'Martes_Observaciones',
    // Miércoles
    'Miercoles_Tipo',
    'Miercoles_Cliente',
    'Miercoles_Inicio1',
    'Miercoles_Fin1',
    'Miercoles_Inicio2',
    'Miercoles_Fin2',
    'Miercoles_Observaciones',
    // Jueves
    'Jueves_Tipo',
    'Jueves_Cliente',
    'Jueves_Inicio1',
    'Jueves_Fin1',
    'Jueves_Inicio2',
    'Jueves_Fin2',
    'Jueves_Observaciones',
    // Viernes
    'Viernes_Tipo',
    'Viernes_Cliente',
    'Viernes_Inicio1',
    'Viernes_Fin1',
    'Viernes_Inicio2',
    'Viernes_Fin2',
    'Viernes_Observaciones',
    // Sábado
    'Sabado_Tipo',
    'Sabado_Cliente',
    'Sabado_Inicio1',
    'Sabado_Fin1',
    'Sabado_Inicio2',
    'Sabado_Fin2',
    'Sabado_Observaciones',
    // Domingo
    'Domingo_Tipo',
    'Domingo_Cliente',
    'Domingo_Inicio1',
    'Domingo_Fin1',
    'Domingo_Inicio2',
    'Domingo_Fin2',
    'Domingo_Observaciones',
    'Observaciones_Generales'
  ];

  const clientSample1 = clients[0]?.nombre || 'Almacenes Éxito S.A.';
  const clientSample2 = clients[1]?.nombre || 'Droguerías Comfandi';

  const rows: (string | number)[][] = [headers];

  const repartidores = employees.filter((e) => e.rol === 'Repartidor');

  if (repartidores.length > 0) {
    // Pre-llenar con repartidores registrados
    repartidores.forEach((rep) => {
      rows.push([
        rep.cedula || rep.id,
        `${rep.nombre} ${rep.apellido}`.trim(),
        targetWeek,
        // Lunes
        'Continua', clientSample1, '07:00', '15:00', '', '', 'Llegar 10 min antes en sede principal',
        // Martes
        'Partido', clientSample1, '07:00', '11:00', '14:00', '18:00', 'Ruta express norte y llevar datáfono',
        // Miércoles
        'Continua', clientSample2, '07:00', '15:00', '', '', 'Verificar sellos de seguridad de paquetes',
        // Jueves
        'Partido', clientSample2, '07:00', '11:00', '14:00', '18:00', 'Priorizar entregas prioritarias de farmacia',
        // Viernes
        'Continua', clientSample1, '07:00', '15:00', '', '', 'Revisar combustible antes de iniciar ruta',
        // Sábado
        'Continua', clientSample1, '08:00', '13:00', '', '', 'Turno reforzado de fin de semana',
        // Domingo
        'Descanso', '', '', '', '', '', 'Descanso dominical programado',
        'Cumplir con EPP, dotación y documentación al día'
      ]);
    });
  } else {
    // Ejemplos ilustrativos si la base de datos está limpia
    rows.push([
      '1017123456',
      'Juan Camilo López',
      targetWeek,
      // Lunes
      'Continua', clientSample1, '07:00', '15:00', '', '', 'Llegar 10 min antes en sede principal',
      // Martes
      'Partido', clientSample1, '07:00', '11:00', '14:00', '18:00', 'Ruta express norte y llevar datáfono',
      // Miércoles
      'Continua', clientSample2, '07:00', '15:00', '', '', 'Verificar sellos de seguridad de paquetes',
      // Jueves
      'Partido', clientSample2, '07:00', '11:00', '14:00', '18:00', 'Priorizar entregas prioritarias de farmacia',
      // Viernes
      'Continua', clientSample1, '07:00', '15:00', '', '', 'Revisar combustible antes de iniciar ruta',
      // Sábado
      'Continua', clientSample1, '08:00', '13:00', '', '', 'Turno reforzado de fin de semana',
      // Domingo
      'Descanso', '', '', '', '', '', 'Descanso dominical programado',
      'Turno semanal zona norte'
    ]);
    rows.push([
      '1020456789',
      'Andrés Felipe Restrepo',
      targetWeek,
      // Lunes
      'Partido', clientSample2, '08:00', '12:00', '15:00', '19:00', 'Entrega de medicamentos refrigerados',
      // Martes
      'Continua', clientSample2, '07:00', '15:00', '', '', 'Ruta centros comerciales sur',
      // Miércoles
      'Partido', clientSample1, '08:00', '12:00', '15:00', '19:00', 'Cobro contraentrega con datáfono',
      // Jueves
      'Continua', clientSample1, '07:00', '15:00', '', '', 'Apoyo en despacho sede central',
      // Viernes
      'Partido', clientSample2, '08:00', '12:00', '15:00', '19:00', 'Verificar direcciones con cliente',
      // Sábado
      'Continua', clientSample2, '08:00', '14:00', '', '', 'Jornada continua fin de semana',
      // Domingo
      'Descanso', '', '', '', '', '', 'Descanso dominical programado',
      'Turno semanal zona sur'
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Ancho de columnas para visualización cómoda en Excel (7 columnas por cada día)
  ws['!cols'] = [
    { wch: 14 }, // Cedula
    { wch: 26 }, // Nombre
    { wch: 14 }, // Semana_Inicio
    // Lunes
    { wch: 12 }, { wch: 24 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 28 },
    // Martes
    { wch: 12 }, { wch: 24 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 28 },
    // Miércoles
    { wch: 12 }, { wch: 24 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 28 },
    // Jueves
    { wch: 12 }, { wch: 24 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 28 },
    // Viernes
    { wch: 12 }, { wch: 24 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 28 },
    // Sábado
    { wch: 12 }, { wch: 24 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 28 },
    // Domingo
    { wch: 12 }, { wch: 24 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 28 },
    // Observaciones Generales
    { wch: 32 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Turnos');

  // 2. Hoja 2: Guía de Uso, Tipos de Turnos y Clientes Disponibles
  const guideRows: string[][] = [
    ['INSTRUCCIONES PARA LA CARGA MASIVA DE TURNOS - SERGEM MENSAJERÍA S.A.S.'],
    [''],
    ['1. Tipos de Turno Válidos:', 'Continua', 'Partido', 'Medio Tiempo Mañana', 'Medio Tiempo Tarde', 'Descanso'],
    ['2. Formato de Horas:', 'HH:MM (Ej: 07:00, 15:00, 18:00)'],
    ['3. Turno Partido:', 'Diligenciar HoraInicio1 - HoraFin1 (mañana) y HoraInicio2 - HoraFin2 (tarde)'],
    ['4. Turno Continuo:', 'Diligenciar únicamente HoraInicio1 y HoraFin1'],
    ['5. Descanso:', 'Colocar "Descanso" en el campo Tipo. Los campos de hora y cliente pueden quedar vacíos.'],
    ['6. Columna de Observaciones / Recomendaciones en Cada Día:', 'Cada día incluye su columna "[Día]_Observaciones" para añadir recomendaciones específicas (ej: llegar antes, ruta express, llevar datáfono, sede asignada, etc.).'],
    ['   Estas observaciones son visibles en tiempo real para el repartidor y el jefe de zona.'],
    ['7. Cédula del Repartidor:', 'Si el repartidor ya existe en la plataforma, sus turnos se actualizarán automáticamente.'],
    ['   Si la cédula es nueva, el sistema registrará al repartidor automáticamente en el equipo.'],
    [''],
    ['LISTADO DE CLIENTES DISPONIBLES EN SERGEM:'],
    ['Código / ID', 'Nombre del Cliente', 'Ciudad / Sede']
  ];

  if (clients.length > 0) {
    clients.forEach((c) => {
      guideRows.push([c.id, c.nombre, c.ciudad || 'Cali']);
    });
  } else {
    guideRows.push(['CLI-01', 'Almacenes Éxito S.A.', 'Cali']);
    guideRows.push(['CLI-02', 'Droguerías Comfandi', 'Cali']);
    guideRows.push(['CLI-03', 'Mercado Libre Colombia', 'Cali']);
    guideRows.push(['CLI-04', 'Postobón S.A.', 'Cali']);
  }

  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 35 }, { wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Guia_Y_Clientes');

  // Generación y descarga
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Plantilla_Carga_Masiva_Turnos_SERGEM_${targetWeek}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Lee y compila el archivo Excel (.xlsx, .xls) o CSV subido por el usuario.
 */
export async function parseShiftScheduleExcel(
  file: File,
  existingEmployees: Employee[],
  defaultJefeId: string,
  fallbackWeek: string
): Promise<ParsedScheduleResult> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('El archivo no contiene hojas de cálculo legibles.');
  }

  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('La hoja de cálculo está vacía. Por favor diligencia los turnos.');
  }

  const schedules: WeeklySchedule[] = [];
  const newEmployeesToCreate: Employee[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const cleanDigits = (val: any) => String(val || '').replace(/\D/g, '');
  const normalizeName = (val: any) =>
    String(val || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  // Helper to extract value from row trying multiple column name variants
  const getRowVal = (row: Record<string, any>, candidateKeys: string[]): string => {
    for (const cand of candidateKeys) {
      const cleanCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [k, v] of Object.entries(row)) {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanK === cleanCand || cleanK.includes(cleanCand)) {
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            return String(v).trim();
          }
        }
      }
    }
    return '';
  };

  // Mapa de empleados por cédula limpia, ID, email y nombre para búsqueda rápida
  const employeeMap = new Map<string, Employee>();
  existingEmployees.forEach((emp) => {
    if (emp.cedula) {
      employeeMap.set(emp.cedula.trim(), emp);
      const cd = cleanDigits(emp.cedula);
      if (cd) employeeMap.set(cd, emp);
    }
    employeeMap.set(emp.id.trim(), emp);
    const idDigits = cleanDigits(emp.id);
    if (idDigits) employeeMap.set(idDigits, emp);

    if (emp.email) employeeMap.set(emp.email.trim().toLowerCase(), emp);
    const fullNameNorm = normalizeName(`${emp.nombre} ${emp.apellido}`);
    if (fullNameNorm) employeeMap.set(fullNameNorm, emp);
    const firstNameNorm = normalizeName(emp.nombre);
    if (firstNameNorm) employeeMap.set(firstNameNorm, emp);
  });

  // Determinar si es formato matriz semanal o formato fila por turno
  const sampleRow = rawRows[0] || {};
  const normalizedSampleKeys = Object.keys(sampleRow).map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const isMatrixFormat = normalizedSampleKeys.some((k) => k.includes('lunes') || k.includes('martes'));

  if (isMatrixFormat) {
    // FORMATO MATRIZ: 1 FILA = 1 REPARTIDOR (SEMANA COMPLETA)
    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // Línea 1 es encabezado

      // Obtener cédula buscando variantes de nombres de columnas
      const cedulaRaw = getRowVal(row, ['cedula', 'documento', 'identificacion', 'cc', 'doc', 'cédula']);
      const nombreRaw = getRowVal(row, ['nombre_repartidor', 'nombrerepartidor', 'nombre', 'repartidor', 'colaborador', 'empleado']);
      const emailRaw = getRowVal(row, ['correo', 'email', 'correo_electronico', 'correoelectronico', 'mail']).toLowerCase();

      if (!cedulaRaw && !nombreRaw && !emailRaw) {
        // Fila vacía al final, ignorar
        return;
      }

      const rawSemana = getRowVal(row, ['semana_inicio', 'semanainicio', 'semana', 'fecha_inicio', 'fechainicio', 'fecha']) || fallbackWeek;
      const semanaInicio = normalizeExcelWeekDate(rawSemana, fallbackWeek);

      // Buscar si el empleado ya existe (por cédula limpia, cédula cruda, email, o nombre normalizado)
      const cleanCed = cleanDigits(cedulaRaw);
      let targetEmployee = cleanCed ? employeeMap.get(cleanCed) : undefined;
      if (!targetEmployee && cedulaRaw) targetEmployee = employeeMap.get(cedulaRaw);
      if (!targetEmployee && emailRaw) targetEmployee = employeeMap.get(emailRaw);
      if (!targetEmployee && nombreRaw) targetEmployee = employeeMap.get(normalizeName(nombreRaw));

      // Si no existe, crear registro de repartidor
      if (!targetEmployee) {
        const nameParts = (nombreRaw || 'Repartidor').split(' ');
        const firstName = nameParts[0] || 'Repartidor';
        const lastName = nameParts.slice(1).join(' ') || (cleanCed ? `C.C. ${cleanCed}` : '');

        const newEmpId = `EMP-${cleanCed ? cleanCed.slice(-6) : Date.now().toString().slice(-4)}`;
        targetEmployee = {
          id: newEmpId,
          cedula: cleanCed || cedulaRaw || `TEMP-${Date.now().toString().slice(-4)}`,
          nombre: firstName,
          apellido: lastName,
          email: emailRaw || undefined,
          cargo: 'Repartidor Motorizado',
          departamento: 'Operaciones y Mensajería',
          salarioBase: 1423500,
          tipoContrato: 'Término Indefinido',
          nivelRiesgoARL: 4,
          fechaIngreso: new Date().toISOString().slice(0, 10),
          banco: 'Bancolombia',
          tipoCuenta: 'Ahorros',
          numeroCuenta: '000-000000-00',
          eps: 'Sura EPS',
          afp: 'Protección',
          ccf: 'Comfandi',
          activo: true,
          rol: 'Repartidor',
          jefeZonaId: defaultJefeId,
          estadoInvitacion: 'Activo',
        };

        newEmployeesToCreate.push(targetEmployee);
        if (cleanCed) employeeMap.set(cleanCed, targetEmployee);
        employeeMap.set(targetEmployee.cedula, targetEmployee);
        employeeMap.set(targetEmployee.id, targetEmployee);
        if (targetEmployee.email) employeeMap.set(targetEmployee.email, targetEmployee);
        warnings.push(`Fila ${rowNum}: El repartidor "${nombreRaw || cedulaRaw}" no existía en el sistema; fue creado automáticamente.`);
      } else {
        // Si el empleado existía pero no tenía email en el sistema y viene en el Excel, adjuntarlo
        if (emailRaw && !targetEmployee.email) {
          targetEmployee.email = emailRaw;
        }
      }

      // Compilar turnos de los 7 días
      const dias: WeeklySchedule['dias'] = {};

      const daysMapping: { day: typeof DAYS_NAMES[number]; keys: string[] }[] = [
        { day: 'Lunes', keys: ['lunes', 'lun'] },
        { day: 'Martes', keys: ['martes', 'mar'] },
        { day: 'Miércoles', keys: ['miercoles', 'miércoles', 'mie', 'mié'] },
        { day: 'Jueves', keys: ['jueves', 'jue'] },
        { day: 'Viernes', keys: ['viernes', 'vie'] },
        { day: 'Sábado', keys: ['sabado', 'sábado', 'sab', 'sáb'] },
        { day: 'Domingo', keys: ['domingo', 'dom'] },
      ];

      // Función auxiliar para buscar valor de celda ignorando acentos y mayúsculas
      const getVal = (pattern: string): any => {
        const cleanPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const [key, value] of Object.entries(row)) {
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanKey.includes(cleanPattern)) return value;
        }
        return '';
      };

      daysMapping.forEach(({ day, keys }) => {
        const prefix = keys[0];
        const rawTipo = String(getVal(`${prefix}tipo`)).trim();
        const tipo = normalizeShiftType(rawTipo);

        // Extraer observación / recomendación específica del día
        const dayObs = String(
          getVal(`${prefix}observacion`) ||
          getVal(`${prefix}observaciones`) ||
          getVal(`${prefix}recomendacion`) ||
          getVal(`${prefix}recomendaciones`) ||
          getVal(`${prefix}nota`) ||
          getVal(`${prefix}notas`) ||
          getVal(`${prefix}obs`) ||
          ''
        ).trim();

        if (tipo === 'Descanso') {
          dias[day] = {
            tipo: 'Descanso',
            observaciones: dayObs || undefined,
          };
          return;
        }

        const cliente = String(getVal(`${prefix}cliente`)).trim() || 'Almacenes Éxito S.A.';
        const puntoVenta = String(getVal(`${prefix}puntoventa`) || getVal(`${prefix}punto`) || getVal(`${prefix}sede`)).trim() || undefined;
        const ciudad = String(getVal(`${prefix}ciudad`) || getVal(`${prefix}municipio`)).trim() || undefined;

        const hIni1 = formatExcelTime(getVal(`${prefix}inicio1`), '07:00');
        const hFin1 = formatExcelTime(getVal(`${prefix}fin1`), tipo === 'Partido' ? '11:00' : '15:00');
        const hIni2 = tipo === 'Partido' ? formatExcelTime(getVal(`${prefix}inicio2`), '14:00') : undefined;
        const hFin2 = tipo === 'Partido' ? formatExcelTime(getVal(`${prefix}fin2`), '18:00') : undefined;

        // Si el día no tiene observación específica, revisar si hay una nota global
        const globalObs = String(
          row['Observaciones_Generales'] ||
          row['ObservacionesGenerales'] ||
          row['Observaciones'] ||
          ''
        ).trim();

        const obs = dayObs || globalObs;

        const shift: ShiftDetails = {
          tipo,
          clienteNombre: cliente,
          puntoVentaNombre: puntoVenta || cliente,
          ciudad: ciudad,
          horaInicio1: hIni1,
          horaFin1: hFin1,
          horaInicio2: hIni2,
          horaFin2: hFin2,
          observaciones: obs || undefined,
        };

        dias[day] = shift;
      });

      const schedId = `SCHED-${targetEmployee.id}-${semanaInicio}`;
      schedules.push({
        id: schedId,
        repartidorId: targetEmployee.id,
        jefeZonaId: defaultJefeId,
        semanaInicio,
        dias,
      });
    });
  } else {
    // FORMATO FILA POR TURNO / DÍA (Fila = 1 Turno diario)
    const schedulesByDriverAndWeek = new Map<string, WeeklySchedule>();

    rawRows.forEach((row, index) => {
      const rowNum = index + 2;
      const cedulaRaw = getRowVal(row, ['cedula', 'documento', 'identificacion', 'cc', 'doc', 'cédula']);
      const nombreRaw = getRowVal(row, ['nombre_repartidor', 'nombrerepartidor', 'nombre', 'repartidor', 'colaborador', 'empleado']);
      const emailRaw = getRowVal(row, ['correo', 'email', 'correo_electronico', 'correoelectronico', 'mail']).toLowerCase();

      if (!cedulaRaw && !nombreRaw && !emailRaw) return;

      const cleanCed = cleanDigits(cedulaRaw);
      let targetEmployee = cleanCed ? employeeMap.get(cleanCed) : undefined;
      if (!targetEmployee && cedulaRaw) targetEmployee = employeeMap.get(cedulaRaw);
      if (!targetEmployee && emailRaw) targetEmployee = employeeMap.get(emailRaw);
      if (!targetEmployee && nombreRaw) targetEmployee = employeeMap.get(normalizeName(nombreRaw));

      if (!targetEmployee) {
        const nameParts = (nombreRaw || 'Repartidor').split(' ');
        const newEmpId = `EMP-${cleanCed ? cleanCed.slice(-6) : Date.now().toString().slice(-4)}`;
        targetEmployee = {
          id: newEmpId,
          cedula: cleanCed || cedulaRaw || `TEMP-${Date.now().toString().slice(-4)}`,
          nombre: nameParts[0] || 'Repartidor',
          apellido: nameParts.slice(1).join(' ') || (cleanCed ? `C.C. ${cleanCed}` : ''),
          email: emailRaw || undefined,
          cargo: 'Repartidor Motorizado',
          departamento: 'Operaciones y Mensajería',
          salarioBase: 1423500,
          tipoContrato: 'Término Indefinido',
          nivelRiesgoARL: 4,
          fechaIngreso: new Date().toISOString().slice(0, 10),
          banco: 'Bancolombia',
          tipoCuenta: 'Ahorros',
          numeroCuenta: '000-000000-00',
          eps: 'Sura EPS',
          afp: 'Protección',
          ccf: 'Comfandi',
          activo: true,
          rol: 'Repartidor',
          jefeZonaId: defaultJefeId,
          estadoInvitacion: 'Activo',
        };
        newEmployeesToCreate.push(targetEmployee);
        if (cleanCed) employeeMap.set(cleanCed, targetEmployee);
        employeeMap.set(targetEmployee.cedula, targetEmployee);
        employeeMap.set(targetEmployee.id, targetEmployee);
        if (targetEmployee.email) employeeMap.set(targetEmployee.email, targetEmployee);
      } else {
        if (emailRaw && !targetEmployee.email) {
          targetEmployee.email = emailRaw;
        }
      }

      const rawSemana = getRowVal(row, ['semana_inicio', 'semanainicio', 'semana', 'fecha_inicio', 'fechainicio', 'fecha']) || fallbackWeek;
      const semanaInicio = normalizeExcelWeekDate(rawSemana, fallbackWeek);
      const key = `${targetEmployee.id}___${semanaInicio}`;

      if (!schedulesByDriverAndWeek.has(key)) {
        schedulesByDriverAndWeek.set(key, {
          id: `SCHED-${targetEmployee.id}-${semanaInicio}`,
          repartidorId: targetEmployee.id,
          jefeZonaId: defaultJefeId,
          semanaInicio,
          dias: {},
        });
      }

      const sched = schedulesByDriverAndWeek.get(key)!;
      const rawDia = String(row['Dia'] || row['Día'] || '').toLowerCase();
      let matchedDay: typeof DAYS_NAMES[number] = 'Lunes';

      if (rawDia.includes('mar')) matchedDay = 'Martes';
      else if (rawDia.includes('mie') || rawDia.includes('mié')) matchedDay = 'Miércoles';
      else if (rawDia.includes('jue')) matchedDay = 'Jueves';
      else if (rawDia.includes('vie')) matchedDay = 'Viernes';
      else if (rawDia.includes('sab') || rawDia.includes('sáb')) matchedDay = 'Sábado';
      else if (rawDia.includes('dom')) matchedDay = 'Domingo';

      const tipo = normalizeShiftType(String(row['Tipo'] || row['TipoTurno'] || ''));
      const rowObs = String(
        row['Observaciones'] ||
        row['Observacion'] ||
        row['Recomendaciones'] ||
        row['Recomendacion'] ||
        row['Nota'] ||
        row['Notas'] ||
        ''
      ).trim();

      if (tipo === 'Descanso') {
        sched.dias[matchedDay] = {
          tipo: 'Descanso',
          observaciones: rowObs || undefined,
        };
      } else {
        sched.dias[matchedDay] = {
          tipo,
          clienteNombre: String(row['Cliente'] || 'Almacenes Éxito S.A.').trim(),
          horaInicio1: formatExcelTime(row['HoraInicio1'] || row['Inicio1'], '07:00'),
          horaFin1: formatExcelTime(row['HoraFin1'] || row['Fin1'], tipo === 'Partido' ? '11:00' : '15:00'),
          horaInicio2: tipo === 'Partido' ? formatExcelTime(row['HoraInicio2'] || row['Inicio2'], '14:00') : undefined,
          horaFin2: tipo === 'Partido' ? formatExcelTime(row['HoraFin2'] || row['Fin2'], '18:00') : undefined,
          observaciones: rowObs || undefined,
        };
      }
    });

    schedules.push(...Array.from(schedulesByDriverAndWeek.values()));
  }

  return {
    schedules,
    newEmployeesToCreate,
    warnings,
    errors,
    summary: {
      totalRows: rawRows.length,
      parsedCount: schedules.length,
      createdEmployeesCount: newEmployeesToCreate.length,
      weekStart: fallbackWeek,
    },
  };
}
