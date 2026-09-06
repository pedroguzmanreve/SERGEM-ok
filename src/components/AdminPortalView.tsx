import React, { useState } from 'react';
import {
  Employee,
  UserRole,
  WeeklySchedule,
  DriverAttendanceRecord,
  ClientOrderReport,
} from '../types/payroll';
import { InviteEmailModal } from './InviteEmailModal';
import { buildEmployeeInvite, dispatchNativeEmailInvite } from '../services/emailInviteService';
import { UnconnectedDriversSection } from './UnconnectedDriversSection';
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
  Trash2,
  AlertTriangle,
  ExternalLink,
  Smartphone,
  Send,
  RefreshCw,
} from 'lucide-react';

interface AdminPortalViewProps {
  employees: Employee[];
  schedules?: WeeklySchedule[];
  attendanceRecords?: DriverAttendanceRecord[];
  clientReports?: ClientOrderReport[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onWipeDatabase?: () => Promise<void>;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  employees,
  schedules = [],
  attendanceRecords = [],
  clientReports = [],
  onAddEmployee,
  onUpdateEmployee,
  onWipeDatabase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Email Modal State
  const [emailModalEmployee, setEmailModalEmployee] = useState<Employee | null>(null);
  const [isNewInviteModal, setIsNewInviteModal] = useState(false);

  // Database Wipe State
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeSuccessMsg, setWipeSuccessMsg] = useState('');

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
    const jefeAsignado = employees.find((j) => j.id === emp.jefeZonaId);
    const details = buildEmployeeInvite(emp, jefeAsignado ? `${jefeAsignado.nombre} ${jefeAsignado.apellido}` : undefined);
    navigator.clipboard.writeText(details.inviteUrl);
    setCopiedId(emp.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenEmailModal = (emp: Employee) => {
    setEmailModalEmployee(emp);
    setIsNewInviteModal(false);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newEmp: Employee = {
      id: `EMP-${Date.now().toString().slice(-4)}`,
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
      jefeZonaId: rol === 'Repartidor' ? (jefeZonaId || undefined) : undefined,
      email,
      telefono: telefono || undefined,
      estadoInvitacion: 'Invitado',
    };

    // 1. Save to Firestore
    onAddEmployee(newEmp);

    // 2. Build details and dispatch email invitation via native client automatically
    const jefeAsignado = employees.find((j) => j.id === newEmp.jefeZonaId);
    const inviteDetails = buildEmployeeInvite(newEmp, jefeAsignado ? `${jefeAsignado.nombre} ${jefeAsignado.apellido}` : undefined);
    dispatchNativeEmailInvite(inviteDetails);

    // 3. Open Email Modal with options to send to Gmail, Outlook, or WhatsApp
    setEmailModalEmployee(newEmp);
    setIsNewInviteModal(true);

    setIsInviteModalOpen(false);
    resetForm();
  };

  const handleExecuteWipe = async () => {
    if (!onWipeDatabase) return;
    try {
      setIsWiping(true);
      await onWipeDatabase();
      setShowWipeModal(false);
      setWipeSuccessMsg('¡Base de datos limpiada con éxito! Todos los registros han sido vaciados y está lista para datos reales.');
      setTimeout(() => setWipeSuccessMsg(''), 6000);
    } catch (err) {
      console.error('Error al limpiar base de datos:', err);
    } finally {
      setIsWiping(false);
    }
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
      {/* Success Notification Alert */}
      {wipeSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{wipeSuccessMsg}</span>
          </div>
          <button
            onClick={() => setWipeSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-black px-2 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
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
            Invita nuevos colaboradores, envía invitaciones por correo electrónico oficial, asigna roles obligatorios y gestiona la estructura operativa de SERGEM S.A.S.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 lg:pt-0">
          {/* Wipe Database Button */}
          {onWipeDatabase && (
            <button
              id="btn-wipe-database"
              onClick={() => setShowWipeModal(true)}
              className="bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-300 font-bold px-4 py-3 rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer whitespace-nowrap active:scale-95 text-xs"
              title="Vaciar todos los registros de la base de datos de Firebase"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Limpiar Base de Datos</span>
            </button>
          )}

          {/* Invite Collaborator Button */}
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

      {/* Operational Attendance & Connectivity Notification Section */}
      <UnconnectedDriversSection
        employees={employees}
        schedules={schedules}
        attendanceRecords={attendanceRecords}
        clientReports={clientReports}
        variant="admin-notification"
        title="🔔 Notificación Operacional: Repartidores Sin Conectar a su Turno"
        subtitle="Supervisión de inicio de jornada laboral para el día de hoy. Permite comunicarse de inmediato con el colaborador mediante llamada telefónica o WhatsApp."
      />

      {/* Role Counter Stat Cards */}
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar colaborador, cédula o placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Rol:</span>
          </span>
          {['TODOS', 'Administrativo', 'Jefe de Zona', 'Jefe de Operaciones', 'Repartidor'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                roleFilter === role
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {role === 'TODOS' ? 'Todos' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
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
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-100/90 text-slate-600 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Colaborador</th>
                <th className="py-3.5 px-4">Rol Obligatorio</th>
                <th className="py-3.5 px-4">Placa Vehículo</th>
                <th className="py-3.5 px-4">Jefe de Zona</th>
                <th className="py-3.5 px-4">Contacto</th>
                <th className="py-3.5 px-4 text-center">Estado Invitación</th>
                <th className="py-3.5 px-5 text-right">Acciones de Invitación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-800">
                        {employees.length === 0 ? 'Base de datos limpia y lista' : 'No se encontraron colaboradores'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {employees.length === 0
                          ? 'No hay colaboradores registrados en la base de datos de Firebase. Haz clic en "+ Invitar Nuevo Colaborador" para registrar e invitar por correo a tu primer colaborador real.'
                          : 'No hay colaboradores que coincidan con la búsqueda o filtro.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {filteredEmployees.map((emp) => {
                const jefeAsignado = employees.find((j) => j.id === emp.jefeZonaId);
                const isInvitado = emp.estadoInvitacion === 'Invitado';

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
                        <div className="font-semibold text-slate-800 truncate">{emp.email || 'Sin correo registrado'}</div>
                        <div className="text-slate-500 text-[11px] font-medium">{emp.telefono || 'Sin teléfono'}</div>
                      </div>
                    </td>

                    {/* Estado Invitación */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border whitespace-nowrap ${
                          isInvitado
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {isInvitado ? (
                          <>
                            <Mail className="w-3 h-3 mr-1 text-amber-600" />
                            <span>Invitado</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            <span>Activo</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Acciones de Invitación */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Send / Resend Email Button */}
                        <button
                          onClick={() => handleOpenEmailModal(emp)}
                          title="Enviar o reenviar invitación por correo electrónico"
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 rounded-xl transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Mail className="w-3.5 h-3.5 text-red-600" />
                          <span>Enviar Correo</span>
                        </button>

                        {/* Copy Direct Link */}
                        <button
                          onClick={() => handleCopyInviteLink(emp)}
                          title="Copiar enlace directo de invitación"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300/70 text-slate-700 rounded-xl transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer active:scale-95 shadow-2xs"
                        >
                          {copiedId === emp.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-extrabold">¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-600" />
                              <span>Enlace</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Employee Modal Form */}
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
                  <p className="text-[11px] text-slate-500 font-medium">Asignar rol y despachar invitación por correo</p>
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
                  <label className="block font-bold text-slate-700 mb-1">Correo Electrónico (para invitación) *</label>
                  <input
                    type="email"
                    required
                    placeholder="empleado@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono / Celular (WhatsApp)</label>
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
                        Asignar Jefe de Zona
                      </label>
                      <select
                        value={jefeZonaId}
                        onChange={(e) => setJefeZonaId(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                      >
                        {jefesDeZona.length === 0 ? (
                          <option value="">(Sin jefes de zona creados aún - asignar después)</option>
                        ) : (
                          <>
                            <option value="">-- Seleccionar Jefe de Zona --</option>
                            {jefesDeZona.map((jefe) => (
                              <option key={jefe.id} value={jefe.id}>
                                {jefe.nombre} {jefe.apellido} ({jefe.cargo})
                              </option>
                            ))}
                          </>
                        )}
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

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-950 text-xs flex items-center space-x-2">
                <Mail className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  Al hacer clic en <strong>"Guardar y Enviar Invitación por Correo"</strong>, se registrará el colaborador en Firebase y se abrirá el despacho del correo oficial con la plantilla lista.
                </span>
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
                  <Send className="w-4 h-4" />
                  <span>Guardar y Enviar Invitación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Wipe Database */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">¿Limpiar toda la Base de Datos?</h3>
                <p className="text-xs text-rose-600 font-bold">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Se eliminarán todos los registros de <strong>empleados, programaciones semanales de turnos, novedades operativas y reportes de clientes</strong> de Firebase Firestore, dejando el sistema completamente en blanco y listo para ingresar datos reales.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={isWiping}
                onClick={() => setShowWipeModal(false)}
                className="px-4 py-2 font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isWiping}
                onClick={handleExecuteWipe}
                className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 flex items-center space-x-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isWiping ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Limpiando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Vaciar Base de Datos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Invite Modal */}
      {emailModalEmployee && (
        <InviteEmailModal
          employee={emailModalEmployee}
          jefeZonaName={
            employees.find((j) => j.id === emailModalEmployee.jefeZonaId)
              ? `${employees.find((j) => j.id === emailModalEmployee.jefeZonaId)?.nombre} ${employees.find((j) => j.id === emailModalEmployee.jefeZonaId)?.apellido}`
              : undefined
          }
          isOpen={true}
          onClose={() => {
            setEmailModalEmployee(null);
            setIsNewInviteModal(false);
          }}
          isNewInvite={isNewInviteModal}
        />
      )}
    </div>
  );
};
