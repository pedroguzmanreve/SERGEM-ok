import React, { useState } from 'react';
import {
  Truck,
  ShieldCheck,
  CalendarDays,
  UserCheck,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  CheckCircle2,
  UserPlus,
  KeyRound,
  Mail,
  Phone,
  ArrowLeft,
  Smartphone,
  HelpCircle,
  Building2,
  FileText,
  Database,
  Key,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';
import { AuthUser, Employee, UserRole } from '../types/payroll';
import { SignUpView } from './SignUpView';
import {
  getStoredSupabaseUrl,
  getStoredSupabaseAnonKey,
  saveSupabaseCredentials,
  checkSupabaseConnection,
  isSupabaseConfigured,
} from '../lib/supabase';

type AuthViewMode = 'login' | 'register' | 'forgot';

interface LoginPageProps {
  employees: Employee[];
  onLogin: (user: AuthUser) => void;
  onRegister?: (employee: Employee, user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  employees,
  onLogin,
  onRegister,
}) => {
  const [viewMode, setViewMode] = useState<AuthViewMode>('login');
  const [showDbModal, setShowDbModal] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(getStoredSupabaseUrl());
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(getStoredSupabaseAnonKey());
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  // --- LOGIN STATE ---
  const [selectedRole, setSelectedRole] = useState<UserRole>('Administrativo');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  // --- REGISTER STATE ---
  const [regCedula, setRegCedula] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regApellido, setRegApellido] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regCargo, setRegCargo] = useState('Mensajero Motorizado');
  const [regRol, setRegRol] = useState<UserRole>('Repartidor');
  const [regPlaca, setRegPlaca] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regTermsAccepted, setRegTermsAccepted] = useState(true);

  // --- FORGOT PASSWORD STATE ---
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotChannel, setForgotChannel] = useState<'email' | 'whatsapp'>('email');

  // --- SUBMIT LOGIN ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = identifier.trim().toLowerCase();

    // 1. Search in existing registered employees
    if (cleanId) {
      const foundEmp = employees.find(
        (emp) =>
          emp.cedula.trim() === cleanId ||
          (emp.email && emp.email.trim().toLowerCase() === cleanId) ||
          `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(cleanId)
      );

      if (foundEmp) {
        onLogin({
          id: foundEmp.id,
          cedula: foundEmp.cedula,
          nombre: foundEmp.nombre,
          apellido: foundEmp.apellido,
          email: foundEmp.email,
          rol: foundEmp.rol,
          cargo: foundEmp.cargo,
          departamento: foundEmp.departamento,
          placaVehiculo: foundEmp.placaVehiculo,
          jefeZonaId: foundEmp.jefeZonaId,
        });
        return;
      }
    }

    // 2. If no exact match or clean initial role logins
    if (selectedRole === 'Administrativo') {
      onLogin({
        id: 'ADMIN-001',
        cedula: cleanId || '1144123456',
        nombre: 'Director General',
        apellido: 'SERGEM',
        email: cleanId.includes('@') ? cleanId : 'admin@sergemsas.com',
        rol: 'Administrativo',
        cargo: 'Gerente General / Talento Humano',
        departamento: 'Gestión Humana',
      });
      return;
    }

    if (selectedRole === 'Jefe de Zona') {
      onLogin({
        id: 'JEFE-001',
        cedula: cleanId || '94567890',
        nombre: 'Supervisor',
        apellido: 'de Zona',
        email: cleanId.includes('@') ? cleanId : 'jefe.zona@sergemsas.com',
        rol: 'Jefe de Zona',
        cargo: 'Jefe de Operaciones y Zona',
        departamento: 'Operaciones y Mensajería',
      });
      return;
    }

    if (selectedRole === 'Repartidor') {
      onLogin({
        id: 'REP-001',
        cedula: cleanId || '1143890123',
        nombre: 'Repartidor',
        apellido: 'Operativo',
        email: cleanId.includes('@') ? cleanId : 'repartidor@sergemsas.com',
        rol: 'Repartidor',
        cargo: 'Mensajero Motorizado',
        departamento: 'Operaciones y Mensajería',
        placaVehiculo: 'VTX-89D',
      });
      return;
    }
  };

  // --- SUBMIT REGISTRATION ---
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regNombre.trim() || !regApellido.trim() || !regCedula.trim()) {
      setError('Por favor completa todos los campos requeridos (Nombre, Apellido, Cédula).');
      return;
    }

    if (regPassword && regPassword !== regPasswordConfirm) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    // Check if cedula already exists
    const existing = employees.find((e) => e.cedula.trim() === regCedula.trim());
    if (existing) {
      setError(`Ya existe un colaborador registrado con la cédula ${regCedula}. Puedes iniciar sesión directamente.`);
      return;
    }

    const newId = `EMP-${Date.now().toString().slice(-4)}`;
    const newEmployee: Employee = {
      id: newId,
      cedula: regCedula.trim(),
      nombre: regNombre.trim(),
      apellido: regApellido.trim(),
      email: regEmail.trim() || `${regCedula}@sergemsas.com`,
      telefono: regTelefono.trim() || '310 000 0000',
      cargo: regCargo || (regRol === 'Repartidor' ? 'Mensajero Motorizado' : regRol === 'Jefe de Zona' ? 'Coordinador de Zona' : 'Asistente Administrativo'),
      departamento: regRol === 'Administrativo' ? 'Gestión Humana' : 'Operaciones y Mensajería',
      salarioBase: regRol === 'Repartidor' ? 1423500 : regRol === 'Jefe de Zona' ? 2100000 : 1800000,
      tipoContrato: 'Término Indefinido',
      nivelRiesgoARL: regRol === 'Repartidor' ? 4 : 1,
      fechaIngreso: new Date().toISOString().split('T')[0],
      banco: 'Bancolombia',
      tipoCuenta: 'Ahorros',
      numeroCuenta: '000-000000-00',
      eps: 'SURA EPS',
      afp: 'Protección',
      ccf: 'Comfandi',
      activo: true,
      rol: regRol,
      placaVehiculo: regPlaca.trim() || (regRol === 'Repartidor' ? 'SER-01A' : undefined),
    };

    const newAuthUser: AuthUser = {
      id: newEmployee.id,
      cedula: newEmployee.cedula,
      nombre: newEmployee.nombre,
      apellido: newEmployee.apellido,
      email: newEmployee.email,
      rol: newEmployee.rol,
      cargo: newEmployee.cargo,
      departamento: newEmployee.departamento,
      placaVehiculo: newEmployee.placaVehiculo,
    };

    if (onRegister) {
      onRegister(newEmployee, newAuthUser);
    } else {
      onLogin(newAuthUser);
    }

    setSuccessMessage(`¡Registro exitoso! Bienvenido ${newEmployee.nombre}. Redirigiendo a tu panel...`);
    setTimeout(() => {
      onLogin(newAuthUser);
    }, 1200);
  };

  // --- SUBMIT FORGOT PASSWORD ---
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setError('Ingresa tu número de cédula o correo corporativo.');
      return;
    }

    setError(null);
    setForgotSubmitted(true);
  };

  if (viewMode === 'register') {
    return (
      <SignUpView
        onBackToLogin={() => {
          setViewMode('login');
          setError(null);
        }}
        onRegisteredSuccess={(newEmp) => {
          const newAuth: AuthUser = {
            id: newEmp.id,
            cedula: newEmp.cedula,
            nombre: newEmp.nombre,
            apellido: newEmp.apellido,
            email: newEmp.email,
            rol: newEmp.rol,
            cargo: newEmp.cargo,
            departamento: newEmp.departamento,
            placaVehiculo: newEmp.placaVehiculo,
          };
          if (onRegister) {
            onRegister(newEmp, newAuth);
          } else {
            onLogin(newAuth);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between text-slate-800 selection:bg-red-500 selection:text-white">
      {/* Top Navbar Header */}
      <div className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white shadow-md shadow-red-600/25 ring-1 ring-red-500/30">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-base sm:text-lg tracking-tight text-slate-900">
                SERGEM S.A.S.
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                NIT 900.398.712-4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Plataforma de Nómina, Operaciones & Malla Logística
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => {
              setSupabaseUrl(getStoredSupabaseUrl());
              setSupabaseAnonKey(getStoredSupabaseAnonKey());
              setShowDbModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Configurar conexión con Supabase"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Base de Datos</span>
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sistema Seguro PWA</span>
          </span>
        </div>
      </div>

      {/* Supabase Connection Modal for Login Page */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 text-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-700 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Configuración de Supabase</h3>
                  <p className="text-xs text-slate-400">Project URL y Publishable / Anon Key</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDbModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://usvxopzgpqjlrruhznmg.supabase.co"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Supabase Publishable / Anon Key</span>
                </label>
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {dbTestResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  dbTestResult.success
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/70 border-red-500/50 text-red-200'
                }`}>
                  {dbTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{dbTestResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  setIsTestingSupabase(true);
                  setDbTestResult(null);
                  const res = await checkSupabaseConnection(supabaseUrl, supabaseAnonKey);
                  setDbTestResult(res);
                  setIsTestingSupabase(false);
                }}
                disabled={isTestingSupabase || !supabaseUrl.trim()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isTestingSupabase ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Probando...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Probar Conexión</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDbModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveSupabaseCredentials(supabaseUrl, supabaseAnonKey);
                    setShowDbModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  Guardar y Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Center Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50/50">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 relative overflow-hidden">
          {/* Subtle Ambient Shapes */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-50/80 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-slate-100/80 rounded-full blur-3xl pointer-events-none" />

          {/* Nav Header Modes (Iniciar Sesión / Registrarse) */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6 relative">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setError(null);
                }}
                className={`text-sm font-extrabold pb-1 transition-all cursor-pointer ${
                  viewMode === 'login'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Iniciar Sesión
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => {
                  setViewMode('register');
                  setError(null);
                }}
                className="text-sm font-extrabold pb-1 transition-all cursor-pointer text-slate-500 hover:text-slate-800"
              >
                Crear Cuenta / Registro
              </button>
            </div>

            {viewMode !== 'login' && (
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setError(null);
                }}
                className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Login</span>
              </button>
            )}
          </div>

          {/* ========================================================================= */}
          {/* VIEW 1: LOGIN */}
          {/* ========================================================================= */}
          {viewMode === 'login' && (
            <div className="relative">
              {/* Heading */}
              <div className="text-center mb-6 relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-red-500 text-white shadow-lg shadow-red-600/25 mb-3.5 border border-red-200">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Ingreso Seguro al Sistema
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Selecciona tu rol operativo para ingresar al portal correspondiente
                </p>
              </div>

              {/* Role Selection Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 mb-6">
                {/* 1. Admin */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('Administrativo');
                    setError(null);
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all text-center cursor-pointer ${
                    selectedRole === 'Administrativo'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/25 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 font-semibold'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 mb-1 shrink-0" />
                  <span className="text-xs">Administración</span>
                  <span className={`text-[10px] ${selectedRole === 'Administrativo' ? 'text-red-100' : 'text-slate-500'}`}>
                    RRHH & Nómina
                  </span>
                </button>

                {/* 2. Jefe de Zona */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('Jefe de Zona');
                    setError(null);
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all text-center cursor-pointer ${
                    selectedRole === 'Jefe de Zona'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/25 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 font-semibold'
                  }`}
                >
                  <CalendarDays className="w-5 h-5 mb-1 shrink-0" />
                  <span className="text-xs">Jefe de Zona</span>
                  <span className={`text-[10px] ${selectedRole === 'Jefe de Zona' ? 'text-red-100' : 'text-slate-500'}`}>
                    Malla & Turnos
                  </span>
                </button>

                {/* 3. Repartidor */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('Repartidor');
                    setError(null);
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all text-center cursor-pointer ${
                    selectedRole === 'Repartidor'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/25 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 font-semibold'
                  }`}
                >
                  <Truck className="w-5 h-5 mb-1 shrink-0" />
                  <span className="text-xs">Repartidor</span>
                  <span className={`text-[10px] ${selectedRole === 'Repartidor' ? 'text-red-100' : 'text-slate-500'}`}>
                    Asistencia & App
                  </span>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Document / Email Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Número de Cédula o Correo Corporativo:
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={
                        selectedRole === 'Repartidor'
                          ? 'Ej. 1143890123 (Cédula del repartidor)'
                          : selectedRole === 'Jefe de Zona'
                          ? 'Ej. 94567890 o supervisor@sergemsas.com'
                          : 'Ej. admin@sergemsas.com o C.C. 1144123456'
                      }
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password / PIN Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      {selectedRole === 'Repartidor' ? 'PIN de Acceso / Contraseña:' : 'Contraseña de Acceso:'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('forgot');
                        setError(null);
                      }}
                      className="text-[11px] text-red-600 hover:text-red-700 font-semibold cursor-pointer underline underline-offset-2"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded-sm border-slate-300 bg-white text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <span>Mantener sesión iniciada en este equipo</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold py-3 px-4 rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center space-x-2 text-sm transition-all duration-150 cursor-pointer active:scale-98"
                >
                  <span>Ingresar como {selectedRole}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Bottom Register CTA */}
              <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-600">
                  ¿Eres un nuevo colaborador o mensajero?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('register');
                      setError(null);
                    }}
                    className="text-red-600 hover:text-red-700 font-bold underline underline-offset-2 cursor-pointer"
                  >
                    Crear tu cuenta aquí
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: FORGOT PASSWORD / OLVIDÓ CONTRASEÑA */}
          {/* ========================================================================= */}
          {viewMode === 'forgot' && (
            <div className="relative">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-600/25 mb-3 border border-amber-200">
                  <KeyRound className="w-7 h-7" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Recuperación de Contraseña
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Ingresa tu número de documento o correo para reestablecer tus credenciales de acceso
                </p>
              </div>

              {!forgotSubmitted ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Canal de Recuperación Preferido:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setForgotChannel('email')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                          forgotChannel === 'email'
                            ? 'bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Mail className="w-4 h-4 text-amber-600" />
                        <span>Correo Corporativo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForgotChannel('whatsapp')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                          forgotChannel === 'whatsapp'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        <span>WhatsApp / SMS</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Número de Cédula (C.C.) o Correo Registrado:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="Ej. 1144123456 o usuario@sergemsas.com"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">
                      💡 Si eres repartidor en ruta:
                    </p>
                    <p className="text-[11px]">
                      También puedes solicitar a tu Jefe de Zona o a Gestión Humana la validación de tu PIN temporal directamente en su panel de control.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold py-3 px-4 rounded-xl shadow-lg shadow-amber-600/25 flex items-center justify-center space-x-2 text-xs sm:text-sm transition-all cursor-pointer active:scale-98"
                  >
                    <span>Enviar Enlace de Restablecimiento</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="text-center py-4 space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Instrucciones Enviadas
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                      Hemos enviado las instrucciones y el código de verificación para {forgotIdentifier} vía {forgotChannel === 'email' ? 'correo electrónico' : 'mensaje de WhatsApp'}.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left">
                    <div className="font-bold text-slate-800 mb-1">Contacto de Soporte Inmediato:</div>
                    <div>PBX: (602) 399-4620 • Talento Humano SERGEM</div>
                    <div>Correo: soporte@sergemsas.com</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setForgotSubmitted(false);
                      setForgotIdentifier('');
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Regresar al Inicio de Sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-3 px-4 text-center text-slate-500 text-xs border-t border-slate-200 bg-slate-50">
        <p>
          © 2026 SERGEM MENSAJERÍA S.A.S. • Calle 10 # 38-42, Cali, Colombia • PBX (602) 399-4620
        </p>
      </footer>
    </div>
  );
};
