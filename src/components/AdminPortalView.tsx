import React, { useState, useMemo } from 'react';
import { Employee, UserRole, WeeklySchedule, DriverDailyAttendance } from '../types/payroll';
import {
  Users,
  UserPlus,
  Mail,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Copy,
  Check,
  Edit2,
  X,
  UserCheck,
  Briefcase,
  Sparkles,
  Building2,
  Phone,
  PhoneCall,
  MessageCircle,
  AlertTriangle,
  Radio,
  ExternalLink
} from 'lucide-react';
import { ContactDriverModal } from './ContactDriverModal';

interface AdminPortalViewProps {
  employees: Employee[];
  schedules?: WeeklySchedule[];
  attendanceMap?: Record<string, DriverDailyAttendance>;
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onRecordContact?: (
    employeeId: string,
    tipo: 'WhatsApp' | 'Llamada',
    mensaje?: string,
    respuesta?: string
  ) => void;
  onMarkShiftStarted?: (employeeId: string) => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  employees,
  schedules = [],
  attendanceMap = {},
  onAddEmployee,
  onUpdateEmployee,
  onRecordContact,
  onMarkShiftStarted,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contactingDriver, setContactingDriver] = useState<{
    employee: Employee;
    attendance?: DriverDailyAttendance;
  } | null>(null);

  // Form State for Invitations
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState<UserRole>('Repartidor');
  const [placaVehiculo, setPlacaVehiculo] = useState('');
  const [jefeZonaId, setJefeZonaId] = useState('');
  const [cargo, setCargo] = useState('Repartidor Motorizado');
  const [departamento, setDepartamento] = useState<any>('Operaciones y Mensajería');
  const [salarioBase, setSalarioBase] = useState('1423500');

  // Quick Action Handlers for Direct WhatsApp and Calling
  const handleQuickWhatsApp = (emp: Employee, att?: DriverDailyAttendance) => {
    const rawPhone = emp.telefono || '3000000000';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const waPhone = cleanDigits.length === 10 ? `57${cleanDigits}` : cleanDigits;
    const clientName = att?.clienteNombre || 'Sede Asignada SERGEM';
    const startTime = att?.horaInicioProgramada || '07:00 AM';

    const defaultMsg = `¡Hola ${emp.nombre}! Te saludamos de SERGEM S.A.S. Te recordamos que tu turno de hoy con el cliente "${clientName}" estaba programado para iniciar a las ${startTime}. En nuestro sistema registramos que aún no has iniciado tu turno en el portal. Por favor ingresa a registrar tu jornada o comunícate de inmediato con nosotros si presentas alguna novedad.`;

    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(defaultMsg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    if (onRecordContact) {
      onRecordContact(emp.id, 'WhatsApp', defaultMsg);
    }
  };

  const handleQuickCall = (emp: Employee) => {
    const cleanDigits = (emp.telefono || '').replace(/\D/g, '');
    window.location.href = `tel:${cleanDigits}`;

    if (onRecordContact) {
      onRecordContact(emp.id, 'Llamada', 'Llamada telefónica directa efectuada desde Portal Administrativo');
    }
  };

  // Compute Live Drivers for Today
  const driversAttendanceSummary = useMemo(() => {
    const repartidores = employees.filter((e) => e.activo && e.rol === 'Repartidor');
    
    const unstarted: { employee: Employee; attendance?: DriverDailyAttendance }[] = [];
    const connected: { employee: Employee; attendance?: DriverDailyAttendance }[] = [];
    const offDuty: { employee: Employee; attendance?: DriverDailyAttendance }[] = [];

    repartidores.forEach((rep) => {
      const att = attendanceMap[rep.id];
      if (att) {
        if (att.estado === 'INICIADO') {
          connected.push({ employee: rep, attendance: att });
        } else if (att.estado === 'PENDIENTE_INICIO') {
          unstarted.push({ employee: rep, attendance: att });
        } else {
          offDuty.push({ employee: rep, attendance: att });
        }
      } else {
        // Look up if has schedule for Monday
        const sched = schedules.find((s) => s.repartidorId === rep.id);
        const shiftToday = sched?.dias['Lunes'];
        if (shiftToday && shiftToday.tipo !== 'Descanso') {
          unstarted.push({
            employee: rep,
            attendance: {
              repartidorId: rep.id,
              diaSemana: 'Lunes',
              fecha: '2026-08-03',
              estado: 'PENDIENTE_INICIO',
              horaInicioProgramada: shiftToday.horaInicio1 || '07:00',
              horaFinProgramada: shiftToday.horaFin1 || '15:00',
              clienteNombre: shiftToday.clienteNombre || 'Cliente Asignado',
              minutosRetraso: 15,
            },
          });
        } else {
          offDuty.push({ employee: rep });
        }
      }
    });

    return { unstarted, connected, offDuty, totalDrivers: repartidores.length };
  }, [employees, schedules, attendanceMap]);

  // Available Jefes de Zona
  const jefesDeZona = employees.filter((e) => e.rol === 'Jefe de Zona');

  // Filtered List
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      `${emp.nombre} ${emp.apellido} ${emp.cedula} ${emp.placaVehiculo || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'TODOS' || emp.rol === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCopyInviteLink = (emp: Employee) => {
    const link = `https://sergem.app/invitacion?token=INV-${emp.id}-${Date.now().toString().slice(-6)}`;
    navigator.clipboard.writeText(link);
    setCopiedId(emp.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newEmp: Employee = {
      id: `EMP-${(employees.length + 1).toString().padStart(3, '0')}`,
      cedula,
      nombre,
      apellido,
      cargo: cargo || (rol === 'Repartidor' ? 'Repartidor Urbano' : rol),
      departamento,
      salarioBase: parseFloat(salarioBase) || 1423500,
      tipoContrato: 'Término Indefinido',
      nivelRiesgoARL: rol === 'Repartidor' ? 4 : 1,
      fechaIngreso: new Date().toISOString().slice(0, 10),
      banco: 'Bancolombia',
      tipoCuenta: 'Ahorros',
      numeroCuenta: '300-000000-00',
      eps: 'Sura EPS',
      afp: 'Protección',
      ccf: 'Comfandi',
      activo: true,
      rol,
      placaVehiculo: placaVehiculo.toUpperCase() || undefined,
      jefeZonaId: rol === 'Repartidor' ? jefeZonaId : undefined,
      email,
      telefono,
      estadoInvitacion: 'Invitado',
    };

    onAddEmployee(newEmp);
    setIsInviteModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNombre('');
    setApellido('');
    setCedula('');
    setEmail('');
    setTelefono('');
    setRol('Repartidor');
    setPlacaVehiculo('');
    setJefeZonaId('');
    setCargo('Repartidor Motorizado');
    setSalarioBase('1423500');
  };

  return (
    <div id="admin-portal-view" className="space-y-6">
      {/* Header Banner - Light Slate Grey Premium Design */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/60 text-slate-900 rounded-2xl p-7 md:p-8 shadow-xs border border-slate-300/80 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-white border border-slate-300/80 text-red-700 font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-red-600" />
            <span>Módulo de Control Administrativo</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Portal de Administración & Invitaciones
          </h2>
          <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
            Invita nuevos colaboradores, asigna roles obligatorios (Administrativo, Jefe de Zona, Jefe de Operaciones, Repartidores) y gestiona la estructura de Jefes de Zona de SERGEM S.A.S.
          </p>
        </div>

        <div className="shrink-0 pt-2 lg:pt-0">
          <button
            id="btn-invite-employee"
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center space-x-2.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 border border-red-500/20 text-xs md:text-sm"
          >
            <UserPlus className="w-4.5 h-4.5" />
            <span>Invitar Nuevo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Role Counter Stat Cards - Compact Size */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            role: 'Administrativo' as UserRole,
            title: 'Administrativos',
            count: employees.filter((e) => e.rol === 'Administrativo').length,
            badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
            borderAccent: 'border-l-4 border-l-purple-600',
            icon: Building2,
            iconColor: 'text-purple-600',
          },
          {
            role: 'Jefe de Zona' as UserRole,
            title: 'Jefes de Zona',
            count: employees.filter((e) => e.rol === 'Jefe de Zona').length,
            badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            borderAccent: 'border-l-4 border-l-indigo-600',
            icon: ShieldCheck,
            iconColor: 'text-indigo-600',
          },
          {
            role: 'Jefe de Operaciones' as UserRole,
            title: 'Jefes de Operaciones',
            count: employees.filter((e) => e.rol === 'Jefe de Operaciones').length,
            badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
            borderAccent: 'border-l-4 border-l-amber-500',
            icon: Briefcase,
            iconColor: 'text-amber-600',
          },
          {
            role: 'Repartidor' as UserRole,
            title: 'Repartidores',
            count: employees.filter((e) => e.rol === 'Repartidor').length,
            badgeBg: 'bg-red-100 text-red-800 border-red-200',
            borderAccent: 'border-l-4 border-l-red-600',
            icon: Truck,
            iconColor: 'text-red-600',
          },
        ].map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.role}
              className={`bg-white rounded-xl p-4 shadow-xs border border-slate-200 hover:shadow-sm transition-all flex flex-col justify-between ${stat.borderAccent}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  {stat.title}
                </span>
                <div className={`p-1.5 rounded-lg ${stat.badgeBg} border shadow-2xs`}>
                  <IconComponent className={`w-3.5 h-3.5 ${stat.iconColor}`} />
                </div>
              </div>

              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {stat.count}
                </span>
                <span className="text-xs text-slate-500 font-medium">colaboradores</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Shift Connection & Attendance Monitoring Panel (Hoy) */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Monitoreo de Asistencia & Conexión en Vivo (Hoy)
                </h3>
                <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                  En Tiempo Real
                </span>
              </div>
              <p className="text-slate-500 text-xs font-medium">
                Control de repartidores con turnos programados del día en curso. Notifica por WhatsApp o llama de inmediato a quienes no han iniciado jornada.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Conectados: <strong>{driversAttendanceSummary.connected.length}</strong></span>
            </span>
            <span className="bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Sin Iniciar: <strong>{driversAttendanceSummary.unstarted.length}</strong></span>
            </span>
          </div>
        </div>

        {/* Unstarted Drivers Alert Cards */}
        {driversAttendanceSummary.unstarted.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-amber-900 bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl">
              <div className="flex items-center space-x-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {driversAttendanceSummary.unstarted.length} repartidor(es) tienen turno asignado hoy y <u>aún no han iniciado jornada</u> en el portal.
                </span>
              </div>
              <span className="text-[11px] font-medium text-amber-700 hidden md:inline-block">
                Comunícate de inmediato vía WhatsApp o llamada
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {driversAttendanceSummary.unstarted.map(({ employee: rep, attendance: att }) => {
                const rawPhone = rep.telefono || 'Sin teléfono';
                const startTime = att?.horaInicioProgramada || '07:00 AM';
                const clientName = att?.clienteNombre || 'Sede asignada';
                const delayMin = att?.minutosRetraso || 15;

                return (
                  <div
                    key={rep.id}
                    className="bg-white border-2 border-red-200/90 hover:border-red-400 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center">
                            {rep.nombre.charAt(0)}{rep.apellido.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs">
                              {rep.nombre} {rep.apellido}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              C.C. {rep.cedula}
                            </div>
                          </div>
                        </div>

                        {rep.placaVehiculo && (
                          <span className="font-mono font-black text-[11px] text-slate-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            {rep.placaVehiculo}
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-1 text-[11px]">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="font-medium text-slate-500">Cliente:</span>
                          <span className="font-bold text-slate-900 truncate max-w-[150px]">{clientName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="font-medium text-slate-500">Hora Turno:</span>
                          <span className="font-bold text-red-700 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-red-600" />
                            {startTime}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-500">Estado:</span>
                          <span className="font-black text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded text-[10px] uppercase">
                            Retraso (+{delayMin} min)
                          </span>
                        </div>
                      </div>

                      {att?.ultimoContacto && (
                        <div className="mt-2 text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded truncate">
                          Último contacto: {att.ultimoContacto.tipo} ({att.ultimoContacto.fechaHora})
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for this driver */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleQuickWhatsApp(rep, att)}
                        title="Enviar mensaje WhatsApp"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-2.5 rounded-lg flex items-center justify-center space-x-1.5 text-xs transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => handleQuickCall(rep)}
                        title="Llamar directamente por teléfono"
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-2.5 rounded-lg flex items-center justify-center space-x-1.5 text-xs transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Llamar</span>
                      </button>

                      <button
                        onClick={() => setContactingDriver({ employee: rep, attendance: att })}
                        className="col-span-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-1.5 rounded-lg text-[11px] transition-all cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <span>Opciones & Plantillas de Mensaje</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>Todos los repartidores programados para hoy han iniciado su turno satisfactoriamente.</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">100% de cumplimiento en jornada</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar colaborador, cédula o placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-slate-400 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Filtrar Rol:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-hidden cursor-pointer pl-1"
            >
              <option value="TODOS">Todos los Roles</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Jefe de Zona">Jefe de Zona</option>
              <option value="Jefe de Operaciones">Jefe de Operaciones</option>
              <option value="Repartidor">Repartidores</option>
            </select>
          </div>

          <div className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
            Total: <span className="text-red-700 font-black">{filteredEmployees.length}</span>
          </div>
        </div>
      </div>

      {/* Directory Table - Well-Distributed Layout & Spacing */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/90 flex justify-between items-center">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center border border-red-200">
              <Users className="w-4 h-4" />
            </div>
            <span>Directorio Oficial de Colaboradores</span>
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {filteredEmployees.length} {filteredEmployees.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead className="bg-slate-100/90 text-slate-600 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Colaborador</th>
                <th className="py-3.5 px-4">Rol Obligatorio</th>
                <th className="py-3.5 px-4">Placa Vehículo</th>
                <th className="py-3.5 px-4">Jefe de Zona</th>
                <th className="py-3.5 px-4">Contacto Directo</th>
                <th className="py-3.5 px-4 text-center">Estado / Jornada Hoy</th>
                <th className="py-3.5 px-5 text-right">Acciones & Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="font-extrabold text-sm text-slate-700">No hay colaboradores registrados aún</div>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Haz clic en "Invitar Nuevo Colaborador" para registrar miembros del equipo (Administrativos, Jefes de Zona, Jefes de Operaciones y Repartidores).
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const jefeAsignado = employees.find((j) => j.id === emp.jefeZonaId);
                  const att = attendanceMap[emp.id];

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/90 transition-colors">
                    {/* Colaborador */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                          {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight truncate">
                            {emp.nombre} {emp.apellido}
                          </div>
                          <div className="text-slate-500 text-[11px] font-medium">
                            C.C. {emp.cedula} <span className="text-slate-300 mx-1">•</span> <span className="text-slate-600 font-semibold">{emp.cargo}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap ${
                          emp.rol === 'Administrativo'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : emp.rol === 'Jefe de Zona'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : emp.rol === 'Jefe de Operaciones'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        {emp.rol}
                      </span>
                    </td>

                    {/* Placa */}
                    <td className="py-3.5 px-4">
                      {emp.placaVehiculo ? (
                        <span className="inline-flex items-center space-x-1.5 font-mono font-black text-slate-800 bg-amber-50 border border-amber-200/90 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap">
                          <Truck className="w-3.5 h-3.5 text-amber-700" />
                          <span>{emp.placaVehiculo}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No aplica</span>
                      )}
                    </td>

                    {/* Jefe de Zona */}
                    <td className="py-3.5 px-4">
                      {emp.rol === 'Repartidor' ? (
                        jefeAsignado ? (
                          <div className="inline-flex items-center space-x-1.5 text-slate-800 font-semibold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{jefeAsignado.nombre} {jefeAsignado.apellido}</span>
                          </div>
                        ) : (
                          <span className="text-amber-800 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-xs inline-block whitespace-nowrap">
                            Sin Jefe Asignado
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">N/A</span>
                      )}
                    </td>

                    {/* Contacto */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 text-xs">
                        <div className="font-semibold text-slate-800 truncate">{emp.email || 'correo@sergemsas.com'}</div>
                        <div className="text-slate-700 font-mono font-bold text-[11px] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{emp.telefono || 'Sin teléfono'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Estado / Conexión Hoy */}
                    <td className="py-3.5 px-4 text-center">
                      {emp.rol === 'Repartidor' ? (
                        att?.estado === 'INICIADO' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border whitespace-nowrap bg-emerald-50 text-emerald-800 border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            En Turno ({att.horaConexionReal || 'Conectado'})
                          </span>
                        ) : att?.estado === 'PENDIENTE_INICIO' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border whitespace-nowrap bg-amber-100 text-amber-900 border-amber-300 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-700" />
                            Sin Iniciar ({att.horaInicioProgramada || '07:00'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border whitespace-nowrap bg-slate-100 text-slate-700 border-slate-300">
                            Activo
                          </span>
                        )
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border whitespace-nowrap ${
                            emp.estadoInvitacion === 'Activo' || emp.activo
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          {emp.estadoInvitacion || 'Activo'}
                        </span>
                      )}
                    </td>

                    {/* Acciones & Contacto */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {emp.rol === 'Repartidor' && (
                          <>
                            <button
                              onClick={() => handleQuickWhatsApp(emp, att)}
                              title="Enviar WhatsApp al Repartidor"
                              className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleQuickCall(emp)}
                              title="Llamar directamente al teléfono"
                              className="p-2 bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-300/80 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                            >
                              <PhoneCall className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setContactingDriver({ employee: emp, attendance: att })}
                              title="Ver plantillas y detalles de contacto"
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 rounded-xl transition-all text-[11px] font-bold cursor-pointer active:scale-95 shadow-2xs"
                            >
                              Contactar
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleCopyInviteLink(emp)}
                          title="Copiar enlace de invitación"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300/70 text-slate-700 rounded-xl transition-all flex items-center space-x-1 text-[11px] font-bold cursor-pointer active:scale-95 shadow-2xs"
                        >
                          {copiedId === emp.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-extrabold">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-600" />
                              <span>Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Employee Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-50/90 text-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 border border-red-200/80 flex items-center justify-center">
                  <UserPlus className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Invitar Nuevo Colaborador</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Asignar rol y generar enlace de registro</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Basic Datos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre(s) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Carlos"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apellido(s) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Pérez Ramírez"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cédula de Ciudadanía *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 1144089234"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    placeholder="empleado@sergemsas.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    placeholder="315 000 0000"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rol Obligatorio *</label>
                  <select
                    required
                    value={rol}
                    onChange={(e) => setRol(e.target.value as UserRole)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  >
                    <option value="Repartidor">Repartidor</option>
                    <option value="Jefe de Zona">Jefe de Zona</option>
                    <option value="Jefe de Operaciones">Jefe de Operaciones</option>
                    <option value="Administrativo">Administrativo</option>
                  </select>
                </div>
              </div>

              {/* Vehicle plate (Optional) & Jefe de Zona assignment for Repartidor */}
              {rol === 'Repartidor' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">
                    Configuración de Operación para Repartidores:
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Placa del Vehículo (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. VTX-89D"
                        value={placaVehiculo}
                        onChange={(e) => setPlacaVehiculo(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs uppercase font-mono font-bold bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Asignar Jefe de Zona *
                      </label>
                      <select
                        required
                        value={jefeZonaId}
                        onChange={(e) => setJefeZonaId(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                      >
                        <option value="">-- Seleccionar Jefe de Zona --</option>
                        {jefesDeZona.map((jefe) => (
                          <option key={jefe.id} value={jefe.id}>
                            {jefe.nombre} {jefe.apellido} ({jefe.cargo})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial & Contract basics */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargo</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-xs bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Salario Base ($ COP)</label>
                  <input
                    type="number"
                    value={salarioBase}
                    onChange={(e) => setSalarioBase(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs font-bold bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2.5 font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 flex items-center space-x-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Mail className="w-4 h-4" />
                  <span>Enviar Invitación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Contact Driver Modal */}
      {contactingDriver && (
        <ContactDriverModal
          employee={contactingDriver.employee}
          attendance={contactingDriver.attendance}
          callerRole="Administrativo"
          callerName="Administración SERGEM S.A.S."
          onClose={() => setContactingDriver(null)}
          onRecordContact={onRecordContact}
          onMarkShiftStarted={onMarkShiftStarted}
        />
      )}
    </div>
  );
};
