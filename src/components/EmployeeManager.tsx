import React, { useState } from 'react';
import { ContractType, Department, Employee, RiskLevel } from '../types/payroll';
import { formatCurrency } from '../utils/payrollCalculator';
import { UserPlus, Search, Edit2, CheckCircle, XCircle, Building2, CreditCard, Shield } from 'lucide-react';

interface EmployeeManagerProps {
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees,
  onAddEmployee,
  onUpdateEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const departments: Department[] = [
    'Operaciones y Mensajería',
    'Logística y Despachos',
    'Gestión Humana',
    'Financiera y Contabilidad',
    'Tecnología e Innovación',
    'Comercial y Ventas',
    'Administración',
  ];

  const contracts: ContractType[] = [
    'Término Indefinido',
    'Término Fijo',
    'Obra o Labor',
    'Aprendizaje',
  ];

  const initialFormState: Employee = {
    id: `EMP-${(employees.length + 1).toString().padStart(3, '0')}`,
    cedula: '',
    nombre: '',
    apellido: '',
    cargo: '',
    departamento: 'Operaciones y Mensajería',
    salarioBase: 1423500,
    tipoContrato: 'Término Indefinido',
    nivelRiesgoARL: 3,
    fechaIngreso: new Date().toISOString().slice(0, 10),
    banco: 'Bancolombia',
    tipoCuenta: 'Ahorros',
    numeroCuenta: '',
    eps: 'Sura EPS',
    afp: 'Protección',
    ccf: 'Comfandi',
    activo: true,
    rol: 'Repartidor',
  };

  const [formData, setFormData] = useState<Employee>(initialFormState);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData({
      ...initialFormState,
      id: `EMP-${(employees.length + 1).toString().padStart(3, '0')}`,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({ ...emp });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      onUpdateEmployee(formData);
    } else {
      onAddEmployee(formData);
    }
    setIsModalOpen(false);
  };

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cedula.includes(searchTerm) ||
      emp.cargo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === 'Todos' || emp.departamento === selectedDept;

    return matchesSearch && matchesDept;
  });

  return (
    <div id="employee-manager" className="space-y-6 pb-10">
      
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador por nombre, cédula o cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos los Departamentos</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Add Employee Button */}
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Nuevo Empleado
        </button>

      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((emp) => (
          <div
            key={emp.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">{emp.id}</span>
                  <h3 className="text-base font-bold text-slate-900">{emp.nombre} {emp.apellido}</h3>
                  <p className="text-xs text-slate-500 font-medium">{emp.cargo}</p>
                </div>
                <button
                  onClick={() => handleOpenEdit(emp)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  title="Editar Información"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Cédula:</span>
                  <span className="font-semibold text-slate-900">{emp.cedula}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Área:</span>
                  <span className="font-semibold text-slate-900">{emp.departamento}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Salario Básico:</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(emp.salarioBase)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Tipo Contrato:</span>
                  <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-800">{emp.tipoContrato}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Riesgo ARL:</span>
                  <span className="font-semibold text-slate-900">Clase {emp.nivelRiesgoARL}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Banco:</span>
                  <span className="font-medium text-slate-800">{emp.banco} ({emp.tipoCuenta})</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Ingreso: {emp.fechaIngreso}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold ${
                emp.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {emp.activo ? <CheckCircle className="w-3 h-3 mr-1 inline" /> : <XCircle className="w-3 h-3 mr-1 inline" />}
                {emp.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingEmployee ? 'Editar Empleado SERGEM S.A.S.' : 'Registrar Nuevo Empleado'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cédula de Ciudadanía *</label>
                  <input
                    type="text"
                    required
                    value={formData.cedula}
                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cargo *</label>
                  <input
                    type="text"
                    required
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Departamento</label>
                  <select
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value as Department })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Salario Básico Mensual ($)</label>
                  <input
                    type="number"
                    required
                    min="1000000"
                    value={formData.salarioBase}
                    onChange={(e) => setFormData({ ...formData, salarioBase: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Contrato</label>
                  <select
                    value={formData.tipoContrato}
                    onChange={(e) => setFormData({ ...formData, tipoContrato: e.target.value as ContractType })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {contracts.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nivel Riesgo ARL</label>
                  <select
                    value={formData.nivelRiesgoARL}
                    onChange={(e) => setFormData({ ...formData, nivelRiesgoARL: parseInt(e.target.value) as RiskLevel })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Clase 1 - Oficina (0.522%)</option>
                    <option value={2}>Clase 2 - Bajo riesgo (1.044%)</option>
                    <option value={3}>Clase 3 - Riesgo medio (2.436%)</option>
                    <option value={4}>Clase 4 - Mensajería/Motorizados (4.350%)</option>
                    <option value={5}>Clase 5 - Alto riesgo (6.960%)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Banco de Depósito</label>
                  <input
                    type="text"
                    value={formData.banco}
                    onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Número de Cuenta</label>
                  <input
                    type="text"
                    value={formData.numeroCuenta}
                    onChange={(e) => setFormData({ ...formData, numeroCuenta: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  {editingEmployee ? 'Actualizar Empleado' : 'Guardar Empleado'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
