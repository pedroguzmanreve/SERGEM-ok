import React from 'react';
import {
  ShieldCheck,
  CalendarDays,
  Building2,
  Truck,
  Lock,
} from 'lucide-react';
import { AuthUser, UserRole } from '../types/payroll';

export type TabType =
  | 'admin-portal'
  | 'zone-chief'
  | 'driver-portal'
  | 'client-report';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  employeeCount: number;
  currentUser?: AuthUser | null;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  employeeCount,
  currentUser,
}) => {
  const userRole: UserRole = currentUser?.rol || 'Administrativo';

  const allTabs: {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    allowedRoles: UserRole[];
  }[] = [
    {
      id: 'admin-portal',
      label: 'Portal Administración',
      icon: ShieldCheck,
      badge: `${employeeCount} Colaboradores`,
      allowedRoles: ['Administrativo', 'Jefe de Operaciones'],
    },
    {
      id: 'zone-chief',
      label: 'Portal Jefe de Zona',
      icon: CalendarDays,
      badge: 'Turnos & Novedades',
      allowedRoles: ['Administrativo', 'Jefe de Operaciones', 'Jefe de Zona'],
    },
    {
      id: 'driver-portal',
      label: 'Portal Repartidor',
      icon: Truck,
      badge: 'Auditoría & Check-in',
      allowedRoles: ['Administrativo', 'Jefe de Operaciones', 'Jefe de Zona', 'Repartidor'],
    },
    {
      id: 'client-report',
      label: 'Reporte Clientes (42h)',
      icon: Building2,
      badge: 'Facturación & Horas',
      allowedRoles: ['Administrativo', 'Jefe de Operaciones', 'Jefe de Zona'],
    },
  ];

  return (
    <nav id="main-navigation" className="bg-white border-b border-slate-200/90 sticky top-[57px] z-20 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-2 sm:space-x-3 overflow-x-auto py-2.5 scrollbar-none items-center">
          {allTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            const isAuthorized = tab.allowedRoles.includes(userRole);

            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`inline-flex items-center px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/25 ring-1 ring-red-600'
                    : isAuthorized
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 opacity-80'
                }`}
              >
                <Icon className={`w-4 h-4 mr-2 transition-colors ${isActive ? 'text-white' : isAuthorized ? 'text-slate-500' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {!isAuthorized && (
                  <Lock className="w-3 h-3 ml-1.5 text-slate-400" />
                )}
                {tab.badge && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-md font-semibold transition-colors ${
                      isActive
                        ? 'bg-red-700/80 text-white'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/70'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
