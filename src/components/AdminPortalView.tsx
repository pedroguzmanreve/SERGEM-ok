import React, { useState, useEffect } from 'react';
import {
  Employee,
  UserRole,
  WeeklySchedule,
  DriverAttendanceRecord,
  ClientOrderReport,
} from '../types/payroll';
import {
  buildEmployeeInvite,
  sendAutomaticInviteEmail,
  checkEmailServerConfig,
} from '../services/emailInviteService';
import { saveInvitationRecord, queueFirestoreMail } from '../services/firestoreService';
import { UnconnectedDriversSection } from './UnconnectedDriversSection';
import { BulkInviteContent } from './BulkInviteModal';

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
  ExternalLink,
  Smartphone,
  Send,
  RefreshCw,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

interface AdminPortalViewProps {
  employees: Employee[];
  schedules?: WeeklySchedule[];
  attendanceRecords?: DriverAttendanceRecord[];
  clientReports?: ClientOrderReport[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  employees,
  schedules = [],
  attendanceRecords = [],
  clientReports = [],
  onAddEmployee,
  onUpdateEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState<'manual' | 'bulk'>('manual');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Automatic Dispatch Notification State
  const [autoSendNotice, setAutoSendNotice] = useState<{
    status: 'success' | 'warning' | 'sending';
    email: string;
    name: string;
    role: string;
    inviteUrl: string;
    message: string;
    provider?: string;
    gmailUrl?: string;
    outlookUrl?: string;
    whatsappUrl?: string;
  } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailServerStatus, setEmailServerStatus] = useState<{
    checked: boolean;
    configured: boolean;
    provider: string;
    senderEmail?: string;
  }>({ checked: false, configured: false, provider: 'none' });

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

  // Verify backend email status on load
  useEffect(() => {
    checkEmailServerConfig().then((res) => {
      setEmailServerStatus({
        checked: true,
        configured: res.configured,
        provider: res.provider,
        senderEmail: res.senderEmail,
      });
    });
  }, []);

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

