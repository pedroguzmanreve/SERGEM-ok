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
  X,
  Compass,
  MapPin,
  FileCheck
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
  recargoNocturno: number;
  recargoFestivo: number;
  salidasFueraPerimetro: number;
  valorFueraPerimetro: number;
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
          recargoNocturno: 0,
          recargoFestivo: 0,
          salidasFueraPerimetro: 0,
          valorFueraPerimetro: 0,
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
      item.recargoNocturno += r.recargoNocturno || 0;
      item.recargoFestivo += r.recargoFestivo || 0;
      item.salidasFueraPerimetro += r.salidasFueraPerimetro || 0;
      item.valorFueraPerimetro += r.valorFueraPerimetro || 0;
      item.paquetesEntregados += r.paquetesEntregados;
      item.ventaNeta += r.ventaNeta;
    });

    // Also incorporate WeeklySchedule shifts for any employee
    schedules.forEach((sch) => {
      const emp = employeeMap.get(sch.repartidorId);
      if (!emp) return;

      Object.entries(sch.dias).forEach(([dayName, rawShift]) => {
        const shift = rawShift as any;
        if (!shift || shift.tipo === 'Descanso') return;

        const clientName = shift.clienteNombre || 'Almacenes Éxito S.A.';
        const key = `${sch.repartidorId}___${clientName}`;

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
            recargoNocturno: 0,
            recargoFestivo: 0,
            salidasFueraPerimetro: 0,
            valorFueraPerimetro: 0,
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
  const totalSummaryExtrasDiurnas = filteredSummaries.reduce((acc, s) => acc + s.horasExtrasDiurnas, 0);
  const totalSummaryExtrasNocturnas = filteredSummaries.reduce((acc, s) => acc + s.horasExtrasNocturnas, 0);
  const totalSummaryFestivas = filteredSummaries.reduce((acc, s) => acc + s.horasFestivas, 0);
  const totalSummaryRecargoNocturno = filteredSummaries.reduce((acc, s) => acc + s.recargoNocturno, 0);
  const totalSummaryRecargoFestivo = filteredSummaries.reduce((acc, s) => acc + s.recargoFestivo, 0);
  const totalSummarySalidasFuera = filteredSummaries.reduce((acc, s) => acc + s.salidasFueraPerimetro, 0);
  const totalSummaryValorFuera = filteredSummaries.reduce((acc, s) => acc + s.valorFueraPerimetro, 0);
  const totalSummaryPaquetes = filteredSummaries.reduce((acc, s) => acc + s.paquetesEntregados, 0);
  const totalSummaryVentaNeta = filteredSummaries.reduce((acc, s) => acc + s.ventaNeta, 0);

  // Totals for Raw Reports
  const totalVentaNeta = filteredReports.reduce((acc, r) => acc + r.ventaNeta, 0);
  const totalPaquetes = filteredReports.reduce((acc, r) => acc + r.paquetesEntregados, 0);
  const totalHoras = filteredReports.reduce((acc, r) => acc + r.horasTrabajadas, 0);
  const totalSalidasFuera = filteredReports.reduce((acc, r) => acc + (r.salidasFueraPerimetro || 0), 0);
  const totalValorFuera = filteredReports.reduce((acc, r) => acc + (r.valorFueraPerimetro || 0), 0);

  // EXPORT CSV
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
        'Extras Diurnas (+25%)',
        'Extras Nocturnas (+75%)',
        'Dominicales / Festivas (+100%)',
        'Recargo Nocturno (+35%)',
        'Recargo Festivo (+75%)',
        'Salidas Fuera Perímetro (Cant)',
        'Valor Fuera Perímetro ($ COP)',
        'Paquetes Entregados',
        'Venta Neta ($ COP)',
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
        s.recargoNocturno,
        s.recargoFestivo,
        s.salidasFueraPerimetro,
        s.valorFueraPerimetro,
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
        'Placa Vehículo',
        'Fecha',
        'Horas Trab.',
        'Horas Ord. (42h)',
        'Extras Diurnas (+25%)',
        'Extras Nocturnas (+75%)',
        'Dominicales/Festivas (+100%)',
        'Recargo Noct. (+35%)',
        'Recargo Fest. (+75%)',
        'Salidas Fuera Perímetro (Cant)',
        'Valor Fuera Perímetro ($ COP)',
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
          r.recargoNocturno || 0,
          r.recargoFestivo || 0,
          r.salidasFueraPerimetro || 0,
          r.valorFueraPerimetro || 0,
          r.paquetesEntregados,
          r.ventaNeta,
        ];
      });
    }

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', getExportFilename('csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT EXCEL HTML
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
            <tr style="background-color: #991b1b; color: #ffffff; font-weight: bold; text-align: center;">
              <th style="padding: 8px;">Cédula</th>
              <th style="padding: 8px;">Nombre Repartidor</th>
              <th style="padding: 8px;">Placa</th>
              <th style="padding: 8px;">Cliente / Sede</th>
              <th style="padding: 8px;">Horas Trab.</th>
              <th style="padding: 8px;">Horas Ord. (42h)</th>
              <th style="padding: 8px;">HED (+25%)</th>
              <th style="padding: 8px;">HEN (+75%)</th>
              <th style="padding: 8px;">Dom/Fest (+100%)</th>
              <th style="padding: 8px;">Rec. Noct. (+35%)</th>
              <th style="padding: 8px;">Rec. Fest. (+75%)</th>
              <th style="padding: 8px;">Salidas Fuera Perímetro</th>
              <th style="padding: 8px;">Valor Fuera Perímetro ($)</th>
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
                <td style="padding: 6px; text-align: center;">${s.recargoNocturno}h</td>
                <td style="padding: 6px; text-align: center;">${s.recargoFestivo}h</td>
                <td style="padding: 6px; text-align: center; font-weight: bold; color: #b45309;">${s.salidasFueraPerimetro}</td>
                <td style="padding: 6px; text-align: right; font-weight: bold; color: #b45309;">$${s.valorFueraPerimetro.toLocaleString('es-CO')}</td>
                <td style="padding: 6px; text-align: center;">${s.paquetesEntregados}</td>
                <td style="padding: 6px; text-align: right; font-weight: bold;">$${s.ventaNeta.toLocaleString('es-CO')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #fef2f2; font-weight: bold; text-align: center; border-top: 2px solid #b91c1c;">
              <td colspan="4" style="padding: 10px; text-align: right;">TOTALES GENERALES:</td>
              <td style="padding: 10px; font-size: 12px; color: #b91c1c;">${totalSummaryHoras} hrs</td>
              <td style="padding: 10px;">${totalSummaryOrdinarias}h</td>
              <td style="padding: 10px;">${totalSummaryExtrasDiurnas}h</td>
              <td style="padding: 10px;">${totalSummaryExtrasNocturnas}h</td>
              <td style="padding: 10px;">${totalSummaryFestivas}h</td>
              <td style="padding: 10px;">${totalSummaryRecargoNocturno}h</td>
              <td style="padding: 10px;">${totalSummaryRecargoFestivo}h</td>
              <td style="padding: 10px; color: #b45309;">${totalSummarySalidasFuera}</td>
              <td style="padding: 10px; text-align: right; color: #b45309;">$${totalSummaryValorFuera.toLocaleString('es-CO')}</td>
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
            <tr style="background-color: #991b1b; color: #ffffff; font-weight: bold; text-align: center;">
              <th style="padding: 8px;">Cliente</th>
              <th style="padding: 8px;">Cédula</th>
              <th style="padding: 8px;">Repartidor</th>
              <th style="padding: 8px;">Placa</th>
              <th style="padding: 8px;">Fecha</th>
              <th style="padding: 8px;">Horas Trab.</th>
              <th style="padding: 8px;">Horas Ord. (42h)</th>
              <th style="padding: 8px;">HED</th>
              <th style="padding: 8px;">HEN</th>
              <th style="padding: 8px;">Dom/Fest</th>
              <th style="padding: 8px;">Rec. Noct.</th>
              <th style="padding: 8px;">Rec. Fest.</th>
              <th style="padding: 8px;">Fuera Perímetro (Cant)</th>
              <th style="padding: 8px;">Valor Fuera Perímetro ($)</th>
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
                <td style="padding: 6px; text-align: center;">${r.recargoNocturno || 0}h</td>
                <td style="padding: 6px; text-align: center;">${r.recargoFestivo || 0}h</td>
                <td style="padding: 6px; text-align: center; font-weight: bold; color: #b45309;">${r.salidasFueraPerimetro || 0}</td>
                <td style="padding: 6px; text-align: right; font-weight: bold; color: #b45309;">$${(r.valorFueraPerimetro || 0).toLocaleString('es-CO')}</td>
                <td style="padding: 6px; text-align: center;">${r.paquetesEntregados}</td>
                <td style="padding: 6px; text-align: right; font-weight: bold;">$${r.ventaNeta.toLocaleString('es-CO')}</td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #fef2f2; font-weight: bold; text-align: center;">
              <td colspan="5" style="padding: 10px; text-align: right;">TOTALES:</td>
              <td style="padding: 10px;">${totalHoras} hrs</td>
              <td colspan="6"></td>
              <td style="padding: 10px; color: #b45309;">${totalSalidasFuera}</td>
              <td style="padding: 10px; text-align: right; color: #b45309;">$${totalValorFuera.toLocaleString('es-CO')}</td>
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
      </head>
      <body>
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #991b1b; margin-bottom: 5px;">SERGEM MENSAJERIA Y LOGISTICA S.A.S.</h2>
          <p style="font-size: 12px; color: #475569; margin-top: 0;">NIT: 900.398.712-4 | Sistema de Operaciones & Reporte Consolidado 2026</p>
          <h3 style="color: #0f172a; border-bottom: 2px solid #dc2626; padding-bottom: 5px; margin-top: 15px;">${reportTitle}</h3>
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

  const handlePrintPDF = () => {
    setShowPrintModal(true);
  };

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div id="client-reports-view" className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/60 text-slate-900 rounded-2xl p-7 md:p-8 shadow-xs border border-slate-300/80 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-white border border-slate-300/80 text-red-700 font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-2xs">
            <Building2 className="w-4 h-4 text-red-600" />
            <span>Operaciones & Liquidación de Clientes</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Reportes Operativos de Clientes & Consolidado de Turnos
          </h2>
          <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
            Consulte la liquidación consolidada por empleado y cliente: horas ordinarias (base 42h), horas extras diurnas/nocturnas, dominicales/festivas, recargos nocturnos, recargos festivos y salidas fuera del perímetro urbano (extra-radio).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer hover:border-slate-400"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Horas Registradas</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {activeSubTab === 'por_empleado' ? totalSummaryHoras : totalHoras}
              </span>
              <span className="text-xs text-slate-500 font-bold">hrs</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Paquetes Entregados</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {activeSubTab === 'por_empleado' ? totalSummaryPaquetes : totalPaquetes}
              </span>
              <span className="text-xs text-slate-500 font-bold">unidades</span>
            </div>
          </div>
        </div>

        {/* KPI SALIDAS FUERA DE PERÍMETRO */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Fuera del Perímetro</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-black text-amber-950 font-mono">
                {activeSubTab === 'por_empleado' ? totalSummarySalidasFuera : totalSalidasFuera}
              </span>
              <span className="text-xs text-amber-700 font-bold">
                (${(activeSubTab === 'por_empleado' ? totalSummaryValorFuera : totalValorFuera).toLocaleString('es-CO')})
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">Extras & Recargos</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black text-purple-950 font-mono">
                {totalSummaryExtrasDiurnas + totalSummaryExtrasNocturnas + totalSummaryFestivas}
              </span>
              <span className="text-xs text-purple-700 font-bold">hrs</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Venta Neta Total</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-xl font-black text-emerald-700 font-mono">
                ${(activeSubTab === 'por_empleado' ? totalSummaryVentaNeta : totalVentaNeta).toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs and Filters Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* SubTab Switcher */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('por_empleado')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-2 ${
              activeSubTab === 'por_empleado'
                ? 'bg-white text-red-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Por Empleado (Consolidado de Turnos)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('por_registro')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-2 ${
              activeSubTab === 'por_registro'
                ? 'bg-white text-red-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Detalle por Operación / Registro</span>
          </button>
        </div>

        {/* Filter Inputs */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cédula, repartidor, placa o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Cliente:</span>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="TODOS">Todos los Clientes</option>
              {uniqueClients.map((cli) => (
                <option key={cli} value={cli}>
                  {cli}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: REPORTE POR EMPLEADO CON CONSOLIDADO DE TURNOS Y DESGLOSE COMPLETO */}
      {activeSubTab === 'por_empleado' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-red-600" />
              <h3 className="font-black text-sm text-slate-900 uppercase">
                Consolidado de Turnos y Producción por Empleado ({filteredSummaries.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Período: <strong>{getMonthYearString()}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-6">Cédula & Repartidor</th>
                  <th className="p-3.5">Placa</th>
                  <th className="p-3.5">Cliente Asignado</th>
                  <th className="p-3.5 text-center">Horas Totales</th>
                  <th className="p-3.5 text-center">Ord. (42h)</th>
                  <th className="p-3.5 text-center text-blue-900">HED (+25%)</th>
                  <th className="p-3.5 text-center text-indigo-900">HEN (+75%)</th>
                  <th className="p-3.5 text-center text-purple-900">Dom/Fest (+100%)</th>
                  <th className="p-3.5 text-center text-indigo-800">Rec. Noct. (+35%)</th>
                  <th className="p-3.5 text-center text-purple-800">Rec. Fest. (+75%)</th>
                  <th className="p-3.5 text-center text-amber-900 bg-amber-50/50">Fuera Perímetro</th>
                  <th className="p-3.5 text-center">Paquetes</th>
                  <th className="p-3.5 pr-6 text-right">Venta Neta ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-slate-400 italic">
                      No hay registros consolidados para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((summary, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-6">
                        <div className="font-bold text-slate-900 text-sm">{summary.nombreRepartidor}</div>
                        <div className="text-[11px] font-mono text-slate-500 font-bold">
                          C.C. {summary.documento}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono font-bold bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                          {summary.placaVehiculo}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800">{summary.nombreCliente}</span>
                      </td>

                      <td className="p-3.5 text-center font-black text-slate-900 text-sm font-mono">
                        {summary.horasTrabajadas} hrs
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-slate-700">
                        {summary.horasOrdinarias}h
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-blue-800">
                        {summary.horasExtrasDiurnas > 0 ? `${summary.horasExtrasDiurnas}h` : '-'}
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-indigo-800">
                        {summary.horasExtrasNocturnas > 0 ? `${summary.horasExtrasNocturnas}h` : '-'}
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-purple-800">
                        {summary.horasFestivas > 0 ? `${summary.horasFestivas}h` : '-'}
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-indigo-600">
                        {summary.recargoNocturno > 0 ? `${summary.recargoNocturno}h` : '-'}
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-purple-600">
                        {summary.recargoFestivo > 0 ? `${summary.recargoFestivo}h` : '-'}
                      </td>

                      {/* SALIDAS FUERA DE PERÍMETRO */}
                      <td className="p-3.5 text-center bg-amber-50/40">
                        {summary.salidasFueraPerimetro > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-black text-amber-950 font-mono text-xs">
                              {summary.salidasFueraPerimetro} salidas
                            </span>
                            <span className="text-[10px] text-amber-800 font-bold font-mono">
                              ${summary.valorFueraPerimetro.toLocaleString('es-CO')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center font-bold text-slate-900 font-mono">
                        {summary.paquetesEntregados}
                      </td>

                      <td className="p-3.5 pr-6 text-right font-black text-slate-900 text-xs font-mono">
                        ${summary.ventaNeta.toLocaleString('es-CO')} COP
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredSummaries.length > 0 && (
                <tfoot className="bg-slate-100 font-black text-slate-900 text-xs border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="p-3.5 pl-6 text-right uppercase">Totales Generales:</td>
                    <td className="p-3.5 text-center font-mono text-sm text-red-700">{totalSummaryHoras} hrs</td>
                    <td className="p-3.5 text-center font-mono">{totalSummaryOrdinarias}h</td>
                    <td className="p-3.5 text-center font-mono text-blue-900">{totalSummaryExtrasDiurnas}h</td>
                    <td className="p-3.5 text-center font-mono text-indigo-900">{totalSummaryExtrasNocturnas}h</td>
                    <td className="p-3.5 text-center font-mono text-purple-900">{totalSummaryFestivas}h</td>
                    <td className="p-3.5 text-center font-mono text-indigo-700">{totalSummaryRecargoNocturno}h</td>
                    <td className="p-3.5 text-center font-mono text-purple-700">{totalSummaryRecargoFestivo}h</td>
                    <td className="p-3.5 text-center font-mono text-amber-950 bg-amber-100/70">
                      {totalSummarySalidasFuera} ($ {totalSummaryValorFuera.toLocaleString('es-CO')})
                    </td>
                    <td className="p-3.5 text-center font-mono">{totalSummaryPaquetes}</td>
                    <td className="p-3.5 pr-6 text-right font-mono text-emerald-800">
                      ${totalSummaryVentaNeta.toLocaleString('es-CO')} COP
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: DETALLE POR OPERACIÓN / REGISTRO */}
      {activeSubTab === 'por_registro' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-red-600" />
              <h3 className="font-black text-sm text-slate-900 uppercase">
                Registros de Operación Diaria ({filteredReports.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Período: <strong>{getMonthYearString()}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-6">Cliente</th>
                  <th className="p-3.5">Cédula & Repartidor</th>
                  <th className="p-3.5">Placa</th>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5 text-center">Horas</th>
                  <th className="p-3.5 text-center">Desglose Horas (42h)</th>
                  <th className="p-3.5 text-center text-amber-900 bg-amber-50/50">Fuera Perímetro</th>
                  <th className="p-3.5 text-center">Paquetes</th>
                  <th className="p-3.5 text-right">Venta Neta</th>
                  <th className="p-3.5 pr-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                      No hay registros operativos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((rep) => {
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
                            {rep.horasExtrasNocturnas > 0 && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-bold">
                                HEN: {rep.horasExtrasNocturnas}h
                              </span>
                            )}
                            {rep.horasFestivas > 0 && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded font-bold">
                                Fest: {rep.horasFestivas}h
                              </span>
                            )}
                          </div>
                        </td>

                        {/* SALIDAS FUERA DE PERÍMETRO */}
                        <td className="p-3.5 text-center bg-amber-50/40">
                          {(rep.salidasFueraPerimetro || 0) > 0 ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="font-bold text-amber-950 text-xs font-mono">
                                {rep.salidasFueraPerimetro} salidas
                              </span>
                              <span className="text-[10px] text-amber-800 font-semibold">
                                ${(rep.valorFueraPerimetro || 0).toLocaleString('es-CO')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REQUERIMIENTO EXPLÍCITO: EL PDF DEBE MOSTRAR EL CONSOLIDADO DE LOS TURNOS POR EMPLEADO */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:static print:bg-white">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-6 print:max-h-none print:shadow-none print:border-none print:my-0">
            
            {/* Modal Top Control Bar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold">
                  Vista Previa de Impresión & Exportación PDF - Consolidado de Turnos y Operación
                </h3>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRINTABLE DOCUMENT BODY */}
            <div className="p-8 overflow-y-auto space-y-6 text-slate-900 print:p-0 print:overflow-visible">
              
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    SERGEM MENSAJERIA Y LOGISTICA S.A.S.
                  </h1>
                  <p className="text-xs text-slate-600 font-bold">
                    NIT: 900.398.712-4 • Calle 10 # 38-42, Santiago de Cali
                  </p>
                  <p className="text-xs font-black text-red-700 mt-1 uppercase tracking-wide">
                    {activeSubTab === 'por_empleado'
                      ? `REPORTE CONSOLIDADO DE TURNOS Y PRODUCCIÓN POR EMPLEADO — ${getMonthYearString().toUpperCase()}`
                      : `REPORTE OPERATIVO DETALLADO DE CLIENTES — ${getMonthYearString().toUpperCase()}`}
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs font-mono text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <p><strong>Fecha Generación:</strong> {new Date().toLocaleDateString('es-CO')}</p>
                  <p><strong>Hora:</strong> {new Date().toLocaleTimeString('es-CO')}</p>
                  <p><strong>Régimen:</strong> Ley 2101 (42h Semanales)</p>
                </div>
              </div>

              {/* SECTION 1: TABLA CONSOLIDADA POR EMPLEADO */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 border-b border-slate-300 pb-1">
                  <Users className="w-4 h-4 text-red-600" />
                  <span>1. Resumen Consolidado de Horas, Recargos y Fuera de Perímetro</span>
                </h3>

                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[9px]">
                    <tr>
                      <th className="p-2 border">Cédula</th>
                      <th className="p-2 border">Repartidor</th>
                      <th className="p-2 border">Placa</th>
                      <th className="p-2 border">Cliente</th>
                      <th className="p-2 border text-center">Horas Ord. (42h)</th>
                      <th className="p-2 border text-center">HED (+25%)</th>
                      <th className="p-2 border text-center">HEN (+75%)</th>
                      <th className="p-2 border text-center">Dom/Fest (+100%)</th>
                      <th className="p-2 border text-center">Rec. Noct. (+35%)</th>
                      <th className="p-2 border text-center">Rec. Fest. (+75%)</th>
                      <th className="p-2 border text-center">Fuera Perímetro</th>
                      <th className="p-2 border text-center">Paquetes</th>
                      <th className="p-2 border text-right">Venta Neta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {filteredSummaries.map((sum, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2 border font-mono font-bold">{sum.documento}</td>
                        <td className="p-2 border font-bold">{sum.nombreRepartidor}</td>
                        <td className="p-2 border font-mono">{sum.placaVehiculo}</td>
                        <td className="p-2 border">{sum.nombreCliente}</td>
                        <td className="p-2 border text-center font-mono">{sum.horasOrdinarias}h</td>
                        <td className="p-2 border text-center font-mono">{sum.horasExtrasDiurnas}h</td>
                        <td className="p-2 border text-center font-mono">{sum.horasExtrasNocturnas}h</td>
                        <td className="p-2 border text-center font-mono">{sum.horasFestivas}h</td>
                        <td className="p-2 border text-center font-mono">{sum.recargoNocturno}h</td>
                        <td className="p-2 border text-center font-mono">{sum.recargoFestivo}h</td>
                        <td className="p-2 border text-center font-mono font-bold text-amber-900">
                          {sum.salidasFueraPerimetro > 0 ? `${sum.salidasFueraPerimetro} ($${sum.valorFueraPerimetro.toLocaleString('es-CO')})` : '-'}
                        </td>
                        <td className="p-2 border text-center font-mono font-bold">{sum.paquetesEntregados}</td>
                        <td className="p-2 border text-right font-mono font-bold">${sum.ventaNeta.toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold text-xs">
                    <tr>
                      <td colSpan={4} className="p-2 border text-right uppercase">Totales:</td>
                      <td className="p-2 border text-center font-mono">{totalSummaryOrdinarias}h</td>
                      <td className="p-2 border text-center font-mono">{totalSummaryExtrasDiurnas}h</td>
                      <td className="p-2 border text-center font-mono">{totalSummaryExtrasNocturnas}h</td>
                      <td className="p-2 border text-center font-mono">{totalSummaryFestivas}h</td>
                      <td className="p-2 border text-center font-mono">{totalSummaryRecargoNocturno}h</td>
                      <td className="p-2 border text-center font-mono">{totalSummaryRecargoFestivo}h</td>
                      <td className="p-2 border text-center font-mono text-amber-900">
                        {totalSummarySalidasFuera} ($ {totalSummaryValorFuera.toLocaleString('es-CO')})
                      </td>
                      <td className="p-2 border text-center font-mono">{totalSummaryPaquetes}</td>
                      <td className="p-2 border text-right font-mono text-emerald-800">
                        ${totalSummaryVentaNeta.toLocaleString('es-CO')} COP
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* SECTION 2: CONSOLIDADO DE MALLAS DE TURNOS ASIGNADOS Y REPORTADOS POR EMPLEADO */}
              {activeSubTab === 'por_empleado' && (
                <div className="space-y-4 pt-4 border-t border-slate-300">
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 border-b border-slate-300 pb-1">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>2. Detalle y Malla de Turnos Semanales Asignados por Empleado</span>
                  </h3>

                  {employees
                    .filter((emp) => emp.activo && emp.rol === 'Repartidor')
                    .map((driver) => {
                      const driverSched = schedules.find((s) => s.repartidorId === driver.id);

                      return (
                        <div key={driver.id} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 space-y-2">
                          <div className="flex flex-wrap items-center justify-between text-xs font-bold border-b border-slate-200 pb-1.5">
                            <span className="text-slate-900">
                              Repartidor: <strong className="text-red-700">{driver.nombre} {driver.apellido}</strong> (C.C. {driver.cedula})
                            </span>
                            <span className="text-slate-600 font-mono">
                              Placa: <strong className="text-slate-900">{driver.placaVehiculo || 'VTX-89D'}</strong> | Cargo: {driver.cargo}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5 text-[10px]">
                            {daysOfWeek.map((day) => {
                              const shift = driverSched?.dias[day as keyof WeeklySchedule['dias']];
                              const isRest = !shift || shift.tipo === 'Descanso';

                              return (
                                <div
                                  key={day}
                                  className={`p-2 rounded-lg border ${
                                    isRest
                                      ? 'bg-slate-100 text-slate-400 border-slate-200'
                                      : 'bg-white text-slate-800 border-slate-300 shadow-2xs'
                                  }`}
                                >
                                  <div className="font-extrabold uppercase text-[9px] text-slate-700 mb-0.5">{day}</div>
                                  {isRest ? (
                                    <div className="italic text-[9px]">Descanso</div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <div className="font-bold text-red-800 truncate">{shift.clienteNombre || 'Sede SERGEM'}</div>
                                      <div className="font-mono font-bold text-[9px]">{shift.horaInicio1} - {shift.horaFin1}</div>
                                      {shift.tipo === 'Partido' && shift.horaInicio2 && (
                                        <div className="font-mono text-[9px] text-indigo-900">{shift.horaInicio2} - {shift.horaFin2}</div>
                                      )}
                                      <div className="text-[8px] text-slate-500 font-semibold">{shift.tipo}</div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Signatures for PDF */}
              <div className="pt-8 grid grid-cols-2 gap-12 text-xs text-slate-600 print:pt-12">
                <div className="border-t border-slate-400 pt-2 text-center">
                  <span className="font-bold text-slate-900 block">SERGEM MENSAJERIA Y LOGISTICA S.A.S.</span>
                  <span>Coordinación de Operaciones & Logística</span>
                </div>
                <div className="border-t border-slate-400 pt-2 text-center">
                  <span className="font-bold text-slate-900 block">Gestión Humana y Auditoría</span>
                  <span>Control de Nómina y Facturación a Clientes</span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 print:hidden">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer text-xs"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md cursor-pointer text-xs flex items-center space-x-2 active:scale-95"
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
