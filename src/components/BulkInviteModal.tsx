import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Employee,
  UserRole,
  Department,
  ContractType,
  RiskLevel,
} from '../types/payroll';
import {
  buildEmployeeInvite,
  sendAutomaticInviteEmail,
  EmailInviteDetails,
} from '../services/emailInviteService';
import {
  saveEmployeeToFirestore,
  saveInvitationRecord,
  queueFirestoreMail,
} from '../services/firestoreService';
import { downloadCollaboratorExcelTemplate } from '../utils/clientExcelService';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Smartphone,
  Mail,
  ExternalLink,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

export interface ParsedBulkEmployee {
  tempId: string;
  cedula: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
  cargo: string;
  departamento: Department;
  email: string;
  telefono: string;
  placaVehiculo?: string;
  ciudad?: string;
  salarioBase: number;
  tipoContrato: ContractType;
  nivelRiesgoARL: RiskLevel;
  eps: string;
  afp: string;
  ccf: string;
  banco: string;
  tipoCuenta: 'Ahorros' | 'Corriente';
  numeroCuenta: string;
  jefeZonaRaw?: string;
  jefeZonaId?: string;
  jefeZonaName?: string;
  isValid: boolean;
  validationErrors: string[];
  isExample: boolean;
  selected: boolean;
}

export interface ProcessedInviteResult {
  employee: Employee;
  inviteDetails: EmailInviteDetails;
  emailSuccess: boolean;
  emailMessage: string;
}

interface BulkInviteContentProps {
  existingEmployees: Employee[];
  onAddEmployee: (emp: Employee) => void;
  onCompleteOrClose?: () => void;
}

