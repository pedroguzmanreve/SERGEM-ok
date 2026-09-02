import React, { useState } from 'react';
import { useAuth, SignUpData } from '../context/AuthContext';
import { UserRole, Employee, Department, ContractType, RiskLevel } from '../types/payroll';
import {
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  Phone,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Database,
  Key,
  BadgePercent,
  Sparkles,
  Info,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface SignUpViewProps {
  onBackToLogin: () => void;
  onRegisteredSuccess?: (employee: Employee) => void;
}

export const SignUpView: React.FC<SignUpViewProps> = ({
  onBackToLogin,
  onRegisteredSuccess,
}) => {
  const { signUp, loading: isAuthLoading } = useAuth();

  // --- FORM STATE ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('Administrativo');

  // Personal Info
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [sede, setSede] = useState('Cali - Valle del Cauca');

  // Job & Payroll Info
  const [cargo, setCargo] = useState('Director de Operaciones y Nómina');
  const [departamento, setDepartamento] = useState<Department>('Gestión Humana');
  const [salarioBase, setSalarioBase] = useState<number>(3500000);
  const [tipoContrato, setTipoContrato] = useState<ContractType>('Término Indefinido');
  const [nivelRiesgoARL, setNivelRiesgoARL] = useState<RiskLevel>(1);
  const [placaVehiculo, setPlacaVehiculo] = useState('');

  // Social Security & Banking (Colombia / Cali)
  const [eps, setEps] = useState('SURA');
  const [afp, setAfp] = useState('Porvenir');
  const [ccf, setCcf] = useState('Comfandi'); // Cali, Valle del Cauca
  const [banco, setBanco] = useState('Bancolombia');
  const [tipoCuenta, setTipoCuenta] = useState<'Ahorros' | 'Corriente'>('Ahorros');
  const [numeroCuenta, setNumeroCuenta] = useState('98765432101');

  // Section Expansion
  const [activeStep, setActiveStep] = useState<'account' | 'personal' | 'laboral'>('account');

  // Form Feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; requiresEmailConfirm?: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Role Change to adjust defaults
  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    if (newRole === 'Repartidor') {
      setCargo('Mensajero Motorizado');
      setDepartamento('Operaciones y Mensajería');
      setSalarioBase(1423500);
      setNivelRiesgoARL(4);
      setPlacaVehiculo('VTX-89D');
    } else if (newRole === 'Jefe de Zona') {
      setCargo('Jefe de Zona y Supervisor');
      setDepartamento('Operaciones y Mensajería');
      setSalarioBase(2200000);
      setNivelRiesgoARL(1);
      setPlacaVehiculo('');
    } else {
      setCargo('Director de Operaciones y Nómina');
      setDepartamento('Gestión Humana');
      setSalarioBase(3500000);
      setNivelRiesgoARL(1);
      setPlacaVehiculo('');
    }
  };

  // Submit Sign Up
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessInfo(null);

    // Basic Validations
    if (!email.trim() || !email.includes('@')) {
      setFormError('Por favor ingrese un correo electrónico válido (será el identificador común).');
      setActiveStep('account');
      return;
    }

    if (password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres para Supabase Auth.');
      setActiveStep('account');
      return;
    }

    if (password !== passwordConfirm) {
      setFormError('Las contraseñas ingresadas no coinciden.');
      setActiveStep('account');
      return;
    }

    if (!cedula.trim() || !nombre.trim() || !apellido.trim()) {
      setFormError('Nombre, apellido y número de cédula son campos requeridos.');
      setActiveStep('personal');
      return;
    }

    setIsSubmitting(true);

    const payload: SignUpData = {
      email: email.trim().toLowerCase(),
      password: password.trim(),
      cedula: cedula.trim(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim() || '315 789 4561',
      rol: selectedRole,
      cargo: cargo.trim(),
      departamento,
      salarioBase: Number(salarioBase) || 1423500,
      tipoContrato,
      nivelRiesgoARL,
      sede,
      placaVehiculo: selectedRole === 'Repartidor' ? (placaVehiculo.trim() || 'SER-01A') : undefined,
      banco: banco.trim() || 'Bancolombia',
      tipoCuenta,
      numeroCuenta: numeroCuenta.trim() || '000-000000-00',
      eps: eps.trim() || 'SURA',
      afp: afp.trim() || 'Porvenir',
      ccf: ccf.trim() || 'Comfandi',
    };

    const res = await signUp(payload);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessInfo({
        message: res.message || `Usuario creado exitosamente y sincronizado en 'employees' con el email ${email}.`,
        requiresEmailConfirm: res.requiresEmailConfirmation,
      });

      if (res.employee && onRegisteredSuccess) {
        onRegisteredSuccess(res.employee);
      }
    } else {
      setFormError(res.error || 'No se pudo completar el registro.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center py-8 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Decorative Rings */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl z-10 px-4">
        
        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-xl shadow-red-600/30 ring-4 ring-red-500/20 mb-3">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Registro de Usuario & Sincronización Supabase
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 inline" />
            <span>Creación en Supabase Auth y Vinculación en 'employees' por Email</span>
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white/95 backdrop-blur-xl py-6 px-6 sm:px-8 shadow-2xl rounded-3xl border border-white/20">
          
          {/* Email Common Identifier Explanation Banner */}
          <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 text-white flex items-start gap-3 text-xs shadow-md">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span>Identificador Común:</span>
                  <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-[11px] text-white">email</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  isSupabaseConfigured() ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {isSupabaseConfigured() ? 'Supabase Enlazado' : 'Modo Local / Fallback'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Al registrarse, se creará el usuario en <strong>Supabase Auth (`auth.users`)</strong> y se sincronizará automáticamente el perfil de nómina en la tabla <strong>`public.employees`</strong> usando el mismo email.
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {formError && (
            <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200/90 flex items-start gap-3 text-xs text-red-700 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-red-900 mb-0.5">Error en el registro</strong>
                <p className="font-medium">{formError}</p>
              </div>
            </div>
          )}

          {successInfo && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-start gap-3 text-xs text-emerald-900 animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-bold text-emerald-950 text-sm">¡Registro Completado!</strong>
                <p className="font-medium text-emerald-800">{successInfo.message}</p>
                {successInfo.requiresEmailConfirm && (
                  <p className="text-[11px] text-emerald-700 bg-emerald-100/70 p-2 rounded-lg mt-1 font-normal">
                    Nota: Se ha enviado un enlace de confirmación a tu correo. Puedes ingresar al panel tras confirmarlo o iniciar sesión con tus credenciales.
                  </p>
                )}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Ir al Inicio de Sesión
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveStep('account')}
              className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 'account'
                  ? 'bg-white text-red-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>1. Cuenta & Rol</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep('personal')}
              className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 'personal'
                  ? 'bg-white text-red-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>2. Identificación</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep('laboral')}
              className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 'laboral'
                  ? 'bg-white text-red-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>3. Laboral & Nómina</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* STEP 1: ACCOUNT & SUPABASE AUTH */}
            {activeStep === 'account' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Role Selection */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Seleccione el Rol del Usuario (Permisos RBAC)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Administrativo', 'Jefe de Zona', 'Repartidor'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleChange(r)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          selectedRole === r
                            ? 'border-red-500 bg-red-50/70 text-red-900 ring-2 ring-red-500/20 shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <span className="block font-bold text-xs">
                          {r === 'Administrativo' ? 'Administrador / RRHH' : r}
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {r === 'Administrativo' ? 'Nómina, DIAN & Control' : r === 'Jefe de Zona' ? 'Malla & Novedades' : 'Móvil, Entregas & GPS'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email (Common Identifier) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-red-600" />
                      <span>Correo Electrónico (Identificador Común)</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      Supabase Auth ID
                    </span>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo: admin.cali@sergemsas.com o tu_email@dominio.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Este correo se utilizará para iniciar sesión en Supabase Auth y para consultar el perfil en la tabla <code>employees</code>.
                  </p>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-red-600" />
                      <span>Contraseña</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-red-600" />
                      <span>Confirmar Contraseña</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repite la contraseña"
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl font-medium text-slate-900 outline-none ${
                        passwordConfirm && password !== passwordConfirm
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-2 focus:ring-red-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!email || !password) {
                        setFormError('Por favor complete el correo y la contraseña antes de continuar.');
                        return;
                      }
                      setFormError(null);
                      setActiveStep('personal');
                    }}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/20"
                  >
                    <span>Siguiente: Datos de Identificación</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PERSONAL IDENTIFICATION */}
            {activeStep === 'personal' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Cédula */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-red-600" />
                    <span>Cédula de Ciudadanía (C.C.)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Ejemplo: 1144001122"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Identificador de nómina para reportes DIAN y archivo plano bancario.
                  </p>
                </div>

                {/* Names and Lastnames */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Nombres <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Carlos Alberto"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Apellidos <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      placeholder="Ej: Gómez Restrepo"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>
                </div>

                {/* Phone & Sede */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-red-600" />
                      <span>Teléfono / Celular</span>
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="315 789 4561"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-red-600" />
                      <span>Sede Operativa</span>
                    </label>
                    <select
                      value={sede}
                      onChange={(e) => setSede(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                    >
                      <option value="Cali - Valle del Cauca">Cali - Valle del Cauca (Principal)</option>
                      <option value="Bogotá D.C.">Bogotá D.C.</option>
                      <option value="Medellín - Antioquia">Medellín - Antioquia</option>
                      <option value="Barranquilla - Atlántico">Barranquilla - Atlántico</option>
                      <option value="Manizales - Caldas">Manizales - Caldas</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep('account')}
                    className="px-3.5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Atrás</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!cedula || !nombre || !apellido) {
                        setFormError('Por favor complete cédula, nombre y apellido.');
                        return;
                      }
                      setFormError(null);
                      setActiveStep('laboral');
                    }}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/20"
                  >
                    <span>Siguiente: Datos Laborales</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: LABORAL & PAYROLL */}
            {activeStep === 'laboral' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Cargo & Departamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Cargo Asignado
                    </label>
                    <input
                      type="text"
                      required
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Departamento / Área
                    </label>
                    <select
                      value={departamento}
                      onChange={(e) => setDepartamento(e.target.value as Department)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                    >
                      <option value="Gestión Humana">Gestión Humana / RRHH</option>
                      <option value="Operaciones y Mensajería">Operaciones y Mensajería</option>
                      <option value="Logística y Despachos">Logística y Despachos</option>
                      <option value="Financiera y Contabilidad">Financiera y Contabilidad</option>
                      <option value="Administración">Administración General</option>
                    </select>
                  </div>
                </div>

                {/* Salario Base & Contrato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Salario Base Mensual ($ COP)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50000}
                      value={salarioBase}
                      onChange={(e) => setSalarioBase(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-medium text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Tipo de Contrato
                    </label>
                    <select
                      value={tipoContrato}
                      onChange={(e) => setTipoContrato(e.target.value as ContractType)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                    >
                      <option value="Término Indefinido">Término Indefinido</option>
                      <option value="Término Fijo">Término Fijo</option>
                      <option value="Obra o Labor">Obra o Labor</option>
                      <option value="Aprendizaje">Aprendizaje SENA</option>
                    </select>
                  </div>
                </div>

                {/* Repartidor Specific (Placa & ARL) */}
                {selectedRole === 'Repartidor' && (
                  <div className="p-3 bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-red-800 font-bold">
                      <Truck className="w-4 h-4" />
                      <span>Datos Operativos de Repartidor Motorizado</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Placa de la Moto / Vehículo
                        </label>
                        <input
                          type="text"
                          value={placaVehiculo}
                          onChange={(e) => setPlacaVehiculo(e.target.value.toUpperCase())}
                          placeholder="Ej: VTX-89D"
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Nivel de Riesgo ARL
                        </label>
                        <select
                          value={nivelRiesgoARL}
                          onChange={(e) => setNivelRiesgoARL(Number(e.target.value) as RiskLevel)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 cursor-pointer"
                        >
                          <option value={4}>Nivel IV (Motorizados / Transporte - 4.35%)</option>
                          <option value={1}>Nivel I (Administrativo - 0.522%)</option>
                          <option value={2}>Nivel II (Riesgo Bajo - 1.044%)</option>
                          <option value={3}>Nivel III (Riesgo Medio - 2.436%)</option>
                          <option value={5}>Nivel V (Riesgo Máximo - 6.960%)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Social Security & Banking (Cali defaults) */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">EPS</label>
                    <input
                      type="text"
                      value={eps}
                      onChange={(e) => setEps(e.target.value)}
                      placeholder="SURA"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">AFP (Pensión)</label>
                    <input
                      type="text"
                      value={afp}
                      onChange={(e) => setAfp(e.target.value)}
                      placeholder="Porvenir"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CCF (Caja)</label>
                    <input
                      type="text"
                      value={ccf}
                      onChange={(e) => setCcf(e.target.value)}
                      placeholder="Comfandi (Cali)"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    />
                  </div>
                </div>

                {/* Banking details */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Banco</label>
                    <input
                      type="text"
                      value={banco}
                      onChange={(e) => setBanco(e.target.value)}
                      placeholder="Bancolombia"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo Cuenta</label>
                    <select
                      value={tipoCuenta}
                      onChange={(e) => setTipoCuenta(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium cursor-pointer"
                    >
                      <option value="Ahorros">Ahorros</option>
                      <option value="Corriente">Corriente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Número Cuenta</label>
                    <input
                      type="text"
                      value={numeroCuenta}
                      onChange={(e) => setNumeroCuenta(e.target.value)}
                      placeholder="98765432101"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-medium"
                    />
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveStep('personal')}
                    className="px-3.5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Atrás</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || isAuthLoading}
                    className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSubmitting || isAuthLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Sincronizando con Supabase...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 text-emerald-200" />
                        <span>Registrar & Sincronizar en 'employees'</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </form>

          {/* Switch to Login */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">¿Ya tienes un usuario o prefieres ingresar por cédula?</span>
            <button
              type="button"
              onClick={onBackToLogin}
              className="font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Iniciar Sesión</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
