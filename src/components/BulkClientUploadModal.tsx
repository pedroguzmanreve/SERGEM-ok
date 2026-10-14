import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { CompanyClient, Empresa, CentroCosto, PuntoVenta } from '../types/payroll';
import {
  saveClientToFirestore,
  saveCompanyToFirestore,
  saveCostCenterToFirestore,
  savePointOfSaleToFirestore
} from '../services/firestoreService';
import { downloadClientExcelTemplate } from '../utils/clientExcelService';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Building2,
  RefreshCw,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Layers,
  Tag,
  Store
} from 'lucide-react';

export interface ParsedBulkClient {
  tempId: string;
  // Nivel 1: Empresa
  empresaNombre: string;
  nit?: string;
  // Nivel 2: Centro de Costo
  centroCostoCodigo: string;
  centroCostoNombre: string;
  // Nivel 3: Punto de Venta (con Ciudad)
  puntoVentaCodigo?: string;
  puntoVentaNombre: string;
  nombre: string; // Para compatibilidad
  ciudad: string;
  direccion?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  tarifaHoraBase?: number;
  observaciones?: string;
  activo: boolean;
  isValid: boolean;
  validationErrors: string[];
  isExample: boolean;
  selected: boolean;
}

export interface ProcessedClientResult {
  client: CompanyClient;
  empresa?: Empresa;
  centroCosto?: CentroCosto;
  puntoVenta?: PuntoVenta;
  isNew: boolean;
  success: boolean;
  message: string;
}

interface BulkClientUploadContentProps {
  existingClients: CompanyClient[];
  onSaveClient?: (client: CompanyClient) => Promise<void> | void;
  onCompleteOrClose?: () => void;
}