  const handleAutoDispatchInvite = async (emp: Employee) => {
    setIsSendingEmail(true);
    setAutoSendNotice({
      status: 'sending',
      email: emp.email || '',
      name: `${emp.nombre} ${emp.apellido}`,
      role: emp.rol,
      inviteUrl: '',
      message: 'Conectando con el servidor de correo para despachar invitación...',
    });

    const jefeAsignado = employees.find((j) => j.id === emp.jefeZonaId);
    const jefeName = jefeAsignado ? `${jefeAsignado.nombre} ${jefeAsignado.apellido}` : undefined;

    // 1. Send via server API (SMTP / Resend)
    const result = await sendAutomaticInviteEmail(emp, jefeName);

    // 2. Queue in Firestore 'mail' collection (Firebase Trigger Email extension)
    if (emp.email) {
      await queueFirestoreMail({
        to: emp.email,
        subject: result.details.subject,
        text: result.details.bodyText,
      });
    }

    // 3. Save invitation record in Firestore 'invitations'
    await saveInvitationRecord({
      id: `INV-${emp.id}`,
      employeeId: emp.id,
      recipientEmail: emp.email || '',
      recipientName: `${emp.nombre} ${emp.apellido}`,
      role: emp.rol,
      portal: result.details.portal,
      inviteUrl: result.details.inviteUrl,
      status: 'Enviada',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // 4. Update employee state
    const updatedEmp: Employee = {
      ...emp,
      estadoInvitacion: 'Enviada',
    };
    onUpdateEmployee(updatedEmp);
    setIsSendingEmail(false);

    // 5. Update UI feedback
    if (result.success) {
      setAutoSendNotice({
        status: 'success',
        email: emp.email || '',
        name: `${emp.nombre} ${emp.apellido}`,
        role: emp.rol,
        inviteUrl: result.details.inviteUrl,
        message: result.message,
        provider: result.provider,
        gmailUrl: result.details.gmailUrl,
        outlookUrl: result.details.outlookUrl,
        whatsappUrl: result.details.whatsappUrl,
      });
      setTimeout(() => setAutoSendNotice(null), 9000);
    } else {
      setAutoSendNotice({
        status: 'warning',
        email: emp.email || '',
        name: `${emp.nombre} ${emp.apellido}`,
        role: emp.rol,
        inviteUrl: result.details.inviteUrl,
        message: result.message,
        gmailUrl: result.details.gmailUrl,
        outlookUrl: result.details.outlookUrl,
        whatsappUrl: result.details.whatsappUrl,
      });
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
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
      estadoInvitacion: 'Enviada',
    };

    // 1. Save collaborator to Firestore
    onAddEmployee(newEmp);

    setIsInviteModalOpen(false);
    resetForm();

    // 2. Dispatch invitation via server and save invitation records
    await handleAutoDispatchInvite(newEmp);
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
      {/* Automatic Invite Dispatch Alert */}
      {autoSendNotice && (
        <div
          className={`p-4 md:p-5 rounded-2xl border shadow-xs animate-in fade-in transition-all ${
            autoSendNotice.status === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : autoSendNotice.status === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-blue-50 border-blue-300 text-blue-950'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  autoSendNotice.status === 'success'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : autoSendNotice.status === 'warning'
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}
              >
                {autoSendNotice.status === 'sending' ? (
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                ) : autoSendNotice.status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Mail className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div className="space-y-1">
                <p className="font-black text-sm md:text-base">
                  {autoSendNotice.status === 'success' && '¡Correo Oficial Enviado al Destinatario!'}
                  {autoSendNotice.status === 'sending' && 'Enviando invitación por correo electrónico...'}
                  {autoSendNotice.status === 'warning' && 'Invitación Registrada en el Sistema'}
                </p>
                <p className="text-xs leading-relaxed opacity-90 max-w-3xl">
                  {autoSendNotice.status === 'success' && (
                    <span>
                      Se despachó el correo oficial a <strong>{autoSendNotice.email}</strong> para <strong>{autoSendNotice.name}</strong> ({autoSendNotice.role}). Llegará directamente a su bandeja de entrada o spam.
                    </span>
                  )}
                  {autoSendNotice.status === 'sending' && (
                    <span>
                      Procesando envío hacia <strong>{autoSendNotice.email}</strong>...
                    </span>
                  )}
                  {autoSendNotice.status === 'warning' && (
                    <span>
                      El colaborador <strong>{autoSendNotice.name}</strong> ({autoSendNotice.email}) quedó registrado con rol <strong>{autoSendNotice.role}</strong>. Para que le llegue de inmediato a su correo sin esperar la activación del servicio SMTP en segundo plano, haz clic en enviar por Gmail u Outlook:
                    </span>
                  )}
                </p>

                {/* Direct 1-Click Action Buttons for Immediate Delivery */}
                {autoSendNotice.status === 'warning' && (
                  <div className="pt-2.5 flex flex-wrap items-center gap-2">
                    {autoSendNotice.gmailUrl && (
                      <a
                        href={autoSendNotice.gmailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Despachar con Gmail Web</span>
                      </a>
                    )}
                    {autoSendNotice.outlookUrl && (
                      <a
                        href={autoSendNotice.outlookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Despachar con Outlook Web</span>
                      </a>
                    )}
                    {autoSendNotice.whatsappUrl && (
                      <a
                        href={autoSendNotice.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Enviar por WhatsApp</span>
                      </a>
                    )}
                    {autoSendNotice.inviteUrl && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(autoSendNotice.inviteUrl);
                          setCopiedId('notice-copy');
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-xl text-xs font-bold shadow-2xs hover:bg-amber-100/60 cursor-pointer active:scale-95 transition-all"
                      >
                        {copiedId === 'notice-copy' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === 'notice-copy' ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setAutoSendNotice(null)}
              className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer shrink-0"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/60 text-slate-900 rounded-2xl p-7 md:p-8 shadow-xs border border-slate-300/80 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center space-x-2 bg-white border border-slate-300/80 text-red-700 font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-red-600" />
              <span>Módulo de Control Administrativo</span>
            </div>

            {/* Email Server Status Chip */}
            {emailServerStatus.configured ? (
              <div className="inline-flex items-center space-x-1.5 bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Despacho Automático: {emailServerStatus.provider.toUpperCase()} Activo</span>
              </div>
            ) : (
              <div
                className="inline-flex items-center space-x-1.5 bg-amber-100/80 border border-amber-300 text-amber-950 text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs"
                title="Para despacho 100% autónomo por SMTP sin clics, configure SMTP_USER y SMTP_PASS o RESEND_API_KEY en variables de entorno"
              >
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Despacho Directo & 1-Clic</span>
              </div>
            )}
          </div>

          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Portal de Administración & Invitaciones
          </h2>
          <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
            Invita nuevos colaboradores, asigna roles y turnos, y gestiona la estructura de SERGEM S.A.S. con despacho de enlaces a su correo y sincronización en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 lg:pt-0">
          {/* Invite Collaborator Button (Unified with Manual Form, Bulk Upload & Template Download) */}
          <button
            id="btn-invite-employee"
            onClick={() => {
              setInviteTab('manual');
              setIsInviteModalOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center space-x-2.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 border border-red-500/20 text-xs md:text-sm"
          >
            <UserPlus className="w-4.5 h-4.5" />
            <span>Invitar Colaborador</span>
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
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Send / Resend Email Button */}
                        <button
                          onClick={() => handleAutoDispatchInvite(emp)}
                          disabled={isSendingEmail}
                          title="Enviar enlace automáticamente por correo y registrar en el sistema"
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 rounded-xl transition-all flex items-center space-x-1 text-xs font-bold cursor-pointer active:scale-95 shadow-2xs disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5 text-red-600" />
                          <span>Enviar Enlace</span>
                        </button>

                        {/* Quick Gmail Direct Compose Button */}
                        {emp.email && (
                          <a
                            href={buildEmployeeInvite(emp).gmailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir redacción directa en Gmail con la plantilla oficial"
                            className="p-1.5 bg-red-100/60 hover:bg-red-200/80 border border-red-200 text-red-800 rounded-xl transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs"
                          >
                            <Mail className="w-3.5 h-3.5 text-red-700" />
                          </a>
                        )}

                        {/* Quick WhatsApp Direct Button */}
                        {emp.telefono && buildEmployeeInvite(emp).whatsappUrl && (
                          <a
                            href={buildEmployeeInvite(emp).whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Enviar enlace oficial por WhatsApp"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          </a>
                        )}

                        {/* Copy Direct Link */}
                        <button
                          onClick={() => handleCopyInviteLink(emp)}
                          title="Copiar enlace directo de invitación"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300/70 text-slate-700 rounded-xl transition-all flex items-center space-x-1 text-xs font-bold cursor-pointer active:scale-95 shadow-2xs"
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

      {/* Unified Invite Collaborator Modal (Individual Manual + Bulk Excel Upload + Download Template) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className={`bg-white rounded-3xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col transition-all duration-200 ${
              inviteTab === 'bulk' ? 'max-w-4xl' : 'max-w-2xl'
            }`}
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                  <UserPlus className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Invitar Colaboradores a la Plataforma
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    SERGEM S.A.S. • Registro y generación de enlaces oficiales de acceso
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Download Official Template inside the Modal */}
                <a
                  id="modal-link-download-template"
                  href="/Plantilla_Registro_Colaboradores_SERGEM.xlsx"
                  download="Plantilla_Registro_Colaboradores_SERGEM.xlsx"
                  className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  title="Descargar plantilla de Excel con ejemplos para Repartidor, Administrativo y Jefe de Zona"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Descargar Plantilla Excel</span>
                </a>

                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Segmented Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 pt-3 bg-slate-50/80 shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="tab-invite-manual"
                  onClick={() => setInviteTab('manual')}
                  className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
                    inviteTab === 'manual'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Registro Individual</span>
                </button>

                <button
                  type="button"
                  id="tab-invite-bulk"
                  onClick={() => setInviteTab('bulk')}
                  className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
                    inviteTab === 'bulk'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Carga Masiva (Excel)</span>
                </button>
              </div>

              {/* Mobile link for template */}
              <a
                href="/Plantilla_Registro_Colaboradores_SERGEM.xlsx"
                download="Plantilla_Registro_Colaboradores_SERGEM.xlsx"
                className="sm:hidden pb-3 text-xs font-bold text-emerald-700 flex items-center space-x-1 hover:text-emerald-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Plantilla</span>
              </a>
            </div>

            {/* Tab 1: Formulario Individual */}
            {inviteTab === 'manual' && (
              <form onSubmit={handleInviteSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                {/* Switcher Helper Banner */}
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs text-blue-900">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>¿Tienes una lista de varios colaboradores? Usa la carga masiva en Excel para subirlos todos en segundos.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInviteTab('bulk')}
                    className="font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer shrink-0 ml-3 whitespace-nowrap"
                  >
                    Carga Masiva →
                  </button>
                </div>

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

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs flex items-center space-x-2">
                  <Send className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Al registrar el colaborador con su correo, <strong>el enlace de invitación oficial se enviará automáticamente</strong> y quedará registrado en el sistema.
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
                    <span>Registrar y Enviar Enlace Automático</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Carga Masiva (Excel) */}
            {inviteTab === 'bulk' && (
              <div className="p-6 overflow-y-auto flex-1">
                <BulkInviteContent
                  existingEmployees={employees}
                  onAddEmployee={onAddEmployee}
                  onCompleteOrClose={() => setIsInviteModalOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
