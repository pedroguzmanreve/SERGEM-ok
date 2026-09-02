import React, { useState, useMemo } from 'react';
import { CompanyClient, ClientTariffs } from '../types/payroll';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  User,
  DollarSign,
  Package,
  Clock,
  Compass,
  FileSpreadsheet,
  X,
  Save,
  AlertCircle,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface ClientsManagementViewProps {
  clients: CompanyClient[];
  onAddClient: (client: CompanyClient) => void;
  onUpdateClient: (client: CompanyClient) => void;
  onDeleteClient: (clientId: string) => void;
}

export const ClientsManagementView: React.FC<ClientsManagementViewProps> = ({
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'Activo' | 'Inactivo'>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CompanyClient | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Form State
  const defaultTariffs: ClientTariffs = {
    tarifaBasePaquete: 4500,
    tarifaHoraOrdinaria: 15000,
    tarifaHoraExtraDiurna: 18750,
    tarifaHoraExtraNocturna: 26250,
    tarifaSalidaFueraPerimetro: 22000,
    tarifaRecargoDominical: 26250,
    tarifaRecargoNocturno: 5250,
    tarifaMensajeroFijoMensual: 2900000,
  };

  const [formData, setFormData] = useState<{
    id: string;
    nombre: string;
    nit: string;
    direccion: string;
    ciudad: string;
    telefono: string;
    emailContacto: string;
    personaContacto: string;
    estado: 'Activo' | 'Inactivo';
    sedesString: string;
    observaciones: string;
    tarifas: ClientTariffs;
  }>({
    id: '',
    nombre: '',
    nit: '',
    direccion: '',
    ciudad: 'Santiago de Cali',
    telefono: '',
    emailContacto: '',
    personaContacto: '',
    estado: 'Activo',
    sedesString: '',
    observaciones: '',
    tarifas: { ...defaultTariffs },
  });

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({
      id: `CLI-${Date.now().toString().slice(-4)}`,
      nombre: '',
      nit: '',
      direccion: '',
      ciudad: 'Santiago de Cali',
      telefono: '',
      emailContacto: '',
      personaContacto: '',
      estado: 'Activo',
      sedesString: '',
      observaciones: '',
      tarifas: { ...defaultTariffs },
    });
    setIsModalOpen(true);
  };

  const openEditModal = (client: CompanyClient) => {
    setEditingClient(client);
    setFormData({
      id: client.id,
      nombre: client.nombre,
      nit: client.nit,
      direccion: client.direccion,
      ciudad: client.ciudad,
      telefono: client.telefono,
      emailContacto: client.emailContacto,
      personaContacto: client.personaContacto,
      estado: client.estado,
      sedesString: client.sedes ? client.sedes.join(', ') : '',
      observaciones: client.observaciones || '',
      tarifas: {
        tarifaBasePaquete: client.tarifas?.tarifaBasePaquete || 4500,
        tarifaHoraOrdinaria: client.tarifas?.tarifaHoraOrdinaria || 15000,
        tarifaHoraExtraDiurna: client.tarifas?.tarifaHoraExtraDiurna || 18750,
        tarifaHoraExtraNocturna: client.tarifas?.tarifaHoraExtraNocturna || 26250,
        tarifaSalidaFueraPerimetro: client.tarifas?.tarifaSalidaFueraPerimetro || 22000,
        tarifaRecargoDominical: client.tarifas?.tarifaRecargoDominical || 26250,
        tarifaRecargoNocturno: client.tarifas?.tarifaRecargoNocturno || 5250,
        tarifaMensajeroFijoMensual: client.tarifas?.tarifaMensajeroFijoMensual || 2900000,
      },
    });
    setIsModalOpen(true);
  };

  const handleTariffChange = (field: keyof ClientTariffs, value: number) => {
    setFormData((prev) => ({
      ...prev,
      tarifas: {
        ...prev.tarifas,
        [field]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      alert('Por favor ingrese el nombre o razón social del cliente.');
      return;
    }

    const sedesList = formData.sedesString
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const clientPayload: CompanyClient = {
      id: formData.id || `CLI-${Date.now().toString().slice(-4)}`,
      nombre: formData.nombre.trim(),
      nit: formData.nit.trim(),
      direccion: formData.direccion.trim(),
      ciudad: formData.ciudad.trim(),
      telefono: formData.telefono.trim(),
      emailContacto: formData.emailContacto.trim(),
      personaContacto: formData.personaContacto.trim(),
      estado: formData.estado,
      sedes: sedesList.length > 0 ? sedesList : undefined,
      observaciones: formData.observaciones.trim() || undefined,
      tarifas: formData.tarifas,
      fechaRegistro: editingClient ? editingClient.fechaRegistro : new Date().toISOString().split('T')[0],
    };

    if (editingClient) {
      onUpdateClient(clientPayload);
      setSuccessMessage(`Cliente "${clientPayload.nombre}" actualizado con éxito.`);
    } else {
      onAddClient(clientPayload);
      setSuccessMessage(`Nuevo cliente "${clientPayload.nombre}" creado exitosamente.`);
    }

    setIsModalOpen(false);
    setTimeout(() => {
      setSuccessMessage('');
    }, 5000);
  };

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter((cli) => {
      const matchesSearch =
        cli.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cli.nit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cli.ciudad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cli.personaContacto.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'TODOS' || cli.estado === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  // Metrics
  const activeCount = clients.filter((c) => c.estado === 'Activo').length;
  const avgPerimeterTariff =
    clients.length > 0
      ? Math.round(clients.reduce((acc, c) => acc + (c.tarifas?.tarifaSalidaFueraPerimetro || 0), 0) / clients.length)
      : 22000;
  const avgPackageTariff =
    clients.length > 0
      ? Math.round(clients.reduce((acc, c) => acc + (c.tarifas?.tarifaBasePaquete || 0), 0) / clients.length)
      : 4500;

  return (
    <div id="clients-management-view" className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/60 text-slate-900 rounded-2xl p-7 md:p-8 shadow-xs border border-slate-300/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-white border border-slate-300/80 text-red-700 font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-2xs">
            <Building2 className="w-4 h-4 text-red-600" />
            <span>Directorio y Tarifario Corporativo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Portal de Creación & Gestión de Clientes
          </h2>
          <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
            Registre nuevos clientes comerciales, configure sus tarifas de entrega de paquetes, horas ordinarias y extras (42h), salidas fuera del perímetro urbano (extra-radio) y recargos festivos.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/25 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span>Crear Nuevo Cliente</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-black px-2 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Clientes Registrados</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{clients.length}</span>
              <span className="text-xs text-emerald-600 font-bold">({activeCount} activos)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tarifa Promedio Fuera Perímetro</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-xl font-black text-slate-900 font-mono">${avgPerimeterTariff.toLocaleString('es-CO')}</span>
              <span className="text-[10px] text-slate-500 font-semibold">/ salida</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tarifa Promedio Paquete</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-xl font-black text-slate-900 font-mono">${avgPackageTariff.toLocaleString('es-CO')}</span>
              <span className="text-[10px] text-slate-500 font-semibold">/ paquete</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Jornada Semanal Facturable</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-purple-900 font-mono">42 hrs / sem</span>
              <span className="text-[10px] text-purple-600 font-bold bg-purple-100 px-1.5 py-0.5 rounded">Ley 2101</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por razón social, NIT, ciudad o persona de contacto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="TODOS">Todos</option>
              <option value="Activo">Solo Activos</option>
              <option value="Inactivo">Solo Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredClients.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No se encontraron clientes</p>
            <p className="text-xs text-slate-400 mt-1">Haga clic en "Crear Nuevo Cliente" para agregar su primer cliente corporativo.</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const isActive = client.estado === 'Activo';
            return (
              <div
                key={client.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          {client.id}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {client.estado}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 leading-snug">{client.nombre}</h3>
                      <p className="text-xs font-mono font-bold text-slate-500">NIT: {client.nit}</p>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => openEditModal(client)}
                        className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                        title="Editar cliente y tarifas"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de eliminar al cliente "${client.nombre}"?`)) {
                            onDeleteClient(client.id);
                          }
                        }}
                        className="p-2 text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                    <div className="flex items-center space-x-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.direccion}, {client.ciudad}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.personaContacto || 'Sin contacto directo'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{client.telefono || 'Sin teléfono'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.emailContacto || 'Sin correo'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Body: Tariffs Breakdown */}
                <div className="p-5 space-y-3">
                  <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Tarifas Pactadas para Operación</span>
                    <span className="text-[10px] text-slate-400 lowercase font-normal">(Valores en COP)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-500 block">Por Paquete</span>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        ${(client.tarifas?.tarifaBasePaquete || 4500).toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                      <span className="text-[10px] font-bold text-amber-800 block flex items-center gap-1">
                        <Compass className="w-3 h-3 text-amber-600" />
                        Fuera Perímetro
                      </span>
                      <span className="font-mono font-black text-amber-950 text-sm">
                        ${(client.tarifas?.tarifaSalidaFueraPerimetro || 22000).toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-500 block">Hora Ordinaria</span>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        ${(client.tarifas?.tarifaHoraOrdinaria || 15000).toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-500 block">Extra Diurna (+25%)</span>
                      <span className="font-mono font-bold text-blue-900 text-xs">
                        ${(client.tarifas?.tarifaHoraExtraDiurna || 18750).toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-500 block">Extra Nocturna (+75%)</span>
                      <span className="font-mono font-bold text-indigo-900 text-xs">
                        ${(client.tarifas?.tarifaHoraExtraNocturna || 26250).toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-500 block">Dominical/Festivo</span>
                      <span className="font-mono font-bold text-purple-900 text-xs">
                        ${(client.tarifas?.tarifaRecargoDominical || 26250).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>

                  {client.sedes && client.sedes.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex items-center space-x-1.5 flex-wrap gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Sedes:</span>
                      {client.sedes.map((s, idx) => (
                        <span key={idx} className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingClient ? `Editar Cliente: ${editingClient.nombre}` : 'Registrar Nuevo Cliente Comercial'}
                  </h3>
                  <p className="text-xs text-slate-400">Datos corporativos, sedes operativas y tarifas de facturación</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
              {/* Basic Corporate Data */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-red-600" />
                  <span>Datos Generales de la Empresa</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Razón Social / Nombre del Cliente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Almacenes Éxito S.A."
                      value={formData.nombre}
                      onChange={(e) => setFormData((p) => ({ ...p, nombre: e.target.value }))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">NIT / Identificación Tributaria *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 890.900.608-9"
                      value={formData.nit}
                      onChange={(e) => setFormData((p) => ({ ...p, nit: e.target.value }))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs font-bold focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ciudad Principal</label>
                    <input
                      type="text"
                      value={formData.ciudad}
                      onChange={(e) => setFormData((p) => ({ ...p, ciudad: e.target.value }))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Dirección Principal</label>
                    <input
                      type="text"
                      placeholder="Ej. Carrera 1 # 44-12"
                      value={formData.direccion}
                      onChange={(e) => setFormData((p) => ({ ...p, direccion: e.target.value }))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Persona de Contacto / Coordinador</label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Carlos Pérez (Logística)"
                      value={formData.personaContacto}
                      onChange={(e) => setFormData((p) => ({ ...p, personaContacto: e.target.value }))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Teléfono / PBX de Contacto</label>
                    <input
                      type="text"
                      placeholder="Ej. (602) 485-9000 o 315 123 4567"
                      value={formData.telefono}
                      onChange={(e) => setFormData((p) => ({ ...p, telefono: e.target.value }))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs font-medium focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Correo Electrónico de Facturación</label>
                    <input
                      type="email"
                      placeholder="Ej. facturacion@cliente.com"
                      value={formData.emailContacto}
                      onChange={(e) => setFormData((p) => ({ ...p, emailContacto: e.target.value }))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Estado del Cliente</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData((p) => ({ ...p, estado: e.target.value as any }))}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-red-500 cursor-pointer"
                    >
                      <option value="Activo">Activo (Operación Habilitada)</option>
                      <option value="Inactivo">Inactivo (Pausado)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sedes Operativas (Separadas por comas)</label>
                  <input
                    type="text"
                    placeholder="Ej. Sede Norte Menga, Sede Sur Pasoancho, Sede Centro"
                    value={formData.sedesString}
                    onChange={(e) => setFormData((p) => ({ ...p, sedesString: e.target.value }))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* TARIFFS SECTION (CUSTOM TARIFFS INCLUDING PERIMETER EXIT) */}
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span>Esquema de Tarifas Específicas para el Cliente ($ COP)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    Facturación SERGEM
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tarifa por Paquete / Envío ($)</label>
                    <input
                      type="number"
                      value={formData.tarifas.tarifaBasePaquete}
                      onChange={(e) => handleTariffChange('tarifaBasePaquete', parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="bg-amber-100/60 p-2 rounded-xl border border-amber-300/80">
                    <label className="block font-black text-amber-950 mb-1 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-amber-700" />
                      Salida Fuera de Perímetro ($) *
                    </label>
                    <input
                      type="number"
                      value={formData.tarifas.tarifaSalidaFueraPerimetro}
                      onChange={(e) => handleTariffChange('tarifaSalidaFueraPerimetro', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-amber-400 rounded-lg bg-white font-mono font-black text-xs text-amber-950 focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[9px] text-amber-800 font-medium block mt-1">
                      Extra-radio urbano (Yumbo, Jamundí, Palmira, etc.)
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hora Ordinaria ($)</label>
                    <input
                      type="number"
                      value={formData.tarifas.tarifaHoraOrdinaria}
                      onChange={(e) => handleTariffChange('tarifaHoraOrdinaria', parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hora Extra Diurna (+25%)</label>
                    <input
                      type="number"
                      value={formData.tarifas.tarifaHoraExtraDiurna}
                      onChange={(e) => handleTariffChange('tarifaHoraExtraDiurna', parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hora Extra Nocturna (+75%)</label>
                    <input
                      type="number"
                      value={formData.tarifas.tarifaHoraExtraNocturna}
                      onChange={(e) => handleTariffChange('tarifaHoraExtraNocturna', parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Recargo Dominical / Festivo ($)</label>
                    <input
                      type="number"
                      value={formData.tarifas.tarifaRecargoDominical}
                      onChange={(e) => handleTariffChange('tarifaRecargoDominical', parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones y Condiciones Especiales</label>
                <textarea
                  rows={2}
                  placeholder="Notas internas sobre facturación, horarios de entrega o requerimientos de dotación..."
                  value={formData.observaciones}
                  onChange={(e) => setFormData((p) => ({ ...p, observaciones: e.target.value }))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
