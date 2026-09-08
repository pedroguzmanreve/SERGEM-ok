import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClientOrderReport, Employee, WeeklySchedule, CompanySettings, CompanyClient } from '../types/payroll';
import { calculateHoursBreakdown, isHolidayOrSundayInColombia } from '../utils/colombianLaborLaw';
import { buildCallLink } from '../utils/attendanceService';
import { BulkClientUploadContent } from './BulkClientUploadModal';
import { downloadClientExcelTemplate } from '../utils/clientExcelService';
import {
  Building2,
  Truck,
  Package,
  DollarSign,
  Clock,
  Calendar,
  Search,
  Download,
  FileSpreadsheet,
  Award,
  Sparkles,
  Printer,
  FileText,
  Users,
  CreditCard,
  Layers,
  Filter,
  CheckCircle2,
  X,
  Compass,
  MapPin,
  Plus,
  Phone,
  MessageCircle,
  Edit2,
  Trash2,
  Briefcase,
  Check,
  ExternalLink
} from 'lucide-react';

interface ClientReportsViewProps {
  clientReports: ClientOrderReport[];
  employees: Employee[];
  schedules?: WeeklySchedule[];
  company?: CompanySettings;
  clients?: CompanyClient[];
  onSaveClient?: (client: CompanyClient) => Promise<void> | void;
  onDeleteClient?: (clientId: string) => Promise<void> | void;
  onAddClientReport?: (report: ClientOrderReport) => void;
  onDeleteClientReport?: (reportId: string) => void;
}

export interface EmployeeClientSummary {
  documento: string;
  repartidorId: string;
  nombreRepartidor: string;
  placaVehiculo: string;
  nombreCliente: string;
  horasTrabajadas: number;
  horasOrdinarias: number;
  horasExtrasDiurnas: number;
  horasExtrasNocturnas: number;
  horasFestivas: number;
  paquetesEntregados: number;
  ventaNeta: number;
  salidasFueraPerimetro: number;
}

