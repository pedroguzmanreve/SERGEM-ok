import React from 'react';
import {
  ShieldCheck,
  CalendarDays,
  Building2,
  Truck
} from 'lucide-react';

import { AppRole } from '../types/payroll';

export type TabType =
  | 'admin-portal'
  | 'zone-chief'
  | 'driver-portal'
  | 'client-report';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  employeeCount: number;
  currentRole: AppRole;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  employeeCount,
  currentRole,
}) => {
  const allTabs: {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    allowedRoles: AppRole[];
  }[] = [
    {
      id: 'admin-portal',
      label: 'Portal Administración',
      icon: ShieldCheck,
      badge: `${employeeCount} Colab.`,
      allowedRoles: ['Administrativo'],
    },
    {
      id: 'zone-chief',
      label: 'Portal Jefe de Zona',
      icon: CalendarDays,
      badge: 'Turnos',
      allowedRoles: ['Jefe de Zona'],
    },
    {
      id: 'driver-portal',
      label: 'Portal Repartidor',
      icon: Truck,
      badge: currentRole === 'Repartidor' ? 'Mis Turnos' : 'Supervisión',
      allowedRoles: ['Repartidor'],
    },
    {
      id: 'client-report',
      label: 'Portal Clientes & Reportes',
      icon: Building2,
      badge: 'Clientes & 42h',
      allowedRoles: ['Administrativo', 'Jefe de Zona'],
    },
  ];

  const visibleTabs = allTabs.filter((t) => t.allowedRoles.includes(currentRole));

  return (
    <nav id="main-navigation" className="bg-white border-b border-slate-200/90 sticky top-[57px] z-20 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-2 sm:space-x-3 overflow-x-auto py-2.5 scrollbar-none items-center">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`inline-flex items-center px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/25 ring-1 ring-red-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 mr-2 transition-colors ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
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

