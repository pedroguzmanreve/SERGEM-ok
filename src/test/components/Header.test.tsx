import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../../components/Header';
import { CompanySettings, PayrollPeriod, AuthUser } from '../../types/payroll';

const mockCompany: CompanySettings = {
  nombreEmpresa: 'SERGEM MENSAJERIA S.A.S.',
  nit: '900.564.123-1',
  direccion: 'Cra 23 # 45-12',
  telefono: '(606) 884-1234',
  ciudad: 'Manizales',
  email: 'contacto@sergem.com.co',
  smmlv: 1423500,
  auxilioTransporteMensual: 200000,
  jornadaMaximaSemanal: 42,
  jornadaDiariaBase: 7,
  porcentajeSaludEmpleado: 0.04,
  porcentajePensionEmpleado: 0.04,
  porcentajeSaludEmpresa: 0.085,
  porcentajePensionEmpresa: 0.12,
  porcentajeCajaCompensacion: 0.04,
  porcentajeSena: 0.02,
  porcentajeICBF: 0.03,
  aplicaExencionArt114: true,
  tarifasGeneralesClientes: {
    tarifaBasePaquete: 4500,
    tarifaHoraOrdinaria: 14500,
    tarifaHoraExtraDiurna: 18125,
    tarifaHoraExtraNocturna: 25375,
    tarifaSalidaFueraPerimetro: 22000,
    tarifaRecargoDominical: 25375,
    tarifaRecargoNocturno: 5075,
  },
  tarifasARL: { 1: 0.00522, 2: 0.01044, 3: 0.02436, 4: 0.04350, 5: 0.06960 },
};

const mockPeriods: PayrollPeriod[] = [
  {
    id: 'p-1',
    nombrePeriodo: '1ra Quincena Marzo 2026',
    fechaInicio: '2026-03-01',
    fechaFin: '2026-03-15',
    diasBasePeriodo: 15,
    tipoPeriodo: 'Quincenal',
    estado: 'Borrador',
    fechaLiquidacion: '2026-03-15',
  },
];

const mockUser: AuthUser = {
  id: 'u-1',
  cedula: '1053800001',
  nombre: 'Pedro',
  apellido: 'Guzmán',
  email: 'admin@sergem.com',
  rol: 'Administrativo',
  cargo: 'Director General',
};

describe('Header Component Tests', () => {
  it('renders company brand and user identity badge', () => {
    render(
      <Header
        company={mockCompany}
        activePeriod={mockPeriods[0]}
        periods={mockPeriods}
        currentUser={mockUser}
        isSyncing={false}
        syncStatus="synced"
        isRealtimeActive={true}
        onSelectPeriod={vi.fn()}
        onOpenSettings={vi.fn()}
        onNewPeriod={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByText('SERGEM MENSAJERIA S.A.S.')).toBeInTheDocument();
    expect(screen.getByText('Pedro Guzmán')).toBeInTheDocument();
    expect(screen.getByText('Administrativo')).toBeInTheDocument();
    expect(screen.getByText('En Tiempo Real')).toBeInTheDocument();
  });

  it('triggers onLogout callback when logout button is clicked', async () => {
    const onLogoutMock = vi.fn();
    const user = userEvent.setup();

    render(
      <Header
        company={mockCompany}
        activePeriod={mockPeriods[0]}
        periods={mockPeriods}
        currentUser={mockUser}
        onSelectPeriod={vi.fn()}
        onOpenSettings={vi.fn()}
        onNewPeriod={vi.fn()}
        onLogout={onLogoutMock}
      />
    );

    const logoutBtn = screen.getByTitle(/Cerrar Sesión/i);
    await user.click(logoutBtn);

    expect(onLogoutMock).toHaveBeenCalledTimes(1);
  });
});
