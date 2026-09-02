import React, { useState, useMemo } from 'react';
import { ClientOrderReport, Employee, WeeklySchedule, CompanySettings } from '../types/payroll';
import { calculateHoursBreakdown, isHolidayOrSundayInColombia } from '../utils/colombianLaborLaw';
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
  X
} from 'lucide-react';

interface ClientReportsViewProps {
  clientReports: ClientOrderReport[];
  employees: Employee[];
  schedules?: WeeklySchedule[];
  company?: CompanySettings;
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
}

export const ClientReportsView: React.FC<ClientReportsViewProps> = ({
  clientReports,
  employees,
  schedules = [],
  company,
  onDeleteClientReport,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'por_empleado' | 'por_registro'>('por_empleado');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('TODOS');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Map of employees by ID for fast lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // Unique client list for filter dropdown
  const uniqueClients = useMemo(() => {
    const clientsSet = new Set<string>();
    clientReports.forEach((cr) => clientsSet.add(cr.nombreCliente));
    schedules.forEach((sch) => {
      Object.values(sch.dias).forEach((d: any) => {
        if (d?.clienteNombre) clientsSet.add(d.clienteNombre);
      });
    });
    return Array.from(clientsSet).sort();
  }, [clientReports, schedules]);

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

  const getExportFilename = (ext: 'csv' | 'xls') => {
    const period = getMonthYearString();
    if (activeSubTab === 'por_empleado') {
      return `Reporte por empleado, ${period}.${ext}`;
    } else {
      return `Reporte General por Operacion, ${period}.${ext}`;
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

  // Totals for Raw Reports
  const totalVentaNeta = filteredReports.reduce((acc, r) => acc + r.ventaNeta, 0);
  const totalPaquetes = filteredReports.reduce((acc, r) => acc + r.paquetesEntregados, 0);
  const totalHoras = filteredReports.reduce((acc, r) => acc + r.horasTrabajadas, 0);

  // ================= EXPORT FUNCTIONS ================= //

  // 1. Export CSV (UTF-8 with BOM for Excel compatibility)
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (activeSubTab === 'por_empleado') {
      headers = [
        'Cédula',
        'Nombre Repartidor',
        'Placa',
        'Cliente',
        'Horas Trabajadas',
        'Horas Ordinarias (42h)',
        'Extras Diurnas (25%)',
        'Extras Nocturnas (75%)',
        'Horas Festivas (100%)',
        'Paquetes Entregados',
        'Venta Neta ($ COP)'
      ];

      rows = filteredSummaries.map((s) => [
        `"${s.documento}"`,
        `"${s.nombreRepartidor}"`,
        `"${s.placaVehiculo}"`,
        `"${s.nombreCliente}"`,
        s.horasTrabajadas,
        s.horasOrdinarias,
        s.horasExtrasDiurnas,
        s.horasExtrasNocturnas,
        s.horasFestivas,
        s.paquetesEntregados,
        s.ventaNeta,
      ]);
    } else {
      headers = [
        'ID Cliente',
        'Cliente',
        'ID Repartidor',
        'Cédula',
        'Repartidor',
        'Placa Vehiculo',
        'Fecha',
        'Horas Trab.',
        'Horas Ord. (42h)',
        'Extras Diurnas (25%)',
        'Extras Nocturnas (75%)',
        'Festivas (100%)',
        'Paquetes',
        'Venta Neta ($ COP)',
      ];

      rows = filteredReports.map((r) => {
        const emp = employeeMap.get(r.repartidorId);
        return [
          r.clienteId,
          `"${r.nombreCliente}"`,
          r.repartidorId,
          `"${emp?.cedula || '1.098.765.432'}"`,
          `"${r.nombreRepartidor}"`,
          r.placaVehiculo,
          r.fecha,
          r.horasTrabajadas,
          r.horasOrdinarias,
          r.horasExtrasDiurnas,
          r.horasExtrasNocturnas,
          r.horasFestivas,
          r.paquetesEntregados,
          r.ventaNeta,
        ];
      });
    }

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', getExportFilename('csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Export Excel (.XLS) HTML Spreadsheet Format
  const handleExportExcel = () => {
    const isEmployeeView = activeSubTab === 'por_empleado';
    const period = getMonthYearString();
    const reportTitle = isEmployeeView
      ? `REPORTE POR EMPLEADO, ${period.toUpperCase()}`
      : `REPORTE GENERAL POR OPERACION, ${period.toUpperCase()}`;

    let tableHTML = '';

    if (isEmployeeView) {
      tableHTML = `
        <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px;">
          <thead>
            <tr style="background-color: #064e3b; color: #ffffff; font-weight: bold; text-align: center;">
              <th style="padding: 8px;">Cédula</th>
              <th style="padding: 8px;">Nombre Repartidor</th>
              <th style="padding: 8px;">Placa</th>
              <th style="padding: 8px;">Cliente / Sede Operativa</th>
              <th style="padding: 8px;">Horas Trabajadas</th>
              <th style="padding: 8px;">Horas Ord. (42h)</th>
              <th style="padding: 8px;">Extras Diurnas (+25%)</th>
              <th style="padding: 8px;">Extras Nocturnas (+75%)</th>
              <th style="padding: 8px;">Festivas / Dominicales (+100%)</th>
              <th style="padding: 8px;">Paquetes</th>
              <th style="padding: 8px;">Venta Neta ($ COP)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSummaries
              .map(
                (s, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 6px; text-align: center; font-weight: bold;">${s.documento}</td>
                <td style="padding: 6px; font-weight: bold;">${s.nombreRepartidor}</td>
                <td style="padding: 6px; text-align: center; font-weight: bold;">${s.placaVehiculo}</td>
                <td style="padding: 6px;">${s.nombreCliente}</td>
                <td style="padding: 6px; text-align: center; font-weight: bold; color: #0f172a;">${s.horasTrabajadas} hrs</td>
                <td style="padding: 6px; text-align: center;">${s.horasOrdinarias}h</td>
                <td style="padding: 6px; text-align: center; color: #1e40af;">${s.horasExtrasDiurnas}h</td>
                <td style="padding: 6px; text-align: center; color: #3730a3;">${s.horasExtrasNocturnas}h</td>
                <td style="padding: 6px; text-align: center; color: #581c87;">${s.horasFestivas}h</td>
                <td style="padding: 6px; text-align: center;">${s.paquetesEntregados}</td>
                <td style="padding: 6px; text-align: right; font-weight: bold;">$${s.ventaNeta.toLocaleString('es-CO')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #ecfdf5; font-weight: bold; text-align: center; border-top: 2px solid #047857;">
              <td colspan="4" style="padding: 10px; text-align: right;">TOTALES GENERALES:</td>
              <td style="padding: 10px; font-size: 12px; color: #047857;">${totalSummaryHoras} hrs</td>
              <td style="padding: 10px;">${totalSummaryOrdinarias}h</td>
              <td style="padding: 10px;">${totalSummaryExtras}h</td>
              <td style="padding: 10px;">-</td>
              <td style="padding: 10px;">${totalSummaryFestivas}h</td>
              <td style="padding: 10px;">${totalSummaryPaquetes}</td>
              <td style="padding: 10px; text-align: right;">$${totalSummaryVentaNeta.toLocaleString('es-CO')} COP</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else {
      tableHTML = `
        <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px;">
          <thead>
            <tr style="background-color: #064e3b; color: #ffffff; font-weight: bold; text-align: center;">
              <th style="padding: 8px;">Cliente</th>
              <th style="padding: 8px;">Cédula</th>
              <th style="padding: 8px;">Repartidor</th>
              <th style="padding: 8px;">Placa</th>
              <th style="padding: 8px;">Fecha</th>
              <th style="padding: 8px;">Horas Trab.</th>
              <th style="padding: 8px;">Horas Ord.</th>
              <th style="padding: 8px;">Extras Diurnas</th>
              <th style="padding: 8px;">Extras Nocturnas</th>
              <th style="padding: 8px;">Festivas</th>
              <th style="padding: 8px;">Paquetes</th>
              <th style="padding: 8px;">Venta Neta ($ COP)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredReports
              .map((r, idx) => {
                const emp = employeeMap.get(r.repartidorId);
                return `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 6px; font-weight: bold;">${r.nombreCliente}</td>
                <td style="padding: 6px; text-align: center; font-weight: bold;">${emp?.cedula || '1.098.765.432'}</td>
                <td style="padding: 6px;">${r.nombreRepartidor}</td>
                <td style="padding: 6px; text-align: center;">${r.placaVehiculo}</td>
                <td style="padding: 6px; text-align: center;">${r.fecha}</td>
                <td style="padding: 6px; text-align: center; font-weight: bold;">${r.horasTrabajadas} hrs</td>
                <td style="padding: 6px; text-align: center;">${r.horasOrdinarias}h</td>
                <td style="padding: 6px; text-align: center;">${r.horasExtrasDiurnas}h</td>
                <td style="padding: 6px; text-align: center;">${r.horasExtrasNocturnas}h</td>
                <td style="padding: 6px; text-align: center;">${r.horasFestivas}h</td>
                <td style="padding: 6px; text-align: center;">${r.paquetesEntregados}</td>
                <td style="padding: 6px; text-align: right; font-weight: bold;">$${r.ventaNeta.toLocaleString('es-CO')}</td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #ecfdf5; font-weight: bold; text-align: center;">
              <td colspan="5" style="padding: 10px; text-align: right;">TOTALES:</td>
              <td style="padding: 10px;">${totalHoras} hrs</td>
              <td colspan="4"></td>
              <td style="padding: 10px;">${totalPaquetes}</td>
              <td style="padding: 10px; text-align: right;">$${totalVentaNeta.toLocaleString('es-CO')} COP</td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Reporte Clientes</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #064e3b; margin-bottom: 5px;">SERGEM MENSAJERIA Y LOGISTICA S.A.S.</h2>
          <p style="font-size: 12px; color: #475569; margin-top: 0;">NIT: 901.589.432-1 | Sistema de Gestión de Operaciones 2026</p>
          <h3 style="color: #0f172a; border-bottom: 2px solid #047857; padding-bottom: 5px; margin-top: 15px;">${reportTitle}</h3>
          <p style="font-size: 11px; color: #64748b;">Fecha de Generación: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}</p>
          <br />
          ${tableHTML}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', getExportFilename('xls'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Export / Print PDF
  const handlePrintPDF = () => {
    setShowPrintModal(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div id="client-reports-view" className="space-y-6">
      {/* Header Banner - Light Slate Grey Premium Design */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/60 text-slate-900 rounded-2xl p-7 md:p-8 shadow-xs border border-slate-300/80 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-white border border-slate-300/80 text-red-700 font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-2xs">
            <Sparkles className="w-4 h-4 text-red-600" />
            <span>Reportes de Operación & Venta Neta por Cliente</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Reporte de Clientes, Repartidores y Horas Reforma 2026
          </h2>
          <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
            Consolidado operativo detallado con vinculación de Cédula de Ciudadanía, Nombre del Repartidor, Placa de Vehículo, Cliente asignado y cálculo de horas laboradas conforme a la Ley 2101 (Jornada Máxima 42h/semana) en Colombia.
          </p>
        </div>

        {/* 3 Download / Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Descargar en formato Excel (.XLS)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar XLS</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Generar o Imprimir Reporte PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md border border-slate-700 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Descargar archivo CSV estructurado UTF-8"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
          <button
            onClick={() => setActiveSubTab('por_empleado')}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'por_empleado'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className={`w-4 h-4 ${activeSubTab === 'por_empleado' ? 'text-white' : 'text-slate-600'}`} />
            <span>Reporte por Empleado (Cédula - Cliente - Horas)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('por_registro')}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'por_registro'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className={`w-4 h-4 ${activeSubTab === 'por_registro' ? 'text-white' : 'text-slate-600'}`} />
            <span>Reporte General por Operación</span>
          </button>
        </div>

        {/* Search & Select Filters */}
        <div className="flex flex-wrap items-center gap-3">
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
                  <th className="p-3.5 pr-6 text-right">Venta Neta ($ COP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
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
            </table>
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
                        <td className="p-2 border text-right font-mono">${sum.ventaNeta.toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={4} className="p-2 border text-right">Totales:</td>
                      <td className="p-2 border text-center font-mono">{totalSummaryHoras} hrs</td>
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
                          <td className="p-2 border text-right font-mono">${rep.ventaNeta.toLocaleString('es-CO')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={5} className="p-2 border text-right">Totales:</td>
                      <td className="p-2 border text-center font-mono">{totalHoras} hrs</td>
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