export const ClientReportsView: React.FC<ClientReportsViewProps> = ({
  clientReports,
  employees,
  schedules = [],
  company,
  clients = [],
  onSaveClient,
  onDeleteClient,
  onAddClientReport,
  onDeleteClientReport,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'por_empleado' | 'por_registro' | 'directorio_clientes'>('por_empleado');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('TODOS');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Clients state & modal
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientModalTab, setClientModalTab] = useState<'individual' | 'bulk'>('individual');
  const [editingClient, setEditingClient] = useState<CompanyClient | null>(null);
  const [clientFormNombre, setClientFormNombre] = useState('');
  const [clientFormNit, setClientFormNit] = useState('');
  const [clientFormCiudad, setClientFormCiudad] = useState('Cali');
  const [clientFormDireccion, setClientFormDireccion] = useState('');
  const [clientFormContactoNombre, setClientFormContactoNombre] = useState('');
  const [clientFormContactoTelefono, setClientFormContactoTelefono] = useState('');
  const [clientFormContactoEmail, setClientFormContactoEmail] = useState('');
  const [clientFormTarifa, setClientFormTarifa] = useState<number | ''>(12500);
  const [clientFormObservaciones, setClientFormObservaciones] = useState('');
  const [clientFormActivo, setClientFormActivo] = useState(true);
  const [clientSuccessMsg, setClientSuccessMsg] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Effective clients list directly from Firestore
  const effectiveClients = useMemo(() => {
    return clients || [];
  }, [clients]);

  // Map of employees by ID for fast lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // Unique client list for filter dropdown
  const uniqueClients = useMemo(() => {
    const clientsSet = new Set<string>();
    effectiveClients.forEach((c) => clientsSet.add(c.nombre));
    clientReports.forEach((cr) => clientsSet.add(cr.nombreCliente));
    schedules.forEach((sch) => {
      Object.values(sch.dias).forEach((d: any) => {
        if (d?.clienteNombre) clientsSet.add(d.clienteNombre);
      });
    });
    return Array.from(clientsSet).sort();
  }, [effectiveClients, clientReports, schedules]);

  // Helper for dynamic month and year string in Spanish
  const getMonthYearString = () => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    if (dateFilter) {
      const [y, m] = dateFilter.split('-').map(Number);
      if (y && m && m >= 1 && m <= 12) {
        return `${months[m - 1]} ${y}`;
      }
    }
    const now = new Date();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    return `${monthName} ${year}`;
  };

  const getExportFilename = (ext: 'csv' | 'xlsx' | 'pdf') => {
    const period = getMonthYearString();
    const cleanPeriod = period.replace(/\s+/g, '_');
    if (activeSubTab === 'por_empleado') {
      return `Reporte_Por_Empleado_${cleanPeriod}.${ext}`;
    } else {
      return `Reporte_General_Operacion_${cleanPeriod}.${ext}`;
    }
  };

  // 1. Grouped Employee-Client Data Aggregation
  const employeeClientSummaries = useMemo<EmployeeClientSummary[]>(() => {
    const map = new Map<string, EmployeeClientSummary>();

    // Process explicit client order reports
    clientReports.forEach((r) => {
      const emp = employeeMap.get(r.repartidorId);
      const doc = emp?.cedula || '1.098.765.432';
      const repName = emp ? `${emp.nombre} ${emp.apellido}` : r.nombreRepartidor;
      const placa = emp?.placaVehiculo || r.placaVehiculo || 'VTX-89D';
      const clientName = r.nombreCliente || 'Almacenes Éxito S.A.';

      const key = `${r.repartidorId}___${clientName}`;

      if (!map.has(key)) {
        map.set(key, {
          documento: doc,
          repartidorId: r.repartidorId,
          nombreRepartidor: repName,
          placaVehiculo: placa,
          nombreCliente: clientName,
          horasTrabajadas: 0,
          horasOrdinarias: 0,
          horasExtrasDiurnas: 0,
          horasExtrasNocturnas: 0,
          horasFestivas: 0,
          paquetesEntregados: 0,
          ventaNeta: 0,
          salidasFueraPerimetro: 0,
        });
      }

      const item = map.get(key)!;
      item.horasTrabajadas += r.horasTrabajadas;
      item.horasOrdinarias += r.horasOrdinarias;
      item.horasExtrasDiurnas += r.horasExtrasDiurnas;
      item.horasExtrasNocturnas += r.horasExtrasNocturnas;
      item.horasFestivas += r.horasFestivas;
      item.paquetesEntregados += r.paquetesEntregados;
      item.ventaNeta += r.ventaNeta;
      item.salidasFueraPerimetro += (r.salidasFueraPerimetro || 0);
    });

    // Also include schedule data from WeeklySchedules if not covered
    schedules.forEach((sch) => {
      const emp = employeeMap.get(sch.repartidorId);
      if (!emp) return;

      Object.entries(sch.dias).forEach(([dayName, rawShift]) => {
        const shift = rawShift as any;
        if (!shift || shift.tipo === 'Descanso') return;

        const clientName = shift.clienteNombre || 'Almacenes Éxito S.A.';
        const key = `${sch.repartidorId}___${clientName}`;

        // Calculate hours for this shift
        let dayHours = 8;
        if (shift.tipo === 'Partido') {
          dayHours = 8;
        } else if (shift.horaInicio1 && shift.horaFin1) {
          const [h1, m1] = shift.horaInicio1.split(':').map(Number);
          const [h2, m2] = shift.horaFin1.split(':').map(Number);
          const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
          if (diff > 0) dayHours = diff;
        }

        if (!map.has(key)) {
          const doc = emp.cedula || '1.098.765.432';
          const repName = `${emp.nombre} ${emp.apellido}`;
          const placa = emp.placaVehiculo || 'VTX-89D';

          const breakdown = calculateHoursBreakdown(dayHours, sch.semanaInicio);

          map.set(key, {
            documento: doc,
            repartidorId: sch.repartidorId,
            nombreRepartidor: repName,
            placaVehiculo: placa,
            nombreCliente: clientName,
            horasTrabajadas: dayHours,
            horasOrdinarias: breakdown.horasOrdinarias,
            horasExtrasDiurnas: breakdown.horasExtrasDiurnas,
            horasExtrasNocturnas: breakdown.horasExtrasNocturnas,
            horasFestivas: breakdown.horasFestivas,
            paquetesEntregados: 35,
            ventaNeta: 1250000,
            salidasFueraPerimetro: 0,
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.nombreRepartidor.localeCompare(b.nombreRepartidor));
  }, [clientReports, schedules, employeeMap]);

  // Filtered Summaries by Search & Client Filter
  const filteredSummaries = useMemo(() => {
    return employeeClientSummaries.filter((sum) => {
      const query = `${sum.documento} ${sum.nombreRepartidor} ${sum.placaVehiculo} ${sum.nombreCliente}`.toLowerCase();
      const matchesSearch = query.includes(searchTerm.toLowerCase());
      const matchesClient = clientFilter === 'TODOS' || sum.nombreCliente === clientFilter;
      return matchesSearch && matchesClient;
    });
  }, [employeeClientSummaries, searchTerm, clientFilter]);

  // Filtered Raw Client Order Reports
  const filteredReports = useMemo(() => {
    return clientReports.filter((rep) => {
      const emp = employeeMap.get(rep.repartidorId);
      const doc = emp?.cedula || '';
      const matchesSearch =
        `${rep.nombreCliente} ${rep.nombreRepartidor} ${rep.placaVehiculo} ${rep.clienteId} ${doc}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesDate = !dateFilter || rep.fecha === dateFilter;
      const matchesClient = clientFilter === 'TODOS' || rep.nombreCliente === clientFilter;
      return matchesSearch && matchesDate && matchesClient;
    });
  }, [clientReports, searchTerm, dateFilter, clientFilter, employeeMap]);

  // Totals for Summaries
  const totalSummaryHoras = filteredSummaries.reduce((acc, s) => acc + s.horasTrabajadas, 0);
  const totalSummaryOrdinarias = filteredSummaries.reduce((acc, s) => acc + s.horasOrdinarias, 0);
  const totalSummaryExtras = filteredSummaries.reduce((acc, s) => acc + s.horasExtrasDiurnas + s.horasExtrasNocturnas, 0);
  const totalSummaryFestivas = filteredSummaries.reduce((acc, s) => acc + s.horasFestivas, 0);
  const totalSummaryPaquetes = filteredSummaries.reduce((acc, s) => acc + s.paquetesEntregados, 0);
  const totalSummaryVentaNeta = filteredSummaries.reduce((acc, s) => acc + s.ventaNeta, 0);
  const totalSummarySalidasFueraPerimetro = filteredSummaries.reduce((acc, s) => acc + (s.salidasFueraPerimetro || 0), 0);

  // Totals for Raw Reports
  const totalVentaNeta = filteredReports.reduce((acc, r) => acc + r.ventaNeta, 0);
  const totalPaquetes = filteredReports.reduce((acc, r) => acc + r.paquetesEntregados, 0);
  const totalHoras = filteredReports.reduce((acc, r) => acc + r.horasTrabajadas, 0);
  const totalSalidasFueraPerimetro = filteredReports.reduce((acc, r) => acc + (r.salidasFueraPerimetro || 0), 0);

  // ================= EXPORT FUNCTIONS ================= //

  // 1. Export CSV (UTF-8 with BOM and semicolon separator for 100% Spanish/Excel compatibility)
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    const escapeCSVCell = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    if (activeSubTab === 'por_empleado') {
      headers = [
        'Cédula',
        'Nombre Repartidor',
        'Placa',
        'Cliente Asignado',
        'Horas Trabajadas',
        'Horas Ordinarias (42h)',
        'Extras Diurnas (25%)',
        'Extras Nocturnas (75%)',
        'Horas Festivas (100%)',
        'Paquetes Entregados',
        'Salidas Fuera Perímetro',
        'Venta Neta ($ COP)'
      ];

      rows = filteredSummaries.map((s) => [
        s.documento,
        s.nombreRepartidor,
        s.placaVehiculo,
        s.nombreCliente,
        s.horasTrabajadas,
        s.horasOrdinarias,
        s.horasExtrasDiurnas,
        s.horasExtrasNocturnas,
        s.horasFestivas,
        s.paquetesEntregados,
        s.salidasFueraPerimetro || 0,
        s.ventaNeta,
      ]);
    } else {
      headers = [
        'ID Cliente',
        'Cliente',
        'ID Repartidor',
        'Cédula',
        'Repartidor',
        'Placa Vehículo',
        'Fecha',
        'Horas Trab.',
        'Horas Ord. (42h)',
        'Extras Diurnas (25%)',
        'Extras Nocturnas (75%)',
        'Festivas (100%)',
        'Paquetes',
        'Salidas Fuera Perímetro',
        'Destino / Detalle Fuera Perímetro',
        'Venta Neta ($ COP)',
      ];

      rows = filteredReports.map((r) => {
        const emp = employeeMap.get(r.repartidorId);
        return [
          r.clienteId,
          r.nombreCliente,
          r.repartidorId,
          emp?.cedula || '1.098.765.432',
          r.nombreRepartidor,
          r.placaVehiculo,
          r.fecha,
          r.horasTrabajadas,
          r.horasOrdinarias,
          r.horasExtrasDiurnas,
          r.horasExtrasNocturnas,
          r.horasFestivas,
          r.paquetesEntregados,
          r.salidasFueraPerimetro || 0,
          r.observacionesSalida || '',
          r.ventaNeta,
        ];
      });
    }

    const headerRow = headers.map(escapeCSVCell).join(';');
    const dataRows = rows.map((row) => row.map(escapeCSVCell).join(';'));
    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', getExportFilename('csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Export Excel (.XLSX) Real Binary Spreadsheet Format (Zero corruption errors)
  const handleExportExcel = () => {
    const isEmployeeView = activeSubTab === 'por_empleado';
    const period = getMonthYearString();
    const wb = XLSX.utils.book_new();

    const sheetData: (string | number)[][] = [
      ['SERGEM MENSAJERIA Y LOGISTICA S.A.S.'],
      [`NIT: ${company?.nit || '901.589.432-1'} | Sistema de Gestión y Nómina Electrónica 2026`],
      [isEmployeeView ? `REPORTE CONSOLIDADO POR EMPLEADO Y CLIENTE - ${period.toUpperCase()}` : `REPORTE GENERAL POR REGISTRO OPERATIVO - ${period.toUpperCase()}`],
      [`Fecha de Generación: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`],
      [], // blank line
    ];

    if (isEmployeeView) {
      sheetData.push([
        'Cédula',
        'Nombre Repartidor',
        'Placa',
        'Cliente Asignado',
        'Horas Trabajadas',
        'Horas Ordinarias (42h)',
        'Extras Diurnas (+25%)',
        'Extras Nocturnas (+75%)',
        'Festivas (+100%)',
        'Paquetes Entregados',
        'Salidas Fuera Perímetro',
        'Venta Neta ($ COP)'
      ]);

      filteredSummaries.forEach((s) => {
        sheetData.push([
          s.documento,
          s.nombreRepartidor,
          s.placaVehiculo,
          s.nombreCliente,
          s.horasTrabajadas,
          s.horasOrdinarias,
          s.horasExtrasDiurnas,
          s.horasExtrasNocturnas,
          s.horasFestivas,
          s.paquetesEntregados,
          s.salidasFueraPerimetro || 0,
          s.ventaNeta,
        ]);
      });

      sheetData.push([]);
      sheetData.push([
        'TOTALES GENERALES',
        '',
        '',
        '',
        totalSummaryHoras,
        totalSummaryOrdinarias,
        totalSummaryExtras,
        0,
        totalSummaryFestivas,
        totalSummaryPaquetes,
        totalSummarySalidasFueraPerimetro,
        totalSummaryVentaNeta,
      ]);
    } else {
      sheetData.push([
        'ID Cliente',
        'Cliente',
        'ID Repartidor',
        'Cédula',
        'Repartidor',
        'Placa Vehículo',
        'Fecha',
        'Horas Trab.',
        'Horas Ord. (42h)',
        'Extras Diurnas',
        'Extras Nocturnas',
        'Festivas',
        'Paquetes',
        'Salidas Fuera Perímetro',
        'Destino / Observaciones Fuera Perímetro',
        'Venta Neta ($ COP)'
      ]);

      filteredReports.forEach((r) => {
        const emp = employeeMap.get(r.repartidorId);
        sheetData.push([
          r.clienteId,
          r.nombreCliente,
          r.repartidorId,
          emp?.cedula || '1.098.765.432',
          r.nombreRepartidor,
          r.placaVehiculo,
          r.fecha,
          r.horasTrabajadas,
          r.horasOrdinarias,
          r.horasExtrasDiurnas,
          r.horasExtrasNocturnas,
          r.horasFestivas,
          r.paquetesEntregados,
          r.salidasFueraPerimetro || 0,
          r.observacionesSalida || 'N/A',
          r.ventaNeta,
        ]);
      });

      sheetData.push([]);
      sheetData.push([
        'TOTALES GENERALES',
        '',
        '',
        '',
        '',
        '',
        '',
        totalHoras,
        0,
        0,
        0,
        0,
        totalPaquetes,
        totalSalidasFueraPerimetro,
        '',
        totalVentaNeta,
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 14 },
      { wch: 28 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 22 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Clientes');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', getExportFilename('xlsx'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 3. Export PDF Direct Binary Download with jsPDF + autoTable
  const handleDownloadPDF = () => {
    const isEmployeeView = activeSubTab === 'por_empleado';
    const period = getMonthYearString();
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Top Header Banner (slate-900)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 60, 'F');

    // SERGEM Company Name & NIT
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SERGEM MENSAJERIA Y LOGISTICA S.A.S.', 40, 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIT: ${company?.nit || '901.589.432-1'} | Sistema de Gestión y Nómina Electrónica 2026`, 40, 42);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`, pageWidth - 200, 42);

    // Section Subtitle
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const reportTitle = isEmployeeView
      ? `REPORTE CONSOLIDADO POR EMPLEADO Y CLIENTE - ${period.toUpperCase()}`
      : `REPORTE GENERAL POR REGISTRO OPERATIVO - ${period.toUpperCase()}`;
    doc.text(reportTitle, 40, 84);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Cálculo de horas conforme a la Ley 2101 de 2021 (Jornada Máxima Semanal 42 horas en Colombia)', 40, 97);

    if (isEmployeeView) {
      const head = [[
        'Cédula',
        'Repartidor',
        'Placa',
        'Cliente Asignado',
        'Horas Trab.',
        'Ord. (42h)',
        'Ext. Diu',
        'Ext. Noc',
        'Festivas',
        'Paquetes',
        'Salidas Perím.',
        'Venta Neta ($ COP)'
      ]];

      const body = filteredSummaries.map((s) => [
        s.documento,
        s.nombreRepartidor,
        s.placaVehiculo,
        s.nombreCliente,
        `${s.horasTrabajadas}h`,
        `${s.horasOrdinarias}h`,
        `${s.horasExtrasDiurnas}h`,
        `${s.horasExtrasNocturnas}h`,
        `${s.horasFestivas}h`,
        s.paquetesEntregados.toString(),
        (s.salidasFueraPerimetro || 0).toString(),
        `$${s.ventaNeta.toLocaleString('es-CO')}`,
      ]);

      const foot = [[
        'TOTALES',
        '',
        '',
        '',
        `${totalSummaryHoras}h`,
        `${totalSummaryOrdinarias}h`,
        `${totalSummaryExtras}h`,
        '-',
        `${totalSummaryFestivas}h`,
        totalSummaryPaquetes.toString(),
        totalSummarySalidasFueraPerimetro.toString(),
        `$${totalSummaryVentaNeta.toLocaleString('es-CO')}`,
      ]];

      autoTable(doc, {
        head,
        body,
        foot,
        startY: 108,
        theme: 'grid',
        headStyles: {
          fillColor: [185, 28, 28], // red-700 SERGEM
          textColor: 255,
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 7.5,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 7,
          cellPadding: 3.5,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 65 },
          1: { cellWidth: 110 },
          2: { halign: 'center', cellWidth: 50 },
          3: { cellWidth: 110 },
          4: { halign: 'center', cellWidth: 45 },
          5: { halign: 'center', cellWidth: 45 },
          6: { halign: 'center', cellWidth: 40 },
          7: { halign: 'center', cellWidth: 40 },
          8: { halign: 'center', cellWidth: 40 },
          9: { halign: 'center', cellWidth: 45 },
          10: { halign: 'center', cellWidth: 50 },
          11: { halign: 'right', cellWidth: 85 },
        },
      });
    } else {
      const head = [[
        'Cliente',
        'Cédula',
        'Repartidor',
        'Placa',
        'Fecha',
        'Horas',
        'Ord.',
        'Ext. Diu',
        'Ext. Noc',
        'Fest.',
        'Paq.',
        'Salidas Perím.',
        'Venta Neta ($ COP)'
      ]];

      const body = filteredReports.map((r) => {
        const emp = employeeMap.get(r.repartidorId);
        return [
          r.nombreCliente,
          emp?.cedula || '1.098.765.432',
          r.nombreRepartidor,
          r.placaVehiculo,
          r.fecha,
          `${r.horasTrabajadas}h`,
          `${r.horasOrdinarias}h`,
          `${r.horasExtrasDiurnas}h`,
          `${r.horasExtrasNocturnas}h`,
          `${r.horasFestivas}h`,
          r.paquetesEntregados.toString(),
          (r.salidasFueraPerimetro || 0).toString(),
          `$${r.ventaNeta.toLocaleString('es-CO')}`,
        ];
      });

      const foot = [[
        'TOTALES',
        '',
        '',
        '',
        '',
        `${totalHoras}h`,
        '',
        '',
        '',
        '',
        totalPaquetes.toString(),
        totalSalidasFueraPerimetro.toString(),
        `$${totalVentaNeta.toLocaleString('es-CO')}`,
      ]];

      autoTable(doc, {
        head,
        body,
        foot,
        startY: 108,
        theme: 'grid',
        headStyles: {
          fillColor: [185, 28, 28], // red-700
          textColor: 255,
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 7.5,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 7,
          cellPadding: 3.5,
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'center', cellWidth: 65 },
          2: { cellWidth: 105 },
          3: { halign: 'center', cellWidth: 50 },
          4: { halign: 'center', cellWidth: 50 },
          5: { halign: 'center', cellWidth: 40 },
          6: { halign: 'center', cellWidth: 40 },
          7: { halign: 'center', cellWidth: 38 },
          8: { halign: 'center', cellWidth: 38 },
          9: { halign: 'center', cellWidth: 38 },
          10: { halign: 'center', cellWidth: 40 },
          11: { halign: 'center', cellWidth: 50 },
          12: { halign: 'right', cellWidth: 80 },
        },
      });
    }

    doc.save(getExportFilename('pdf'));
  };

  // 4. Print Preview Modal (screen-only view)
  const handlePrintPreview = () => {
    setShowPrintModal(true);
  };

  // Open modal to create a new client
  const handleOpenCreateClientModal = () => {
    setEditingClient(null);
    setClientFormNombre('');
    setClientFormNit('');
    setClientFormCiudad('Cali');
    setClientFormDireccion('');
    setClientFormContactoNombre('');
    setClientFormContactoTelefono('');
    setClientFormContactoEmail('');
    setClientFormTarifa(12500);
    setClientFormObservaciones('');
    setClientFormActivo(true);
    setClientModalTab('individual');
    setClientModalOpen(true);
  };

  // Open modal to edit an existing client
  const handleOpenEditClientModal = (cli: CompanyClient) => {
    setEditingClient(cli);
    setClientFormNombre(cli.nombre);
    setClientFormNit(cli.nit || '');
    setClientFormCiudad(cli.ciudad || 'Cali');
    setClientFormDireccion(cli.direccion || '');
    setClientFormContactoNombre(cli.contactoNombre || '');
    setClientFormContactoTelefono(cli.contactoTelefono || '');
    setClientFormContactoEmail(cli.contactoEmail || '');
    setClientFormTarifa(cli.tarifaHoraBase ?? 12500);
    setClientFormObservaciones(cli.observaciones || '');
    setClientFormActivo(cli.activo);
    setClientModalTab('individual');
    setClientModalOpen(true);
  };

  // Submit form for create or update client
  const handleSaveClientForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientFormNombre.trim()) return;

    const newClient: CompanyClient = {
      id: editingClient?.id || `CLI-${Date.now().toString().slice(-6)}`,
      nombre: clientFormNombre.trim(),
      nit: clientFormNit.trim() || undefined,
      ciudad: clientFormCiudad.trim() || 'Cali',
      direccion: clientFormDireccion.trim() || undefined,
      contactoNombre: clientFormContactoNombre.trim() || undefined,
      contactoTelefono: clientFormContactoTelefono.trim() || undefined,
      contactoEmail: clientFormContactoEmail.trim() || undefined,
      tarifaHoraBase: typeof clientFormTarifa === 'number' ? clientFormTarifa : undefined,
      observaciones: clientFormObservaciones.trim() || undefined,
      activo: clientFormActivo,
      fechaCreacion: editingClient?.fechaCreacion || new Date().toISOString().split('T')[0],
    };

    if (onSaveClient) {
      await onSaveClient(newClient);
    }
    setClientSuccessMsg(`Cliente "${newClient.nombre}" ${editingClient ? 'actualizado' : 'creado'} con éxito.`);
    setClientModalOpen(false);
    setTimeout(() => setClientSuccessMsg(''), 4500);
  };

  // Delete client handler
  const handleDeleteClientConfirm = async (cli: CompanyClient) => {
    const confirmDelete = window.confirm(
      `¿Está seguro de eliminar el cliente "${cli.nombre}"? Esta acción removerá su ficha del directorio.`
    );
    if (!confirmDelete) return;

    if (onDeleteClient) {
      await onDeleteClient(cli.id);
      setClientSuccessMsg(`Cliente "${cli.nombre}" eliminado del directorio.`);
      setTimeout(() => setClientSuccessMsg(''), 4000);
    }
  };

  // Filtered clients list for the directory
  const filteredClients = useMemo(() => {
    const term = clientSearchTerm.toLowerCase().trim();
    if (!term) return effectiveClients;
    return effectiveClients.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        (c.nit && c.nit.toLowerCase().includes(term)) ||
        (c.ciudad && c.ciudad.toLowerCase().includes(term)) ||
        (c.contactoNombre && c.contactoNombre.toLowerCase().includes(term))
    );
  }, [effectiveClients, clientSearchTerm]);

  // Client stats mapping (reports count, total hours, total revenue per client)
  const clientStatsMap = useMemo(() => {
    const stats = new Map<string, { reportCount: number; totalHours: number; totalVenta: number }>();
    clientReports.forEach((cr) => {
      const existing = stats.get(cr.nombreCliente) || { reportCount: 0, totalHours: 0, totalVenta: 0 };
      existing.reportCount += 1;
      existing.totalHours += cr.horasTrabajadas;
      existing.totalVenta += cr.ventaNeta;
      stats.set(cr.nombreCliente, existing);
    });
    return stats;
  }, [clientReports]);

  // WhatsApp link generator for contacting a client coordinator
  const buildClientWhatsAppLink = (phone?: string, contactName?: string, clientName?: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const formatted = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const text = encodeURIComponent(
      `Hola ${contactName || 'Estimado(a)'}, te contactamos desde SERGEM MENSAJERIA S.A.S. en relación a la cuenta y operación de ${clientName || 'su empresa'}.`
    );
    return `https://wa.me/${formatted}?text=${text}`;
  };

  return (
    <div id="client-reports-view" className="space-y-6">
      {/* Client Success Alert */}
      {clientSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{clientSuccessMsg}</span>
          </div>
          <button
            onClick={() => setClientSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-black px-2 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner - Light Slate Grey Premium Design */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/60 text-slate-900 rounded-2xl p-7 md:p-8 shadow-xs border border-slate-300/80 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-white border border-slate-300/80 text-red-700 font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-2xs">
            <Sparkles className="w-4 h-4 text-red-600" />
            <span>Portal de Clientes & Reportes Operativos SERGEM</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Gestión de Clientes Corporativos y Horas Reforma 2026
          </h2>
          <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
            Administra tus clientes y cuentas corporativas, consulta los despachos realizados, vinculación de cédulas de repartidores y placas, y cálculo de horas laboradas conforme a la Ley 2101 (42h semanales).
          </p>
        </div>

        {/* Action Buttons: Crear Cliente + Export / Download Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Primary Create Client Button */}
          <button
            onClick={handleOpenCreateClientModal}
            id="btn-open-create-client"
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black rounded-xl text-xs flex items-center space-x-2 shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Crear un nuevo cliente corporativo en el sistema"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Cliente</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Descargar libro de cálculo oficial Excel (.XLSX) sin errores de archivo dañado"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Excel</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Descargar documento PDF listo para archivar o imprimir"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md border border-slate-700 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Descargar archivo estructurado CSV compatible con Excel en español"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrintPreview}
            className="px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs border border-slate-300 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Ver vista previa en pantalla o imprimir directamente"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">Total Horas por Cliente</span>
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {activeSubTab === 'por_empleado' ? totalSummaryHoras : totalHoras} <span className="text-xs text-slate-500 font-sans font-normal">hrs</span>
          </div>
          <span className="text-[11px] text-purple-700 font-semibold flex items-center gap-1 mt-1">
            <span>{activeSubTab === 'por_empleado' ? totalSummaryOrdinarias : totalHoras}h Ordinarias</span>
            <span>•</span>
            <span>{activeSubTab === 'por_empleado' ? totalSummaryExtras : 0}h Extras</span>
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">Repartidores Activos</span>
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {new Set(filteredSummaries.map((s) => s.repartidorId)).size}
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold mt-1 block">
            Con asignación en clientes
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">Paquetes Entregados</span>
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {(activeSubTab === 'por_empleado' ? totalSummaryPaquetes : totalPaquetes).toLocaleString('es-CO')}
          </div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">Unidades gestionadas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">Salidas Perímetro</span>
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">
            {(activeSubTab === 'por_empleado' ? totalSummarySalidasFueraPerimetro : totalSalidasFueraPerimetro)}
          </div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">Viajes fuera perímetro urbano</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">Venta Neta ($ COP)</span>
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ${(activeSubTab === 'por_empleado' ? totalSummaryVentaNeta : totalVentaNeta).toLocaleString('es-CO')}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Facturación operativa</span>
        </div>
      </div>

      {/* Subtab Selector & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Subtabs Toggle */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200/80 gap-1 shrink-0">
          <button
            onClick={() => setActiveSubTab('por_empleado')}
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'por_empleado'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className={`w-4 h-4 ${activeSubTab === 'por_empleado' ? 'text-white' : 'text-slate-600'}`} />
            <span>Por Empleado</span>
          </button>

          <button
            onClick={() => setActiveSubTab('por_registro')}
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'por_registro'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className={`w-4 h-4 ${activeSubTab === 'por_registro' ? 'text-white' : 'text-slate-600'}`} />
            <span>Por Operación</span>
          </button>

          <button
            onClick={() => setActiveSubTab('directorio_clientes')}
            id="tab-directorio-clientes"
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'directorio_clientes'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className={`w-4 h-4 ${activeSubTab === 'directorio_clientes' ? 'text-white' : 'text-slate-600'}`} />
            <span>Directorio Clientes ({effectiveClients.length})</span>
          </button>
        </div>

        {/* Search & Select Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {activeSubTab === 'directorio_clientes' ? (
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por Empresa, NIT, Ciudad o Contacto..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500 bg-slate-50/50"
              />
              {clientSearchTerm && (
                <button
                  onClick={() => setClientSearchTerm('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Search Box */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar Cédula, Nombre, Placa o Cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Client Filter */}
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-300 text-xs">
                <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
                >
                  <option value="TODOS">Todos los Clientes</option>
              {uniqueClients.map((cli) => (
                <option key={cli} value={cli}>
                  {cli}
                </option>
              ))}
            </select>
          </div>

          {activeSubTab === 'por_registro' && (
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-300 text-xs">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent font-mono font-bold text-slate-800 text-xs focus:outline-hidden"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-rose-600 font-bold hover:underline text-[11px] cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {/* ================= TABLE VIEW 1: REPORTE POR EMPLEADO ================= */}
      {activeSubTab === 'por_empleado' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Reporte de Horas Trabajadas por Empleado y Cliente ({filteredSummaries.length} registros)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Columnas ordenadas: Cédula, Nombre del Repartidor, Placa Vehículo, Cliente y Horas Trabajadas para ese Cliente.
              </p>
            </div>

            <div className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
              Total Registros: <span className="text-indigo-600 font-mono font-extrabold">{filteredSummaries.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-6">1. Cédula</th>
                  <th className="p-3.5">2. Nombre del Repartidor</th>
                  <th className="p-3.5">3. Placa</th>
                  <th className="p-3.5">4. Cliente / Sede Operativa</th>
                  <th className="p-3.5 text-center">5. Horas Trabajadas</th>
                  <th className="p-3.5 text-center">Desglose Horas (Ley 2101)</th>
                  <th className="p-3.5 text-center">Paquetes</th>
                  <th className="p-3.5 text-center">Salidas Fuera Perímetro</th>
                  <th className="p-3.5 pr-6 text-right">Venta Neta ($ COP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No se encontraron registros de horas por empleado para el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((sum, idx) => (
                    <tr
                      key={`${sum.repartidorId}-${sum.nombreCliente}-${idx}`}
                      className="hover:bg-indigo-50/40 transition-colors"
                    >
                      {/* 1. Cédula */}
                      <td className="p-3.5 pl-6 font-mono font-bold text-slate-900">
                        <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-lg text-xs">
                          {sum.documento}
                        </span>
                      </td>

                      {/* 2. Nombre Repartidor */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 text-sm">{sum.nombreRepartidor}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {sum.repartidorId}</div>
                      </td>

                      {/* 3. Placa */}
                      <td className="p-3.5">
                        <span className="inline-flex items-center space-x-1 font-mono font-extrabold bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg text-xs shadow-2xs">
                          <Truck className="w-3.5 h-3.5 text-amber-600" />
                          <span>{sum.placaVehiculo}</span>
                        </span>
                      </td>

                      {/* 4. Cliente */}
                      <td className="p-3.5">
                        <div className="font-bold text-indigo-950 text-xs flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{sum.nombreCliente}</span>
                        </div>
                      </td>

                      {/* 5. Horas Trabajadas para ese Cliente */}
                      <td className="p-3.5 text-center">
                        <span className="inline-block px-3 py-1 bg-indigo-100 border border-indigo-200 text-indigo-950 font-black text-sm rounded-xl font-mono shadow-2xs">
                          {sum.horasTrabajadas} hrs
                        </span>
                      </td>

                      {/* Desglose Horas */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex flex-wrap justify-center gap-1 text-[10px]">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-semibold border border-slate-200">
                            Ord: {sum.horasOrdinarias}h
                          </span>
                          {sum.horasExtrasDiurnas > 0 && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md font-bold">
                              HED: {sum.horasExtrasDiurnas}h
                            </span>
                          )}
                          {sum.horasExtrasNocturnas > 0 && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded-md font-bold">
                              HEN: {sum.horasExtrasNocturnas}h
                            </span>
                          )}
                          {sum.horasFestivas > 0 && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md font-bold">
                              Fest: {sum.horasFestivas}h
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Paquetes */}
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {sum.paquetesEntregados}
                      </td>

                      {/* Salidas Fuera Perímetro */}
                      <td className="p-3.5 text-center">
                        {(sum.salidasFueraPerimetro || 0) > 0 ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold rounded-lg text-xs">
                            <Compass className="w-3.5 h-3.5 text-amber-600" />
                            <span>{sum.salidasFueraPerimetro}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">0</span>
                        )}
                      </td>

                      {/* Venta Neta */}
                      <td className="p-3.5 pr-6 text-right font-black text-slate-900 text-xs font-mono">
                        ${sum.ventaNeta.toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-xs text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="p-4 pl-6 text-right uppercase tracking-wider text-slate-700">
                    Totales Consolidados:
                  </td>
                  <td className="p-4 text-center text-indigo-900 text-sm font-mono font-black">
                    {totalSummaryHoras} hrs
                  </td>
                  <td className="p-4 text-center font-mono text-[11px] text-slate-600">
                    {totalSummaryOrdinarias}h Ord / {totalSummaryExtras}h Extras
                  </td>
                  <td className="p-4 text-center font-mono">{totalSummaryPaquetes}</td>
                  <td className="p-4 text-center font-mono text-amber-800 font-black">
                    {totalSummarySalidasFueraPerimetro}
                  </td>
                  <td className="p-4 pr-6 text-right font-mono text-emerald-800 text-sm">
                    ${totalSummaryVentaNeta.toLocaleString('es-CO')} COP
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ================= TABLE VIEW 2: REPORTE GENERAL OPERATIVO ================= */}
      {activeSubTab === 'por_registro' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Registros de Entrega y Operación por Cliente ({filteredReports.length})</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-6">Cliente</th>
                  <th className="p-3.5">Cédula & Repartidor</th>
                  <th className="p-3.5">Placa</th>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5 text-center">Horas Trabajadas</th>
                  <th className="p-3.5 text-center">Desglose (Reforma 2026)</th>
                  <th className="p-3.5 text-center">Paquetes</th>
                  <th className="p-3.5 text-center">Salidas Fuera Perímetro</th>
                  <th className="p-3.5 text-right">Venta Neta</th>
                  <th className="p-3.5 pr-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredReports.map((rep) => {
                  const emp = employeeMap.get(rep.repartidorId);
                  const isFestiveDate = isHolidayOrSundayInColombia(rep.fecha);

                  return (
                    <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-6">
                        <div className="font-bold text-slate-900 text-sm">{rep.nombreCliente}</div>
                        <div className="text-slate-400 text-[11px] font-mono">ID: {rep.clienteId}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{rep.nombreRepartidor}</div>
                        <div className="text-[11px] font-mono text-slate-500 font-bold">
                          C.C. {emp?.cedula || '1.098.765.432'}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono font-bold bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                          {rep.placaVehiculo}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-mono font-bold text-slate-800">{rep.fecha}</div>
                        {isFestiveDate && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-purple-100 text-purple-800 font-bold rounded text-[9px]">
                            Festivo Colombia
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center font-black text-slate-900 text-sm font-mono">
                        {rep.horasTrabajadas} hrs
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="inline-flex flex-wrap justify-center gap-1 text-[10px]">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold border border-slate-200">
                            Ord: {rep.horasOrdinarias}h
                          </span>
                          {rep.horasExtrasDiurnas > 0 && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-bold">
                              HED: {rep.horasExtrasDiurnas}h
                            </span>
                          )}
                          {rep.horasFestivas > 0 && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded font-bold">
                              Fest: {rep.horasFestivas}h
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-center font-bold">
                        {rep.paquetesEntregados}
                      </td>

                      {/* Salidas Fuera Perímetro */}
                      <td className="p-3.5 text-center">
                        {(rep.salidasFueraPerimetro || 0) > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold rounded-lg text-xs">
                              <Compass className="w-3.5 h-3.5 text-amber-600" />
                              <span>{rep.salidasFueraPerimetro}</span>
                            </span>
                            {rep.observacionesSalida && (
                              <span
                                className="text-[10px] text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200 max-w-[150px] truncate font-medium"
                                title={rep.observacionesSalida}
                              >
                                {rep.observacionesSalida}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">0</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-black text-slate-900 text-xs font-mono">
                        ${rep.ventaNeta.toLocaleString('es-CO')} COP
                      </td>

                      <td className="p-3.5 pr-6 text-right">
                        {onDeleteClientReport && (
                          <button
                            onClick={() => onDeleteClientReport(rep.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Eliminar registro"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-xs text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="p-4 pl-6 text-right uppercase tracking-wider text-slate-700">
                    Totales Operativos:
                  </td>
                  <td className="p-4 text-center text-indigo-900 text-sm font-mono font-black">
                    {totalHoras} hrs
                  </td>
                  <td className="p-4 text-center font-mono text-[11px] text-slate-500">
                    -
                  </td>
                  <td className="p-4 text-center font-mono">{totalPaquetes}</td>
                  <td className="p-4 text-center font-mono text-amber-800 font-black">
                    {totalSalidasFueraPerimetro}
                  </td>
                  <td className="p-4 text-right font-mono text-emerald-800 text-sm">
                    ${totalVentaNeta.toLocaleString('es-CO')} COP
                  </td>
                  <td className="p-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ================= VIEW 3: DIRECTORIO DE CLIENTES ================= */}
      {activeSubTab === 'directorio_clientes' && (
        <div className="space-y-6">
          {/* Subheader & Stats Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-red-600" />
                <span>Directorio Oficial de Clientes & Cuentas Corporativas ({filteredClients.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Cuentas activas en SERGEM S.A.S. Consulta supervisores, tarifas pactadas, sedes operativas y líneas directas de comunicación telefónica y WhatsApp.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleOpenCreateClientModal}
                id="btn-add-client-card"
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs flex items-center space-x-2 shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nuevo Cliente</span>
              </button>
            </div>
          </div>

          {/* Client Grid */}
          {filteredClients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900 mb-1">No se encontraron clientes</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                {clientSearchTerm
                  ? `No hay clientes que coincidan con "${clientSearchTerm}".`
                  : 'Aún no hay clientes registrados en la base de datos.'}
              </p>
              <button
                onClick={handleOpenCreateClientModal}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs inline-flex items-center space-x-2 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primer Cliente</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredClients.map((cli) => {
                const stats = clientStatsMap.get(cli.nombre);
                const waLink = buildClientWhatsAppLink(cli.contactoTelefono, cli.contactoNombre, cli.nombre);
                const callLink = cli.contactoTelefono ? buildCallLink(cli.contactoTelefono) : '#';

                return (
                  <div
                    key={cli.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Card Header */}
                    <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-red-100/70 text-red-700 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                              {cli.nombre}
                            </h4>
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                              NIT: {cli.nit || 'Sin Registrar'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                            cli.activo
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {cli.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      {/* City & Address */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-slate-600">
                        <span className="inline-flex items-center space-x-1 bg-slate-100 px-2 py-0.5 rounded-md font-semibold text-slate-700">
                          <MapPin className="w-3 h-3 text-red-500" />
                          <span>{cli.ciudad || 'Cali'}</span>
                        </span>
                        {cli.direccion && (
                          <span className="truncate max-w-[200px]" title={cli.direccion}>
                            {cli.direccion}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body: Contact & Operational Info */}
                    <div className="p-5 space-y-4 flex-1">
                      {/* Coordinator / Supervisor */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                            Contacto / Supervisor
                          </span>
                          {cli.tarifaHoraBase && (
                            <span className="text-[11px] font-extrabold text-indigo-700 font-mono">
                              ${cli.tarifaHoraBase.toLocaleString('es-CO')}/h
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-xs text-slate-900">
                          {cli.contactoNombre || 'No asignado'}
                        </div>

                        {cli.contactoEmail && (
                          <div className="text-[11px] text-slate-500 truncate" title={cli.contactoEmail}>
                            ✉ {cli.contactoEmail}
                          </div>
                        )}

                        {/* Communication Action Buttons: Call & WhatsApp */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <a
                            href={callLink}
                            className={`py-1.5 px-3 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1.5 transition-all ${
                              cli.contactoTelefono
                                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 pointer-events-none'
                            }`}
                            title={cli.contactoTelefono ? `Llamar a ${cli.contactoTelefono}` : 'Sin teléfono'}
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Llamar</span>
                          </a>

                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`py-1.5 px-3 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1.5 transition-all ${
                              cli.contactoTelefono
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs cursor-pointer'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 pointer-events-none'
                            }`}
                            title={cli.contactoTelefono ? `Enviar WhatsApp a ${cli.contactoTelefono}` : 'Sin WhatsApp'}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>

                      {/* Operational Statistics */}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Despachos</div>
                          <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                            {stats?.reportCount || 0}
                          </div>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Horas Totales</div>
                          <div className="text-sm font-black text-indigo-700 font-mono mt-0.5">
                            {stats?.totalHours || 0} hrs
                          </div>
                        </div>
                      </div>

                      {stats && stats.totalVenta > 0 && (
                        <div className="flex items-center justify-between text-xs px-2">
                          <span className="text-slate-500 font-medium">Facturado Acumulado:</span>
                          <span className="font-extrabold text-emerald-700 font-mono">
                            ${stats.totalVenta.toLocaleString('es-CO')}
                          </span>
                        </div>
                      )}

                      {cli.observaciones && (
                        <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                          {cli.observaciones}
                        </p>
                      )}
                    </div>

                    {/* Card Actions: Editar & Eliminar */}
                    <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenEditClientModal(cli)}
                        className="text-xs font-bold text-slate-700 hover:text-indigo-600 flex items-center space-x-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => handleDeleteClientConfirm(cli)}
                        className="text-xs font-bold text-slate-400 hover:text-rose-600 flex items-center space-x-1 py-1 px-2 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Eliminar del directorio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: CREAR / EDITAR CLIENTE ================= */}
      {clientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className={`bg-white rounded-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-fade-in transition-all duration-200 flex flex-col max-h-[90vh] ${
              clientModalTab === 'bulk' && !editingClient ? 'max-w-4xl' : 'max-w-xl'
            }`}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white/10 rounded-2xl">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    {editingClient
                      ? 'Editar Cliente Corporativo'
                      : clientModalTab === 'bulk'
                      ? 'Carga Masiva de Clientes por Excel'
                      : 'Crear Nuevo Cliente Corporativo'}
                  </h3>
                  <p className="text-xs text-red-100 font-medium">
                    SERGEM Mensajería y Logística S.A.S. • Valle del Cauca
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!editingClient && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      downloadClientExcelTemplate();
                    }}
                    className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer active:scale-95"
                    title="Descargar plantilla Excel oficial para importar clientes (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Descargar Plantilla Excel (.xlsx)</span>
                  </button>
                )}
                <button
                  onClick={() => setClientModalOpen(false)}
                  className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pestañas de Selección: Registro Individual vs Carga Masiva (Solo en modo creación) */}
            {!editingClient && (
              <div className="bg-slate-50 border-b border-slate-200 px-6 pt-3 flex items-center justify-between shrink-0">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setClientModalTab('individual')}
                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center space-x-2 border-b-2 cursor-pointer ${
                      clientModalTab === 'individual'
                        ? 'bg-white text-red-700 border-red-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-100/60'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Registro Individual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientModalTab('bulk')}
                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center space-x-2 border-b-2 cursor-pointer ${
                      clientModalTab === 'bulk'
                        ? 'bg-white text-red-700 border-red-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-100/60'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Carga Masiva (Excel)</span>
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-emerald-100 text-emerald-800 rounded-full font-extrabold">
                      Lote
                    </span>
                  </button>
                </div>

                <div className="sm:hidden pb-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      downloadClientExcelTemplate();
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold cursor-pointer"
                    title="Descargar Plantilla Excel (.xlsx)"
                  >
                    <Download className="w-3 h-3" />
                    <span>Plantilla (.xlsx)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cuerpo del Modal: Vista de Carga Masiva o Formulario Individual */}
            <div className="overflow-y-auto flex-1">
              {clientModalTab === 'bulk' && !editingClient ? (
                <div className="p-6">
                  <BulkClientUploadContent
                    existingClients={effectiveClients}
                    onSaveClient={onSaveClient}
                    onCompleteOrClose={() => setClientModalOpen(false)}
                  />
                </div>
              ) : (
                <form onSubmit={handleSaveClientForm} className="p-6 space-y-4 text-xs font-semibold text-slate-700">
                  {!editingClient && (
                    <div className="p-3 bg-red-50/70 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-900">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-4 h-4 text-red-600 shrink-0" />
                        <span>¿Tienes varias cuentas corporativas para registrar?</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setClientModalTab('bulk')}
                        className="px-2.5 py-1 bg-white border border-red-300 text-red-700 font-bold rounded-lg text-[11px] hover:bg-red-100 cursor-pointer shrink-0 ml-3"
                      >
                        Usar Carga Masiva →
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nombre de la Empresa */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                        Nombre o Razón Social del Cliente *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: ALKOSTO CALI, TCC LOGÍSTICA, COSERVICIOS..."
                        value={clientFormNombre}
                        onChange={(e) => setClientFormNombre(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-500 bg-slate-50/50"
                      />
                    </div>

                    {/* NIT / RUT */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                        NIT / Identificación Tributaria
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 890.900.608-9"
                        value={clientFormNit}
                        onChange={(e) => setClientFormNit(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-red-500 bg-slate-50/50"
                      />
                    </div>

                    {/* Ciudad */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                        Ciudad / Sede Operativa
                      </label>
                      <select
                        value={clientFormCiudad}
                        onChange={(e) => setClientFormCiudad(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-500 bg-slate-50/50 cursor-pointer"
                      >
                        <option value="Cali">Cali (Valle)</option>
                        <option value="Yumbo">Yumbo (Valle)</option>
                        <option value="Palmira">Palmira (Valle)</option>
                        <option value="Jamundí">Jamundí (Valle)</option>
                        <option value="Buga">Buga (Valle)</option>
                        <option value="Tuluá">Tuluá (Valle)</option>
                        <option value="Buenaventura">Buenaventura (Valle)</option>
                        <option value="Bogotá D.C.">Bogotá D.C.</option>
                        <option value="Medellín">Medellín (Antioquia)</option>
                      </select>
                    </div>

                    {/* Dirección Principal */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                        Dirección de Muelle / Sede de Despacho
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Av. Pasoancho # 80-120, Bodega 4"
                        value={clientFormDireccion}
                        onChange={(e) => setClientFormDireccion(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-red-500 bg-slate-50/50"
                      />
                    </div>

                    {/* Nombre de Contacto / Supervisor */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                        Nombre del Supervisor / Coordinador
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Liceth Morales / Ing. Carlos Ruiz"
                        value={clientFormContactoNombre}
                        onChange={(e) => setClientFormContactoNombre(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-red-500 bg-slate-50/50"
                      />
                    </div>

                    {/* Teléfono de Contacto */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                        Teléfono Celular (Llamadas / WhatsApp)
                      </label>
                      <input
                        type="tel"
                        placeholder="Ej: 3154567890"
                        value={clientFormContactoTelefono}
                        onChange={(e) => setClientFormContactoTelefono(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-red-500 bg-slate-50/50"
                      />
                    </div>

                    {/* Correo Electrónico */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                        Correo Electrónico de Contacto
                      </label>
                      <input
                        type="email"
                        placeholder="Ej: logistica@cliente.com"
                        value={clientFormContactoEmail}
                        onChange={(e) => setClientFormContactoEmail(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-red-500 bg-slate-50/50"
                      />
                    </div>

                    {/* Tarifa Base por Hora */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                        Tarifa Base por Hora ($ COP)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        placeholder="Ej: 12500"
                        value={clientFormTarifa}
                        onChange={(e) => setClientFormTarifa(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-red-500 bg-slate-50/50"
                      />
                    </div>

                    {/* Observaciones Operativas */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                        Observaciones Operativas / Requisitos Especiales
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Requisitos de EPP, horarios de descargue, condiciones de entrega..."
                        value={clientFormObservaciones}
                        onChange={(e) => setClientFormObservaciones(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-red-500 bg-slate-50/50 resize-none"
                      />
                    </div>

                    {/* Estado Activo */}
                    <div className="md:col-span-2 flex items-center space-x-2 pt-1">
                      <input
                        type="checkbox"
                        id="client-form-activo"
                        checked={clientFormActivo}
                        onChange={(e) => setClientFormActivo(e.target.checked)}
                        className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                      />
                      <label htmlFor="client-form-activo" className="text-xs font-bold text-slate-700 cursor-pointer">
                        Cuenta Activa (Disponible para reportes de operaciones y asignación de turnos)
                      </label>
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setClientModalOpen(false)}
                      className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      id="btn-submit-client"
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingClient ? 'Guardar Cambios' : 'Crear Cliente'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW / PDF MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">Vista Previa e Impresión PDF - Reporte de Clientes y Horas</h3>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-slate-900">
              <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase">SERGEM MENSAJERIA Y LOGISTICA S.A.S.</h1>
                  <p className="text-xs text-slate-500 font-bold">NIT: 901.589.432-1 | Cali, Colombia</p>
                  <p className="text-xs font-extrabold text-indigo-900 mt-1 uppercase">
                    {activeSubTab === 'por_empleado'
                      ? `REPORTE POR EMPLEADO, ${getMonthYearString().toUpperCase()}`
                      : `REPORTE GENERAL POR OPERACION, ${getMonthYearString().toUpperCase()}`}
                  </p>
                </div>
                <div className="text-right text-xs font-mono text-slate-600">
                  <p><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}</p>
                  <p><strong>Hora:</strong> {new Date().toLocaleTimeString('es-CO')}</p>
                </div>
              </div>

              {/* Table rendering dependent on activeSubTab */}
              {activeSubTab === 'por_empleado' ? (
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border">Cédula</th>
                      <th className="p-2 border">Repartidor</th>
                      <th className="p-2 border">Placa</th>
                      <th className="p-2 border">Cliente</th>
                      <th className="p-2 border text-center">Horas Trabajadas</th>
                      <th className="p-2 border text-center">Salidas Fuera Perímetro</th>
                      <th className="p-2 border text-right">Venta Neta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredSummaries.map((sum, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border font-mono font-bold">{sum.documento}</td>
                        <td className="p-2 border font-bold">{sum.nombreRepartidor}</td>
                        <td className="p-2 border font-mono">{sum.placaVehiculo}</td>
                        <td className="p-2 border">{sum.nombreCliente}</td>
                        <td className="p-2 border text-center font-mono font-bold">{sum.horasTrabajadas} hrs</td>
                        <td className="p-2 border text-center font-mono font-bold text-amber-900">{sum.salidasFueraPerimetro || 0}</td>
                        <td className="p-2 border text-right font-mono">${sum.ventaNeta.toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={4} className="p-2 border text-right">Totales:</td>
                      <td className="p-2 border text-center font-mono">{totalSummaryHoras} hrs</td>
                      <td className="p-2 border text-center font-mono text-amber-900">{totalSummarySalidasFueraPerimetro}</td>
                      <td className="p-2 border text-right font-mono">${totalSummaryVentaNeta.toLocaleString('es-CO')}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border">Cliente</th>
                      <th className="p-2 border">Cédula</th>
                      <th className="p-2 border">Repartidor</th>
                      <th className="p-2 border">Placa</th>
                      <th className="p-2 border">Fecha</th>
                      <th className="p-2 border text-center">Horas Trab.</th>
                      <th className="p-2 border text-center">Salidas Perímetro</th>
                      <th className="p-2 border text-right">Venta Neta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredReports.map((rep, idx) => {
                      const emp = employeeMap.get(rep.repartidorId);
                      return (
                        <tr key={idx}>
                          <td className="p-2 border font-bold">{rep.nombreCliente}</td>
                          <td className="p-2 border font-mono font-bold">{emp?.cedula || '1.098.765.432'}</td>
                          <td className="p-2 border">{rep.nombreRepartidor}</td>
                          <td className="p-2 border font-mono">{rep.placaVehiculo}</td>
                          <td className="p-2 border font-mono">{rep.fecha}</td>
                          <td className="p-2 border text-center font-mono font-bold">{rep.horasTrabajadas} hrs</td>
                          <td className="p-2 border text-center font-mono font-bold text-amber-900">{rep.salidasFueraPerimetro || 0}</td>
                          <td className="p-2 border text-right font-mono">${rep.ventaNeta.toLocaleString('es-CO')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={5} className="p-2 border text-right">Totales:</td>
                      <td className="p-2 border text-center font-mono">{totalHoras} hrs</td>
                      <td className="p-2 border text-center font-mono text-amber-900">{totalSalidasFueraPerimetro}</td>
                      <td className="p-2 border text-right font-mono">${totalVentaNeta.toLocaleString('es-CO')}</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer text-xs"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer text-xs flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar como PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
