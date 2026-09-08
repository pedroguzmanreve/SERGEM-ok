import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { CompanyClient } from '../types/payroll';
import { saveClientToFirestore } from '../services/firestoreService';
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
} from 'lucide-react';

export interface ParsedBulkClient {
  tempId: string;
  nombre: string;
  nit?: string;
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

      // Encontrar fila de encabezados
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const rowText = rawData[i].map((c) => String(c || '').toLowerCase().trim()).join(' ');
        if (
          rowText.includes('nombre') ||
          rowText.includes('razon social') ||
          rowText.includes('cliente') ||
          rowText.includes('nit')
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

      const findColIdx = (aliases: string[]): number => {
        return headers.findIndex((h) => {
          const norm = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return aliases.some((a) =>
            norm.includes(a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
          );
        });
      };

      const colNit = findColIdx(['nit', 'rut', 'identificacion', 'documento']);
      const colNombre = findColIdx(['nombre', 'razon social', 'cliente', 'empresa']);
      const colCiudad = findColIdx(['ciudad', 'sede', 'municipio']);
      const colDireccion = findColIdx(['direccion', 'domicilio', 'bodega', 'muelle']);
      const colContacto = findColIdx(['contacto', 'supervisor', 'coordinador', 'representante']);
      const colTelefono = findColIdx(['telefono', 'celular', 'movil', 'whatsapp']);
      const colEmail = findColIdx(['correo', 'email', 'mail']);
      const colTarifa = findColIdx(['tarifa', 'valor hora', 'precio hora', 'hora base']);
      const colObs = findColIdx(['observaciones', 'requisitos', 'notas', 'epp']);
      const colEstado = findColIdx(['estado', 'activo']);

      if (colNombre === -1 && colNit === -1) {
        throw new Error(
          'No se reconocieron las columnas básicas (Nombre o Razón Social, NIT). Por favor utiliza la plantilla oficial.'
        );
      }

      const parsed: ParsedBulkClient[] = [];

      dataRows.forEach((row, index) => {
        const rowText = row.join('').trim();
        if (!rowText) return;

        const rawNombre = colNombre !== -1 ? String(row[colNombre] ?? '').trim() : '';
        const rawNit = colNit !== -1 ? String(row[colNit] ?? '').trim() : '';
        const rawCiudad = colCiudad !== -1 ? String(row[colCiudad] ?? '').trim() : 'Cali';
        const rawDireccion = colDireccion !== -1 ? String(row[colDireccion] ?? '').trim() : '';
        const rawContacto = colContacto !== -1 ? String(row[colContacto] ?? '').trim() : '';
        const rawTelefono = colTelefono !== -1 ? String(row[colTelefono] ?? '').trim() : '';
        const rawEmail = colEmail !== -1 ? String(row[colEmail] ?? '').trim().toLowerCase() : '';
        const rawTarifaStr = colTarifa !== -1 ? String(row[colTarifa] ?? '').replace(/[^0-9.]/g, '') : '';
        const rawTarifa = rawTarifaStr ? Number(rawTarifaStr) : 12500;
        const rawObs = colObs !== -1 ? String(row[colObs] ?? '').trim() : '';
        const rawEstadoStr = colEstado !== -1 ? String(row[colEstado] ?? '').toLowerCase().trim() : 'activo';
        const activo = !rawEstadoStr.includes('inactiv') && !rawEstadoStr.includes('no');

        const validationErrors: string[] = [];
        if (!rawNombre) {
          validationErrors.push('Falta Nombre o Razón Social');
        }
        if (rawEmail && !/^\S+@\S+\.\S+$/.test(rawEmail)) {
          validationErrors.push('Formato de correo inválido');
        }

        const isExample =
          rawNit.includes('890.900.608') ||
          rawNit.includes('900.123.456') ||
          rawNit.includes('901.456.789') ||
          rawNombre.toUpperCase().includes('ALKOSTO') ||
          rawNombre.toUpperCase().includes('TCC LOGÍSTICA') ||
          rawNombre.toUpperCase().includes('DISTRIBUIDORA DE MEDICAMENTOS');

        parsed.push({
          tempId: `BULK-CLI-${index + 1}-${Date.now().toString(36)}`,
          nombre: rawNombre || `Cliente ${index + 1}`,
          nit: rawNit || undefined,
          ciudad: rawCiudad || 'Cali',
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

      // Buscar si ya existe por NIT o Nombre exacto
      const existing = existingClients.find((c) => {
        if (row.nit && c.nit && row.nit.replace(/\D/g, '') === c.nit.replace(/\D/g, '')) return true;
        return c.nombre.trim().toLowerCase() === row.nombre.trim().toLowerCase();
      });

      const cleanNitId = row.nit ? row.nit.replace(/\D/g, '').slice(-6) : null;
      const clientId = existing?.id || `CLI-${cleanNitId || (Date.now() + i).toString().slice(-6)}`;

      const newClient: CompanyClient = {
        id: clientId,
        nombre: row.nombre.trim(),
        nit: row.nit?.trim() || undefined,
        ciudad: row.ciudad.trim() || 'Cali',
        direccion: row.direccion?.trim() || undefined,
        contactoNombre: row.contactoNombre?.trim() || undefined,
        contactoTelefono: row.contactoTelefono?.trim() || undefined,
        contactoEmail: row.contactoEmail?.trim() || undefined,
        tarifaHoraBase: row.tarifaHoraBase,
        observaciones: row.observaciones?.trim() || undefined,
        activo: row.activo,
        fechaCreacion: existing?.fechaCreacion || new Date().toISOString().split('T')[0],
      };

      let success = true;
      let message = existing ? 'Cliente actualizado en sistema' : 'Cliente nuevo creado';

      try {
        if (onSaveClient) {
          await onSaveClient(newClient);
        } else {
          await saveClientToFirestore(newClient);
        }
      } catch (err: any) {
        console.warn(`Error guardando cliente ${newClient.nombre}:`, err);
        success = false;
        message = err.message || 'Error al persistir en base de datos';
      }

      results.push({
        client: newClient,
        isNew: !existing,
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
        'ID Cliente SERGEM',
        'NIT / RUT',
        'Nombre o Razón Social',
        'Ciudad',
        'Dirección Despacho / Sede',
        'Contacto Supervisor',
        'Teléfono Celular',
        'Correo Electrónico',
        'Tarifa Base Hora (COP)',
        'Observaciones Operativas',
        'Estado en Plataforma',
        'Resultado de Carga',
        'Fecha Registro'
      ],
      ...processedResults.map((r) => [
        r.client.id,
        r.client.nit || 'N/A',
        r.client.nombre,
        r.client.ciudad || 'Cali',
        r.client.direccion || 'N/A',
        r.client.contactoNombre || 'N/A',
        r.client.contactoTelefono || 'N/A',
        r.client.contactoEmail || 'N/A',
        r.client.tarifaHoraBase ?? 12500,
        r.client.observaciones || 'N/A',
        r.client.activo ? 'Activo' : 'Inactivo',
        r.isNew ? 'Nuevo Creado' : 'Actualizado Existente',
        new Date().toLocaleDateString('es-CO')
      ])
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);

    ws['!cols'] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 38 },
      { wch: 15 },
      { wch: 35 },
      { wch: 25 },
      { wch: 18 },
      { wch: 30 },
      { wch: 22 },
      { wch: 40 },
      { wch: 15 },
      { wch: 20 },
      { wch: 16 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Clientes_Importados_SERGEM');
    XLSX.writeFile(wb, `Reporte_Clientes_SERGEM_${Date.now()}.xlsx`);
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
                  ¿Aún no tienes la plantilla oficial de clientes lista?
                </h4>
                <p className="text-[11px] sm:text-xs text-emerald-800 font-medium">
                  Descarga la plantilla con ejemplos reales de cuentas corporativas, tarifas y sedes en el Valle del Cauca.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-download-client-template"
              onClick={(e) => {
                e.preventDefault();
                downloadClientExcelTemplate();
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
              title="Descargar archivo Excel oficial de clientes"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla Clientes Excel (.xlsx)</span>
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
              <span>Formato recomendado: Plantilla_Registro_Clientes_SERGEM.xlsx</span>
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
                    <th className="py-2.5 px-3">Cliente / Razón Social</th>
                    <th className="py-2.5 px-3">NIT / Identificación</th>
                    <th className="py-2.5 px-3">Ciudad & Sede</th>
                    <th className="py-2.5 px-3">Contacto / Correo</th>
                    <th className="py-2.5 px-3 text-right">Tarifa Base</th>
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
                        <div className="flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{row.nombre}</span>
                        </div>
                        {row.observaciones && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs font-normal">
                            {row.observaciones}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{row.nit || '—'}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">{row.ciudad}</div>
                        {row.direccion && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                            {row.direccion}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {row.contactoNombre && <div className="font-medium">{row.contactoNombre}</div>}
                        {row.contactoEmail && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                            {row.contactoEmail}
                          </div>
                        )}
                        {row.contactoTelefono && (
                          <div className="text-[10px] text-slate-400">{row.contactoTelefono}</div>
                        )}
                        {!row.contactoNombre && !row.contactoEmail && !row.contactoTelefono && '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        ${(row.tarifaHoraBase ?? 12500).toLocaleString('es-CO')}
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
                <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">ID & Empresa</th>
                    <th className="py-2.5 px-3">NIT</th>
                    <th className="py-2.5 px-3">Ciudad / Sede</th>
                    <th className="py-2.5 px-3">Contacto</th>
                    <th className="py-2.5 px-3 text-right">Tarifa Base</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedResults.map((res) => {
                    const cli = res.client;

                    return (
                      <tr key={cli.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <Building2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>{cli.nombre}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {cli.id}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">{cli.nit || '—'}</td>
                        <td className="py-3 px-3 text-slate-700">
                          <div className="font-medium text-slate-900">{cli.ciudad}</div>
                          {cli.direccion && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {cli.direccion}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <div className="font-medium">{cli.contactoNombre || '—'}</div>
                          {cli.contactoTelefono && (
                            <div className="text-[10px] text-slate-400">{cli.contactoTelefono}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ${(cli.tarifaHoraBase ?? 12500).toLocaleString('es-CO')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              cli.activo
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {cli.activo ? 'Activo' : 'Inactivo'}
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