export const BulkInviteContent: React.FC<BulkInviteContentProps> = ({
  existingEmployees,
  onAddEmployee,
  onCompleteOrClose,
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'completed'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedBulkEmployee[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [processedResults, setProcessedResults] = useState<ProcessedInviteResult[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [allCopiedNotice, setAllCopiedNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleReset = () => {
    setStep('upload');
    setFileName(null);
    setParsedRows([]);
    setParseError(null);
    setProcessedResults([]);
    setCurrentProgress(0);
    setTotalToProcess(0);
    setCopiedId(null);
    setAllCopiedNotice(false);
  };

  // -------------------------------------------------------------
  // 1. LECTURA Y PROCESAMIENTO DEL ARCHIVO EXCEL
  // -------------------------------------------------------------
  const processExcelFile = async (file: File) => {
    setParseError(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Buscar hoja oficial 'Colaboradores_SERGEM' o tomar la primera
      const sheetName = workbook.SheetNames.includes('Colaboradores_SERGEM')
        ? 'Colaboradores_SERGEM'
        : workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error(`No se encontró contenido en la hoja "${sheetName}".`);
      }

      // Convertir a matriz bidimensional
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      if (!rawData || rawData.length < 2) {
        throw new Error('El archivo no contiene filas de datos para procesar.');
      }

      // Encontrar fila de encabezados
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const rowText = rawData[i].map((c) => String(c || '').toLowerCase().trim()).join(' ');
        if (rowText.includes('cédula') || rowText.includes('cedula') || rowText.includes('rol')) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        headerRowIndex = 0;
      }

      const headers = rawData[headerRowIndex].map((h) => String(h || '').trim());
      const dataRows = rawData.slice(headerRowIndex + 1);

      // Normalizar mapeo de columnas
      const findColIdx = (aliases: string[]): number => {
        return headers.findIndex((h) => {
          const norm = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return aliases.some((a) => norm.includes(a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
        });
      };

      const colCedula = findColIdx(['cedula', 'documento', 'identificacion']);
      const colNombre = findColIdx(['nombre']);
      const colApellido = findColIdx(['apellido']);
      const colRol = findColIdx(['rol']);
      const colCargo = findColIdx(['cargo']);
      const colDepto = findColIdx(['departamento', 'area']);
      const colEmail = findColIdx(['correo', 'email']);
      const colTel = findColIdx(['telefono', 'celular', 'movil']);
      const colPlaca = findColIdx(['placa', 'vehiculo']);
      const colCiudad = findColIdx(['ciudad', 'sede']);
      const colSalario = findColIdx(['salario', 'sueldo']);
      const colContrato = findColIdx(['contrato']);
      const colArl = findColIdx(['arl', 'riesgo']);
      const colEps = findColIdx(['eps', 'salud']);
      const colAfp = findColIdx(['afp', 'pension']);
      const colCcf = findColIdx(['ccf', 'compensacion', 'caja']);
      const colBanco = findColIdx(['banco', 'entidad']);
      const colTipoCta = findColIdx(['tipo cuenta', 'tipo de cuenta']);
      const colNumCta = findColIdx(['numero cuenta', 'numero de cuenta']);
      const colJefe = findColIdx(['jefe de zona', 'jefe']);

      if (colCedula === -1 && colNombre === -1) {
        throw new Error('No se reconocieron las columnas básicas (Cédula, Nombres, Rol). Verifica el formato.');
      }

      const parsed: ParsedBulkEmployee[] = [];

      dataRows.forEach((row, index) => {
        const rowText = row.join('').trim();
        if (!rowText) return;

        const rawCedula = String(row[colCedula] ?? '').trim().replace(/\D/g, '');
        const rawNombre = String(row[colNombre] ?? '').trim();
        const rawApellido = colApellido !== -1 ? String(row[colApellido] ?? '').trim() : '';
        const rawRolStr = colRol !== -1 ? String(row[colRol] ?? '').trim().toLowerCase() : '';
        const rawCargo = colCargo !== -1 ? String(row[colCargo] ?? '').trim() : '';
        const rawDepto = colDepto !== -1 ? String(row[colDepto] ?? '').trim() : '';
        const rawEmail = colEmail !== -1 ? String(row[colEmail] ?? '').trim().toLowerCase() : '';
        const rawTel = colTel !== -1 ? String(row[colTel] ?? '').trim() : '';
        const rawPlaca = colPlaca !== -1 ? String(row[colPlaca] ?? '').trim().toUpperCase() : '';
        const rawCiudad = colCiudad !== -1 ? String(row[colCiudad] ?? '').trim() : 'Cali';
        const rawSalario = colSalario !== -1 ? Number(String(row[colSalario]).replace(/[^0-9.]/g, '')) || 1423500 : 1423500;
        const rawContrato = colContrato !== -1 ? String(row[colContrato] ?? '').trim() : 'Término Indefinido';
        const rawArl = colArl !== -1 ? parseInt(String(row[colArl]).replace(/\D/g, ''), 10) || 1 : 1;
        const rawEps = colEps !== -1 ? String(row[colEps] ?? '').trim() : 'Sura EPS';
        const rawAfp = colAfp !== -1 ? String(row[colAfp] ?? '').trim() : 'Protección';
        const rawCcf = colCcf !== -1 ? String(row[colCcf] ?? '').trim() : 'Comfandi';
        const rawBanco = colBanco !== -1 ? String(row[colBanco] ?? '').trim() : 'Bancolombia';
        const rawTipoCta = colTipoCta !== -1 && String(row[colTipoCta]).toLowerCase().includes('corriente') ? 'Corriente' : 'Ahorros';
        const rawNumCta = colNumCta !== -1 ? String(row[colNumCta] ?? '').trim() : '300-000000-00';
        const rawJefe = colJefe !== -1 ? String(row[colJefe] ?? '').trim() : '';

        // Determinar rol
        let rol: UserRole = 'Repartidor';
        if (rawRolStr.includes('admin')) {
          rol = 'Administrativo';
        } else if (rawRolStr.includes('jefe') && rawRolStr.includes('operacion')) {
          rol = 'Jefe de Operaciones';
        } else if (rawRolStr.includes('jefe') && rawRolStr.includes('inmediat')) {
          rol = 'Jefe Inmediato';
        } else if (rawRolStr.includes('jefe') || rawRolStr.includes('zona')) {
          rol = 'Jefe de Zona';
        } else if (rawRolStr.includes('coordinad')) {
          rol = 'Coordinador';
        } else if (rawRolStr.includes('analist')) {
          rol = 'Analista';
        } else if (rawRolStr.includes('auxiliar')) {
          rol = 'Auxiliar';
        } else {
          rol = 'Repartidor';
        }

        // Determinar departamento
        let departamento: Department = 'Operaciones y Mensajería';
        if (rol === 'Administrativo') {
          departamento = 'Administración';
        } else if (rawDepto.toLowerCase().includes('logistica')) {
          departamento = 'Logística y Despachos';
        } else if (rawDepto.toLowerCase().includes('humana')) {
          departamento = 'Gestión Humana';
        } else if (rawDepto.toLowerCase().includes('financiera') || rawDepto.toLowerCase().includes('contab')) {
          departamento = 'Financiera y Contabilidad';
        }

        const nivelRiesgoARL = (rawArl >= 1 && rawArl <= 5 ? rawArl : (rol === 'Repartidor' ? 4 : 1)) as RiskLevel;

        const placaVehiculo = rawPlaca && rawPlaca !== 'N/A' && rawPlaca !== 'NINGUNA' && rawPlaca !== '-'
          ? rawPlaca
          : undefined;

        // Vincular Jefe Inmediato / Jefe de Zona si es repartidor o auxiliar
        let jefeZonaId: string | undefined = undefined;
        let jefeZonaName: string | undefined = undefined;

        if ((rol === 'Repartidor' || rol === 'Auxiliar') && rawJefe && rawJefe !== 'N/A' && rawJefe !== '-') {
          const cedulaMatch = rawJefe.match(/\d{6,12}/);
          const searchedCedula = cedulaMatch ? cedulaMatch[0] : null;

          const isLeadershipRole = (r: UserRole) =>
            r === 'Jefe de Zona' ||
            r === 'Jefe de Operaciones' ||
            r === 'Jefe Inmediato' ||
            r === 'Coordinador' ||
            r === 'Administrativo';

          const foundInExisting = existingEmployees.find((e) => {
            if (!isLeadershipRole(e.rol)) return false;
            if (searchedCedula && e.cedula === searchedCedula) return true;
            const full = `${e.nombre} ${e.apellido}`.toLowerCase();
            return full.includes(rawJefe.toLowerCase()) || rawJefe.toLowerCase().includes(e.nombre.toLowerCase());
          });

          if (foundInExisting) {
            jefeZonaId = foundInExisting.id;
            jefeZonaName = `${foundInExisting.nombre} ${foundInExisting.apellido}`;
          } else {
            jefeZonaName = rawJefe;
          }
        }

        const validationErrors: string[] = [];
        if (!rawCedula) validationErrors.push('Falta Cédula');
        if (!rawNombre) validationErrors.push('Falta Nombre');
        if (!rawEmail) {
          validationErrors.push('Falta Correo Electrónico (Requerido para generar invitación)');
        } else if (!/^\S+@\S+\.\S+$/.test(rawEmail)) {
          validationErrors.push('Formato de Correo Inválido');
        }

        const isExample =
          rawCedula === '1144123456' ||
          rawCedula === '1130987654' ||
          rawCedula === '94567890' ||
          rawEmail.includes('carlos.repartidor@gmail.com') ||
          rawEmail.includes('diana.administrativo@sergemsas.com') ||
          rawEmail.includes('hernando.jefezona@sergemsas.com');

        parsed.push({
          tempId: `BULK-${index + 1}-${Date.now().toString(36)}`,
          cedula: rawCedula || `TEMP-${index + 1}`,
          nombre: rawNombre || `Colaborador ${index + 1}`,
          apellido: rawApellido,
          rol,
          cargo: rawCargo || (rol === 'Repartidor' ? 'Repartidor Motorizado' : rol),
          departamento,
          email: rawEmail,
          telefono: rawTel,
          placaVehiculo,
          ciudad: rawCiudad,
          salarioBase: rawSalario,
          tipoContrato: (rawContrato as ContractType) || 'Término Indefinido',
          nivelRiesgoARL,
          eps: rawEps,
          afp: rawAfp,
          ccf: rawCcf,
          banco: rawBanco,
          tipoCuenta: rawTipoCta,
          numeroCuenta: rawNumCta,
          jefeZonaRaw: rawJefe,
          jefeZonaId,
          jefeZonaName,
          isValid: validationErrors.length === 0,
          validationErrors,
          isExample,
          selected: validationErrors.length === 0,
        });
      });

      if (parsed.length === 0) {
        throw new Error('No se encontraron filas con datos de colaboradores válidos.');
      }

      setParsedRows(parsed);
      setStep('preview');
    } catch (err: any) {
      console.error('Error al procesar archivo Excel:', err);
      setParseError(err.message || 'Error al interpretar el archivo de Excel.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
  };

  const toggleRowSelection = (tempId: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, selected: !r.selected } : r))
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: r.isValid ? checked : false,
      }))
    );
  };

  // -------------------------------------------------------------
  // 2. EJECUCIÓN DE LA CARGA MASIVA Y GENERACIÓN DE ENLACES
  // -------------------------------------------------------------
  const handleProcessBulkUpload = async () => {
    const selectedRows = parsedRows.filter((r) => r.selected && r.isValid);
    if (selectedRows.length === 0) return;

    setStep('processing');
    setTotalToProcess(selectedRows.length);
    setCurrentProgress(0);

    const results: ProcessedInviteResult[] = [];

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];

      const newEmployee: Employee = {
        id: `EMP-${row.cedula.slice(-6) || Date.now().toString().slice(-4)}`,
        cedula: row.cedula,
        nombre: row.nombre,
        apellido: row.apellido,
        cargo: row.cargo,
        departamento: row.departamento,
        salarioBase: row.salarioBase,
        tipoContrato: row.tipoContrato,
        nivelRiesgoARL: row.nivelRiesgoARL,
        fechaIngreso: new Date().toISOString().slice(0, 10),
        banco: row.banco,
        tipoCuenta: row.tipoCuenta,
        numeroCuenta: row.numeroCuenta,
        eps: row.eps,
        afp: row.afp,
        ccf: row.ccf,
        activo: true,
        rol: row.rol,
        placaVehiculo: row.placaVehiculo,
        jefeZonaId: row.jefeZonaId,
        email: row.email,
        telefono: row.telefono || undefined,
        ciudad: row.ciudad,
        estadoInvitacion: 'Enviada',
      };

      try {
        onAddEmployee(newEmployee);
        await saveEmployeeToFirestore(newEmployee);
      } catch (e) {
        console.warn('Error al guardar empleado en Firestore durante carga masiva:', e);
      }

      const jefeName = row.jefeZonaName;
      let emailSuccess = false;
      let emailMessage = '';
      let inviteDetails: EmailInviteDetails;

      try {
        const dispatchRes = await sendAutomaticInviteEmail(newEmployee, jefeName);
        inviteDetails = dispatchRes.details;
        emailSuccess = dispatchRes.success;
        emailMessage = dispatchRes.message;

        if (newEmployee.email) {
          await queueFirestoreMail({
            to: newEmployee.email,
            subject: inviteDetails.subject,
            text: inviteDetails.bodyText,
          });
        }

        await saveInvitationRecord({
          id: `INV-${newEmployee.id}`,
          employeeId: newEmployee.id,
          recipientEmail: newEmployee.email || '',
          recipientName: `${newEmployee.nombre} ${newEmployee.apellido}`,
          role: newEmployee.rol,
          portal: inviteDetails.portal,
          inviteUrl: inviteDetails.inviteUrl,
          status: 'Enviada',
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      } catch (err: any) {
        inviteDetails = buildEmployeeInvite(newEmployee, jefeName);
        emailSuccess = false;
        emailMessage = err.message || 'Error al despachar correo';
      }

      results.push({
        employee: newEmployee,
        inviteDetails,
        emailSuccess,
        emailMessage,
      });

      setCurrentProgress(i + 1);
    }

    setProcessedResults(results);
    setStep('completed');

    // Descarga automática del reporte oficial en Excel al finalizar la carga
    try {
      setTimeout(() => {
        generateExcelReport(results);
      }, 350);
    } catch (e) {
      console.warn('Descarga automática de reporte diferida:', e);
    }
  };

  const handleCopySingleLink = (inviteUrl: string, id: string) => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyAllLinks = () => {
    if (processedResults.length === 0) return;

    const lines = [
      '=====================================================',
      'SERGEM S.A.S. - ENLACES OFICIALES DE INVITACIÓN',
      `Fecha de Generación: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`,
      `Total Colaboradores: ${processedResults.length}`,
      '=====================================================\n',
    ];

    processedResults.forEach((res, idx) => {
      const emp = res.employee;
      lines.push(`${idx + 1}. ${emp.nombre} ${emp.apellido}`);
      lines.push(`   • Rol: ${emp.rol} | Cargo: ${emp.cargo}`);
      lines.push(`   • Cédula: ${emp.cedula}`);
      lines.push(`   • Correo: ${emp.email || 'Sin correo'}`);
      if (emp.telefono) lines.push(`   • Teléfono: ${emp.telefono}`);
      if (emp.placaVehiculo) lines.push(`   • Placa: ${emp.placaVehiculo}`);
      lines.push(`   • Portal Asignado: ${res.inviteDetails.portalDisplayName}`);
      lines.push(`   • Enlace de Acceso: ${res.inviteDetails.inviteUrl}`);
      lines.push('');
    });

    lines.push('Instrucciones para el colaborador: Abrir el enlace desde cualquier navegador móvil o de escritorio para ingresar automáticamente con su perfil configurado.');

    navigator.clipboard.writeText(lines.join('\n'));
    setAllCopiedNotice(true);
    setTimeout(() => setAllCopiedNotice(false), 3000);
  };

  const generateExcelReport = (data: ProcessedInviteResult[]) => {
    if (data.length === 0) return;

    const exportData = [
      [
        'Cédula',
        'Nombre Completo',
        'Rol Asignado (Repartidor, Administrativo o Jefe de Zona)',
        'Cargo',
        'Correo Electrónico',
        'Teléfono / Celular',
        'Placa Vehículo',
        'Ciudad / Sede',
        'Enlace de Invitación Oficial (la URL completa y directa que debes enviarle a cada uno)',
        'Estado del Envío / Creación',
        'Fecha de Generación'
      ],
      ...data.map((r) => [
        r.employee.cedula,
        `${r.employee.nombre} ${r.employee.apellido}`.trim(),
        r.employee.rol,
        r.employee.cargo || 'No especificado',
        r.employee.email || 'Sin correo',
        r.employee.telefono || 'Sin registrar',
        r.employee.placaVehiculo || 'N/A',
        r.employee.ciudad || 'Cali',
        r.inviteDetails.inviteUrl,
        r.emailSuccess ? 'Invitación Notificada por Correo' : 'Enlace Oficial Generado Exitosamente',
        new Date().toLocaleString('es-CO')
      ])
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);

    ws['!cols'] = [
      { wch: 16 }, // Cédula
      { wch: 32 }, // Nombre Completo
      { wch: 28 }, // Rol Asignado
      { wch: 35 }, // Cargo
      { wch: 35 }, // Correo Electrónico
      { wch: 20 }, // Teléfono / Celular
      { wch: 16 }, // Placa Vehículo
      { wch: 18 }, // Ciudad / Sede
      { wch: 85 }, // Enlace de Invitación Oficial
      { wch: 35 }, // Estado del Envío / Creación
      { wch: 22 }  // Fecha de Generación
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Reporte_Invitaciones_SERGEM');
    XLSX.writeFile(wb, `Reporte_Enlaces_Invitacion_SERGEM_${Date.now()}.xlsx`);
  };

  const handleDownloadGeneratedLinksExcel = () => {
    generateExcelReport(processedResults);
  };

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------- */}
      {/* PASO 1: SUBIR ARCHIVO */}
      {/* -------------------------------------------------------- */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Banner Descargar Plantilla */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <Download className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                  ¿Aún no tienes la plantilla oficial lista?
                </h4>
                <p className="text-[11px] sm:text-xs text-emerald-800 font-medium">
                  Descarga la plantilla con ejemplos listos para <strong>Jefe Inmediato</strong>, <strong>Coordinador</strong>, <strong>Analista</strong>, <strong>Auxiliar</strong>, <strong>Repartidor</strong> y <strong>Jefe de Zona</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                downloadCollaboratorExcelTemplate();
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
              title="Descargar Plantilla Oficial de Colaboradores Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla Excel (.xlsx)</span>
            </button>
          </div>

          {/* Zona Drag & Drop */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 ${
              dragActive
                ? 'border-red-500 bg-red-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-red-400 bg-slate-50/60 hover:bg-red-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs border border-red-200">
              <Upload className="w-8 h-8 text-red-600" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-black text-slate-800">
                Arrastra y suelta tu archivo Excel aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Soporta archivos oficiales <strong>.xlsx</strong>, <strong>.xls</strong> o <strong>.csv</strong>
              </p>
            </div>
            <div className="pt-2 flex items-center space-x-2 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-2xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Formato recomendado: Plantilla_Registro_Colaboradores_SERGEM.xlsx</span>
            </div>
          </div>

          {parseError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3 text-red-900 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* PASO 2: VISTA PREVIA Y VALIDACIÓN */}
      {/* -------------------------------------------------------- */}
      {step === 'preview' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Archivo cargado: <span className="text-emerald-700">{fileName}</span>
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Se detectaron <strong>{parsedRows.length}</strong> colaboradores • 
                  {' '}<strong>{parsedRows.filter((r) => r.isValid).length}</strong> válidos • 
                  {' '}<strong>{parsedRows.filter((r) => r.selected).length}</strong> seleccionados para procesar
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => handleReset()}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer transition-all"
              >
                Cambiar Archivo
              </button>
            </div>
          </div>

          {parsedRows.some((r) => r.isExample) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Se detectaron filas con los datos de ejemplo de la plantilla. Puedes desmarcarlas si solo deseas importar tu personal real.
                </span>
              </div>
              <button
                onClick={() => {
                  setParsedRows((prev) =>
                    prev.map((r) => (r.isExample ? { ...r, selected: false } : r))
                  );
                }}
                className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 font-bold rounded-lg text-[11px] hover:bg-amber-100/60 cursor-pointer shrink-0 ml-3"
              >
                Desmarcar Ejemplos
              </button>
            </div>
          )}

          {/* Tabla de Vista Previa */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={parsedRows.length > 0 && parsedRows.every((r) => !r.isValid || r.selected)}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">Colaborador</th>
                    <th className="py-2.5 px-3">Cédula</th>
                    <th className="py-2.5 px-3">Rol</th>
                    <th className="py-2.5 px-3">Correo (Para Invitación)</th>
                    <th className="py-2.5 px-3">Vehículo / Jefe</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.tempId}
                      className={`hover:bg-slate-50 transition-colors ${
                        !row.isValid ? 'bg-red-50/40 text-slate-400' : row.isExample ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={!row.isValid}
                          onChange={() => toggleRowSelection(row.tempId)}
                          className="rounded text-red-600 focus:ring-red-500 cursor-pointer disabled:opacity-30"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <div>
                          {row.nombre} {row.apellido}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">{row.cargo}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{row.cedula}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            row.rol === 'Repartidor'
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : row.rol === 'Jefe de Zona'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : row.rol === 'Jefe Inmediato'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : row.rol === 'Coordinador'
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : row.rol === 'Analista'
                              ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                              : row.rol === 'Auxiliar'
                              ? 'bg-orange-50 text-orange-800 border-orange-200'
                              : row.rol === 'Jefe de Operaciones'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                        >
                          {row.rol}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <div className="truncate max-w-[180px] font-medium">{row.email || '—'}</div>
                        {row.telefono && (
                          <div className="text-[10px] text-slate-400">{row.telefono}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600">
                        {row.rol === 'Repartidor' ? (
                          <div>
                            {row.placaVehiculo && (
                              <span className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded border mr-1">
                                {row.placaVehiculo}
                              </span>
                            )}
                            <span className="text-slate-500">
                              {row.jefeZonaName ? `Jefe: ${row.jefeZonaName}` : 'Sin Jefe Asignado'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.isValid ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Listo
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full cursor-help"
                            title={row.validationErrors.join(', ')}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {row.validationErrors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500 font-medium">
              Al procesar, se registrarán los colaboradores y se crearán los enlaces oficiales con redirección a sus portales.
            </p>
            <button
              onClick={handleProcessBulkUpload}
              disabled={parsedRows.filter((r) => r.selected).length === 0}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs md:text-sm shadow-md shadow-red-600/20 flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
            >
              <span>Procesar {parsedRows.filter((r) => r.selected).length} Invitaciones y Crear Enlaces</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* PASO 3: PROCESANDO EN VIVO */}
      {/* -------------------------------------------------------- */}
      {step === 'processing' && (
        <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shadow-inner">
            <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-black text-slate-900">
              Generando Enlaces y Procesando Invitaciones...
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Procesando colaborador <strong>{currentProgress}</strong> de <strong>{totalToProcess}</strong>. Guardando en base de datos y preparando accesos oficiales.
            </p>
          </div>

          <div className="w-full max-w-md bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 p-0.5">
            <div
              className="bg-gradient-to-r from-red-600 to-emerald-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${totalToProcess > 0 ? (currentProgress / totalToProcess) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* PASO 4: RESULTADOS COMPLETOS Y ENLACES GENERADOS */}
      {/* -------------------------------------------------------- */}
      {step === 'completed' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300 shadow-2xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-emerald-950">
                  ¡Carga Masiva e Invitaciones Procesadas con Éxito!
                </h4>
                <p className="text-xs text-emerald-800 font-medium mt-0.5">
                  Se han registrado <strong>{processedResults.length}</strong> colaboradores y se ha <strong>descargado automáticamente el Reporte en Excel</strong> con todos los enlaces oficiales.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleCopyAllLinks}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-900 font-bold rounded-xl text-xs shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                {allCopiedNotice ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-700" />}
                <span>{allCopiedNotice ? '¡Todos Copiados!' : 'Copiar Todos los Enlaces'}</span>
              </button>

              <button
                onClick={handleDownloadGeneratedLinksExcel}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Reporte (Excel)</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800">
                Listado de Enlaces Oficiales Generados
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {processedResults.length} colaboradores
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Colaborador</th>
                    <th className="py-2.5 px-3">Rol & Portal</th>
                    <th className="py-2.5 px-3">Correo Destino</th>
                    <th className="py-2.5 px-3">Enlace Generado</th>
                    <th className="py-2.5 px-3 text-right">Acciones Directas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedResults.map((res) => {
                    const emp = res.employee;
                    const details = res.inviteDetails;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {emp.nombre} {emp.apellido}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">C.C. {emp.cedula}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              emp.rol === 'Repartidor'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : emp.rol === 'Jefe de Zona'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                          >
                            {emp.rol}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[140px]">
                            {details.portalDisplayName}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <div className="font-medium text-slate-900">{emp.email || '—'}</div>
                          {emp.telefono && (
                            <div className="text-[10px] text-slate-400">{emp.telefono}</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-1.5 max-w-[220px]">
                            <input
                              type="text"
                              readOnly
                              value={details.inviteUrl}
                              className="text-[11px] font-mono bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 w-full text-slate-600 select-all"
                            />
                            <button
                              onClick={() => handleCopySingleLink(details.inviteUrl, emp.id)}
                              className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0 active:scale-95"
                              title="Copiar enlace"
                            >
                              {copiedId === emp.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {details.gmailUrl && (
                              <a
                                href={details.gmailUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Enviar por Gmail Web"
                                className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg transition-all cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {details.whatsappUrl && (
                              <a
                                href={details.whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Enviar por WhatsApp"
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg transition-all cursor-pointer"
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <a
                              href={details.inviteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Probar enlace en nueva pestaña"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              onClick={() => {
                handleReset();
                if (onCompleteOrClose) onCompleteOrClose();
              }}
              className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs md:text-sm shadow-md cursor-pointer transition-all active:scale-95"
            >
              Finalizar y Regresar al Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface BulkInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingEmployees: Employee[];
  onAddEmployee: (emp: Employee) => void;
}

export const BulkInviteModal: React.FC<BulkInviteModalProps> = ({
  isOpen,
  onClose,
  existingEmployees,
  onAddEmployee,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                Carga Masiva de Invitaciones por Excel
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Sube la plantilla de colaboradores de SERGEM S.A.S. para crear usuarios y generar enlaces de inmediato
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <BulkInviteContent
            existingEmployees={existingEmployees}
            onAddEmployee={onAddEmployee}
            onCompleteOrClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