export const BulkClientUploadContent: React.FC<BulkClientUploadContentProps> = ({
  existingClients = [],
  onSaveClient,
  onCompleteOrClose,
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'completed'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedBulkClient[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [processedResults, setProcessedResults] = useState<ProcessedClientResult[]>([]);
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
  // 1. LECTURA Y PROCESAMIENTO DEL ARCHIVO EXCEL DE CLIENTES
  // -------------------------------------------------------------
  const processExcelFile = async (file: File) => {
    setParseError(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Buscar hoja oficial 'Clientes_SERGEM' o tomar la primera
      const sheetName = workbook.SheetNames.includes('Clientes_SERGEM')
        ? 'Clientes_SERGEM'
        : workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error(`No se encontró contenido en la hoja "${sheetName}".`);
      }

      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      if (!rawData || rawData.length < 2) {
        throw new Error('El archivo no contiene filas de datos para procesar.');
      }

      // Encontrar fila de encabezados buscando los 4 campos clave
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const rowText = rawData[i]
          .map((c) => String(c || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim())
          .join(' ');
        if (
          rowText.includes('empresa') ||
          rowText.includes('centro') ||
          rowText.includes('punto') ||
          rowText.includes('ciudad') ||
          rowText.includes('cliente')
        ) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        headerRowIndex = 0;
      }

      const headers = rawData[headerRowIndex].map((h) => String(h || '').trim());
      const dataRows = rawData.slice(headerRowIndex + 1);

      // Función de coincidencia flexible sin importar mayúsculas, tildes, guiones o espacios
      const findColIdx = (aliases: string[]): number => {
        return headers.findIndex((h) => {
          const norm = h
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
          return aliases.some((a) => {
            const cleanA = a
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '');
            return norm === cleanA || norm.includes(cleanA) || cleanA.includes(norm);
          });
        });
      };

      // 1. Columna EMPRESA (Requerida)
      const colEmpresa = findColIdx([
        'empresa',
        'razonsocial',
        'nombreempresa',
        'cliente',
        'clientecorporativo',
        'compania',
        'company'
      ]);

      // 2. Columna CENTRO_COSTO / CENTRO_C (Requerida)
      const colCentroCosto = findColIdx([
        'centroc',
        'centrocosto',
        'centrocostos',
        'centrodecosto',
        'codigocentrocosto',
        'codcentrocosto',
        'codcc',
        'codigocc',
        'cc'
      ]);

      // 3. Columna PUNTO_VENTA (Requerida)
      const colPuntoVenta = findColIdx([
        'puntoventa',
        'puntodeventa',
        'nombrepuntoventa',
        'pv',
        'sede',
        'tienda',
        'muelle',
        'sucursal',
        'nombresede'
      ]);

      // 4. Columna CIUDAD (Requerida)
      const colCiudad = findColIdx([
        'ciudad',
        'municipio',
        'city',
        'sedeoperativa'
      ]);

      // Columnas secundarias / opcionales (por compatibilidad si existen)
      const colEmpresaNit = findColIdx(['nitempresa', 'nit', 'rut', 'identificacion']);
      const colDireccion = findColIdx(['direccion', 'domicilio', 'bodega']);
      const colContacto = findColIdx(['contacto', 'supervisor', 'coordinador']);
      const colTelefono = findColIdx(['telefono', 'celular', 'movil', 'whatsapp']);
      const colEmail = findColIdx(['correo', 'email', 'mail']);
      const colTarifa = findColIdx(['tarifa', 'valorhora', 'preciohora', 'horabase']);
      const colObs = findColIdx(['observaciones', 'requisitos', 'notas', 'epp']);
      const colEstado = findColIdx(['estado', 'activo']);

      const parsed: ParsedBulkClient[] = [];

      dataRows.forEach((row, index) => {
        const rowText = row.join('').trim();
        if (!rowText) return;

        // 1. EMPRESA
        let rawEmpresa = colEmpresa !== -1 ? String(row[colEmpresa] ?? '').trim() : '';

        // 2. CENTRO DE COSTO (CENTRO_C / CENTRO_COSTO)
        let rawCentroCosto = colCentroCosto !== -1 ? String(row[colCentroCosto] ?? '').trim() : '';
        if (!rawCentroCosto) {
          rawCentroCosto = 'Operación Principal';
        }

        // 3. PUNTO DE VENTA
        let rawPvNombre = colPuntoVenta !== -1 ? String(row[colPuntoVenta] ?? '').trim() : '';

        // 4. CIUDAD
        let rawCiudad = colCiudad !== -1 ? String(row[colCiudad] ?? '').trim() : '';
        if (!rawCiudad) {
          rawCiudad = 'Cali';
        }

        // Si solo se ingresó una columna de nombre general
        if (!rawEmpresa && rawPvNombre) {
          rawEmpresa = rawPvNombre;
        } else if (rawEmpresa && !rawPvNombre) {
          rawPvNombre = rawEmpresa;
        }

        // Campos complementarios opcionales
        const rawNit = colEmpresaNit !== -1 ? String(row[colEmpresaNit] ?? '').trim() : '';
        const rawDireccion = colDireccion !== -1 ? String(row[colDireccion] ?? '').trim() : '';
        const rawContacto = colContacto !== -1 ? String(row[colContacto] ?? '').trim() : '';
        const rawTelefono = colTelefono !== -1 ? String(row[colTelefono] ?? '').trim() : '';
        const rawEmail = colEmail !== -1 ? String(row[colEmail] ?? '').trim().toLowerCase() : '';
        const rawTarifaStr = colTarifa !== -1 ? String(row[colTarifa] ?? '').replace(/[^0-9.]/g, '') : '';
        const rawTarifa = rawTarifaStr ? Number(rawTarifaStr) : 12500;
        const rawObs = colObs !== -1 ? String(row[colObs] ?? '').trim() : '';
        const rawEstadoStr = colEstado !== -1 ? String(row[colEstado] ?? '').toLowerCase().trim() : 'activo';
        const activo = !rawEstadoStr.includes('inactiv') && !rawEstadoStr.includes('no');

        // VALIDACIÓN ESTRICTA ÚNICAMENTE DE LOS CAMPOS SOLICITADOS
        const validationErrors: string[] = [];
        if (!rawEmpresa) {
          validationErrors.push('Falta Nombre de la Empresa');
        }
        if (!rawPvNombre) {
          validationErrors.push('Falta Nombre del Punto de Venta');
        }
        if (!rawCiudad) {
          validationErrors.push('Falta Ciudad de la Sede');
        }

        const isExample =
          rawNit.includes('890.900.608') ||
          rawEmpresa.toUpperCase().includes('ALKOSTO') ||
          rawEmpresa.toUpperCase().includes('TCC LOGÍSTICA') ||
          rawEmpresa.toUpperCase().includes('DISTRIBUIDORA DE MEDICAMENTOS');

        // Generar código de Centro de Costo limpio
        const cleanCcCode = rawCentroCosto.toUpperCase().startsWith('CC')
          ? rawCentroCosto.toUpperCase()
          : `CC-${String(index + 1).padStart(2, '0')}`;

        parsed.push({
          tempId: `BULK-CLI-${index + 1}-${Date.now().toString(36)}`,
          empresaNombre: rawEmpresa,
          nit: rawNit || undefined,
          centroCostoCodigo: cleanCcCode,
          centroCostoNombre: rawCentroCosto,
          puntoVentaCodigo: `PV-${String(index + 1).padStart(2, '0')}`,
          puntoVentaNombre: rawPvNombre,
          nombre: rawPvNombre.toLowerCase().includes(rawEmpresa.toLowerCase())
            ? rawPvNombre
            : `${rawEmpresa} - ${rawPvNombre}`,
          ciudad: rawCiudad,
          direccion: rawDireccion || undefined,
          contactoNombre: rawContacto || undefined,
          contactoTelefono: rawTelefono || undefined,
          contactoEmail: rawEmail || undefined,
          tarifaHoraBase: isNaN(rawTarifa) || rawTarifa <= 0 ? 12500 : rawTarifa,
          observaciones: rawObs || undefined,
          activo,
          isValid: validationErrors.length === 0,
          validationErrors,
          isExample,
          selected: validationErrors.length === 0,
        });
      });

      if (parsed.length === 0) {
        throw new Error('No se encontraron filas con datos válidos de clientes en el archivo.');
      }

      setParsedRows(parsed);
      setStep('preview');
    } catch (err: any) {
      console.error('Error al procesar archivo Excel de clientes:', err);
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
  // 2. EJECUCIÓN DE LA CARGA MASIVA DE CLIENTES
  // -------------------------------------------------------------
  const handleProcessBulkUpload = async () => {
    const selectedRows = parsedRows.filter((r) => r.selected && r.isValid);
    if (selectedRows.length === 0) return;

    setStep('processing');
    setTotalToProcess(selectedRows.length);
    setCurrentProgress(0);

    const results: ProcessedClientResult[] = [];

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];

      // Función auxiliar para generar identificadores limpios y agrupables
      const cleanIdPart = (text: string, maxLen = 14) =>
        String(text || '')
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, maxLen);

      const empCode = cleanIdPart(row.empresaNombre) || `EMP${i + 1}`;
      const ccCode = cleanIdPart(row.centroCostoCodigo || row.centroCostoNombre) || 'CC01';
      const pvCode = cleanIdPart(row.puntoVentaNombre) || `PV${i + 1}`;
      const ciudadCode = cleanIdPart(row.ciudad, 8) || 'CALI';

      // Agrupación consistente: sedes de la misma empresa comparten empresaId y centroCostoId
      const empresaId = `EMP-${empCode}`;
      const centroCostoId = `CC-${empCode}-${ccCode}`;
      const puntoVentaId = `PV-${empCode}-${pvCode}-${ciudadCode}`;

      // 1. Nivel 1: Empresa
      const newEmpresa: Empresa = {
        id: empresaId,
        nit: row.nit || 'Sin NIT',
        nombre: row.empresaNombre,
        contactoPrincipal: row.contactoNombre,
        email: row.contactoEmail,
        telefono: row.contactoTelefono,
        direccionSedePrincipal: row.direccion,
        ciudadPrincipal: row.ciudad,
        activo: row.activo,
        fechaCreacion: new Date().toISOString().split('T')[0],
        observaciones: row.observaciones,
      };

      // 2. Nivel 2: Centro de Costo
      const newCentroCosto: CentroCosto = {
        id: centroCostoId,
        empresaId,
        empresaNombre: row.empresaNombre,
        codigo: row.centroCostoCodigo,
        nombre: row.centroCostoNombre,
        responsable: row.contactoNombre,
        telefono: row.contactoTelefono,
        email: row.contactoEmail,
        activo: row.activo,
        fechaCreacion: new Date().toISOString().split('T')[0],
        observaciones: row.observaciones,
      };

      // 3. Nivel 3: Punto de Venta (con Ciudad)
      const newPuntoVenta: PuntoVenta = {
        id: puntoVentaId,
        centroCostoId,
        centroCostoNombre: row.centroCostoNombre,
        empresaId,
        empresaNombre: row.empresaNombre,
        codigo: row.puntoVentaCodigo,
        nombre: row.puntoVentaNombre,
        ciudad: row.ciudad,
        direccion: row.direccion,
        supervisorContacto: row.contactoNombre,
        telefonoContacto: row.contactoTelefono,
        emailContacto: row.contactoEmail,
        tarifaHoraBase: row.tarifaHoraBase,
        observaciones: row.observaciones,
        activo: row.activo,
        fechaCreacion: new Date().toISOString().split('T')[0],
      };

      // 4. Compatibilidad Cliente
      const newClient: CompanyClient = {
        id: puntoVentaId,
        nombre: row.nombre,
        nit: row.nit?.trim() || undefined,
        ciudad: row.ciudad.trim() || 'Cali',
        direccion: row.direccion?.trim() || undefined,
        contactoNombre: row.contactoNombre?.trim() || undefined,
        contactoTelefono: row.contactoTelefono?.trim() || undefined,
        contactoEmail: row.contactoEmail?.trim() || undefined,
        tarifaHoraBase: row.tarifaHoraBase,
        observaciones: row.observaciones?.trim() || undefined,
        activo: row.activo,
        fechaCreacion: new Date().toISOString().split('T')[0],
        empresaId,
        empresaNombre: row.empresaNombre,
        centroCostoId,
        centroCostoNombre: row.centroCostoNombre,
        codigoPunto: row.puntoVentaCodigo,
        codigoCentroCosto: row.centroCostoCodigo,
      };

      let success = true;
      let message = 'Estructura Jerárquica creada con éxito';

      try {
        await saveCompanyToFirestore(newEmpresa);
        await saveCostCenterToFirestore(newCentroCosto);
        await savePointOfSaleToFirestore(newPuntoVenta);

        if (onSaveClient) {
          await onSaveClient(newClient);
        } else {
          await saveClientToFirestore(newClient);
        }
      } catch (err: any) {
        console.warn(`Error guardando estructura jerárquica para ${newClient.nombre}:`, err);
        success = false;
        message = err.message || 'Error al persistir en base de datos';
      }

      results.push({
        client: newClient,
        empresa: newEmpresa,
        centroCosto: newCentroCosto,
        puntoVenta: newPuntoVenta,
        isNew: true,
        success,
        message,
      });

      setCurrentProgress(i + 1);
    }

    setProcessedResults(results);
    setStep('completed');
  };

  const handleCopyAllClients = () => {
    if (processedResults.length === 0) return;

    const lines = [
      '=====================================================',
      'SERGEM S.A.S. - DIRECTORIO DE CLIENTES CARGADOS',
      `Fecha: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`,
      `Total Clientes: ${processedResults.length}`,
      '=====================================================\n',
    ];

    processedResults.forEach((res, idx) => {
      const cli = res.client;
      lines.push(`${idx + 1}. ${cli.nombre}`);
      lines.push(`   • ID: ${cli.id} | NIT: ${cli.nit || 'Sin NIT'}`);
      lines.push(`   • Ciudad / Sede: ${cli.ciudad} | Dirección: ${cli.direccion || 'Sin dirección'}`);
      lines.push(`   • Contacto: ${cli.contactoNombre || 'Sin contacto'} (${cli.contactoTelefono || 'Sin teléfono'})`);
      if (cli.contactoEmail) lines.push(`   • Correo: ${cli.contactoEmail}`);
      lines.push(`   • Tarifa Base Hora: $${(cli.tarifaHoraBase ?? 12500).toLocaleString('es-CO')} COP`);
      lines.push(`   • Estado: ${cli.activo ? 'Activo' : 'Inactivo'}`);
      lines.push('');
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setAllCopiedNotice(true);
    setTimeout(() => setAllCopiedNotice(false), 3000);
  };

  const handleDownloadGeneratedClientsExcel = () => {
    if (processedResults.length === 0) return;

    const exportData = [
      [
        'ID Sede',
        'EMPRESA',
        'CENTRO_COSTO',
        'PUNTO_VENTA',
        'CIUDAD',
        'ESTADO',
        'RESULTADO',
        'FECHA'
      ],
      ...processedResults.map((r) => [
        r.client.id,
        r.empresa?.nombre || r.client.empresaNombre || r.client.nombre,
        r.centroCosto?.nombre || r.client.centroCostoNombre || 'Operación Principal',
        r.puntoVenta?.nombre || r.client.nombre,
        r.puntoVenta?.ciudad || r.client.ciudad || 'Cali',
        r.client.activo ? 'Activo' : 'Inactivo',
        r.isNew ? 'Registrado con éxito' : 'Actualizado',
        new Date().toLocaleDateString('es-CO')
      ])
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);

    ws['!cols'] = [
      { wch: 22 }, // ID Sede
      { wch: 32 }, // EMPRESA
      { wch: 26 }, // CENTRO_COSTO
      { wch: 32 }, // PUNTO_VENTA
      { wch: 18 }, // CIUDAD
      { wch: 14 }, // ESTADO
      { wch: 22 }, // RESULTADO
      { wch: 16 }  // FECHA
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Clientes_SERGEM_Cargados');
    XLSX.writeFile(wb, `Reporte_Clientes_SERGEM_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------- */}
      {/* PASO 1: SUBIR ARCHIVO */}
      {/* -------------------------------------------------------- */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Banner con las 4 Columnas Oficiales (Estilo idéntico a la plantilla) */}
          <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-extrabold uppercase tracking-wider">
                  Estructura Requerida
                </span>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  Carga Masiva de Clientes con 4 Datos Esenciales
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <div className="px-3 py-1 bg-amber-200/90 text-amber-950 font-black font-mono text-[11px] rounded-lg border border-amber-400/80 shadow-2xs">
                  EMPRESA
                </div>
                <span className="text-amber-500 font-bold">•</span>
                <div className="px-3 py-1 bg-amber-200/90 text-amber-950 font-black font-mono text-[11px] rounded-lg border border-amber-400/80 shadow-2xs">
                  CENTRO_C
                </div>
                <span className="text-amber-500 font-bold">•</span>
                <div className="px-3 py-1 bg-amber-200/90 text-amber-950 font-black font-mono text-[11px] rounded-lg border border-amber-400/80 shadow-2xs">
                  PUNTO_VENTA
                </div>
                <span className="text-amber-500 font-bold">•</span>
                <div className="px-3 py-1 bg-amber-200/90 text-amber-950 font-black font-mono text-[11px] rounded-lg border border-amber-400/80 shadow-2xs">
                  CIUDAD
                </div>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                Solo necesitas estas 4 columnas en tu Excel. El sistema creará y vinculará automáticamente la Empresa, el Centro de Costo y el Punto de Venta.
              </p>
            </div>

            <button
              type="button"
              id="btn-download-client-template"
              onClick={(e) => {
                e.preventDefault();
                downloadClientExcelTemplate();
              }}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
              title="Descargar archivo Excel oficial con las 4 columnas"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla (.xlsx)</span>
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
                : 'border-slate-300 hover:border-amber-500 bg-slate-50/60 hover:bg-amber-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs border border-amber-200">
              <Upload className="w-8 h-8 text-amber-700" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-black text-slate-800">
                Arrastra y suelta tu archivo Excel aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Soporta archivos <strong>.xlsx</strong>, <strong>.xls</strong> o <strong>.csv</strong> con las 4 columnas
              </p>
            </div>
            <div className="pt-2 flex items-center space-x-2 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-2xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Formato oficial: EMPRESA, CENTRO_C, PUNTO_VENTA, CIUDAD</span>
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
                  Se detectaron <strong>{parsedRows.length}</strong> clientes •{' '}
                  <strong>{parsedRows.filter((r) => r.isValid).length}</strong> válidos •{' '}
                  <strong>{parsedRows.filter((r) => r.selected).length}</strong> seleccionados para guardar
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
                  Se detectaron filas con datos de ejemplo de la plantilla (Alkosto, TCC, Distrimed). Puedes desmarcarlas si solo deseas importar tus clientes reales.
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

          {/* Tabla de Vista Previa con las 4 Columnas Oficiales */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-100/70 text-slate-800 font-extrabold sticky top-0 border-b border-amber-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={parsedRows.length > 0 && parsedRows.every((r) => !r.isValid || r.selected)}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">EMPRESA</th>
                    <th className="py-2.5 px-3">CENTRO_C / CENTRO_COSTO</th>
                    <th className="py-2.5 px-3">PUNTO_VENTA</th>
                    <th className="py-2.5 px-3">CIUDAD</th>
                    <th className="py-2.5 px-3 text-center">ESTADO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.tempId}
                      className={`hover:bg-amber-50/30 transition-colors ${
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
                      {/* Columna 1: EMPRESA */}
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{row.empresaNombre}</span>
                        </div>
                        {row.nit && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            NIT: {row.nit}
                          </div>
                        )}
                      </td>
                      {/* Columna 2: CENTRO_C / CENTRO_COSTO */}
                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-center space-x-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-200">
                          <Tag className="w-3 h-3 text-amber-700" />
                          <span>{row.centroCostoNombre || row.centroCostoCodigo}</span>
                        </div>
                      </td>
                      {/* Columna 3: PUNTO_VENTA */}
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-slate-900 flex items-center space-x-1">
                          <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{row.puntoVentaNombre}</span>
                        </div>
                        {row.direccion && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                            {row.direccion}
                          </div>
                        )}
                      </td>
                      {/* Columna 4: CIUDAD */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full font-extrabold text-[11px]">
                          <MapPin className="w-3 h-3 text-red-600" />
                          <span>{row.ciudad}</span>
                        </span>
                      </td>
                      {/* Estado */}
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
              Al procesar, los clientes se integrarán en el Directorio y quedarán disponibles para reportes de operaciones y asignación de turnos.
            </p>
            <button
              onClick={handleProcessBulkUpload}
              disabled={parsedRows.filter((r) => r.selected).length === 0}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs md:text-sm shadow-md shadow-red-600/20 flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
            >
              <span>Importar {parsedRows.filter((r) => r.selected).length} Clientes al Sistema</span>
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
              Registrando Clientes Corporativos...
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Procesando cliente <strong>{currentProgress}</strong> de <strong>{totalToProcess}</strong>. Guardando en base de datos Firestore y actualizando directorio.
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
      {/* PASO 4: RESULTADOS COMPLETOS */}
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
                  ¡Carga Masiva de Clientes Completada con Éxito!
                </h4>
                <p className="text-xs text-emerald-800 font-medium mt-0.5">
                  Se han registrado / actualizado <strong>{processedResults.length}</strong> clientes corporativos en la base de datos de SERGEM.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleCopyAllClients}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-900 font-bold rounded-xl text-xs shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                {allCopiedNotice ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-700" />}
                <span>{allCopiedNotice ? '¡Copiado al Portapapeles!' : 'Copiar Listado'}</span>
              </button>

              <button
                onClick={handleDownloadGeneratedClientsExcel}
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
                Directorio de Clientes Guardados en el Sistema
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {processedResults.length} empresas procesadas
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-extrabold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">EMPRESA</th>
                    <th className="py-2.5 px-3">CENTRO DE COSTO</th>
                    <th className="py-2.5 px-3">PUNTO DE VENTA</th>
                    <th className="py-2.5 px-3">CIUDAD</th>
                    <th className="py-2.5 px-3 text-center">ESTADO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedResults.map((res) => {
                    const cli = res.client;

                    return (
                      <tr key={cli.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* EMPRESA */}
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                            <Building2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>{res.empresa?.nombre || cli.empresaNombre || cli.nombre}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ID: {res.empresa?.id || cli.empresaId || cli.id}
                          </div>
                        </td>
                        {/* CENTRO DE COSTO */}
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-200">
                            <Tag className="w-3 h-3 text-amber-700" />
                            <span>{res.centroCosto?.nombre || cli.centroCostoNombre || 'Operación Principal'}</span>
                          </span>
                        </td>
                        {/* PUNTO DE VENTA */}
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 flex items-center space-x-1">
                            <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{res.puntoVenta?.nombre || cli.nombre}</span>
                          </div>
                        </td>
                        {/* CIUDAD */}
                        <td className="py-3 px-3 text-slate-700">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full font-extrabold text-[11px]">
                            <MapPin className="w-3 h-3 text-red-600" />
                            <span>{res.puntoVenta?.ciudad || cli.ciudad}</span>
                          </span>
                        </td>
                        {/* ESTADO */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              cli.activo
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Registrado
                          </span>
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
              Finalizar y Regresar al Directorio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface BulkClientUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingClients: CompanyClient[];
  onSaveClient?: (client: CompanyClient) => Promise<void> | void;
}

export const BulkClientUploadModal: React.FC<BulkClientUploadModalProps> = ({
  isOpen,
  onClose,
  existingClients,
  onSaveClient,
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
                Carga Masiva de Clientes por Excel
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Sube la plantilla de clientes de SERGEM S.A.S. para registrar cuentas corporativas y tarifas en lote
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
          <BulkClientUploadContent
            existingClients={existingClients}
            onSaveClient={onSaveClient}
            onCompleteOrClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
