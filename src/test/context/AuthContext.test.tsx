import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { AuthUser } from '../../types/payroll';

const mockAdminUser: AuthUser = {
  id: 'u-admin-1',
  cedula: '1053800001',
  nombre: 'Pedro',
  apellido: 'Guzmán',
  email: 'admin@sergem.com',
  rol: 'Administrativo',
  cargo: 'Director General',
};

// Test consumer component
const TestAuthConsumer = () => {
  const { authUser, isAuthenticated, setDemoUser, switchRole, signOut } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'AUTHENTICATED' : 'UNAUTHENTICATED'}</div>
      <div data-testid="user-role">{authUser?.rol || 'NO_ROLE'}</div>
      <div data-testid="user-name">{authUser?.nombre || 'NO_NAME'}</div>
      <button onClick={() => setDemoUser(mockAdminUser)} data-testid="login-admin-btn">
        Login as Admin
      </button>
      <button onClick={() => switchRole('Jefe de Zona')} data-testid="switch-zone-btn">
        Switch to Zone Chief
      </button>
      <button onClick={() => switchRole('Repartidor')} data-testid="switch-driver-btn">
        Switch to Driver
      </button>
      <button onClick={() => signOut()} data-testid="logout-btn">
        Log Out
      </button>
    </div>
  );
};

describe('AuthContext Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts unauthenticated when localStorage is empty and can authenticate via setDemoUser', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Initial state
    expect(screen.getByTestId('auth-status')).toHaveTextContent('UNAUTHENTICATED');

    // Authenticate
    await user.click(screen.getByTestId('login-admin-btn'));

    expect(screen.getByTestId('auth-status')).toHaveTextContent('AUTHENTICATED');
    expect(screen.getByTestId('user-role')).toHaveTextContent('Administrativo');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Pedro');
  });

  it('allows role switching once authenticated and updates user state', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByTestId('login-admin-btn'));

    expect(screen.getByTestId('auth-status')).toHaveTextContent('AUTHENTICATED');

    // Switch to Jefe de Zona
    await user.click(screen.getByTestId('switch-zone-btn'));
    expect(screen.getByTestId('user-role')).toHaveTextContent('Jefe de Zona');

    // Switch to Repartidor
    await user.click(screen.getByTestId('switch-driver-btn'));
    expect(screen.getByTestId('user-role')).toHaveTextContent('Repartidor');
  });

  it('handles signOut by resetting authenticated state', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByTestId('login-admin-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('AUTHENTICATED');

    await user.click(screen.getByTestId('logout-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('UNAUTHENTICATED');
    expect(screen.getByTestId('user-role')).toHaveTextContent('NO_ROLE');
  });
});
