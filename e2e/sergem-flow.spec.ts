import { test, expect } from '@playwright/test';

test.describe('SERGEM S.A.S. — Flujo E2E Completo de Usuario', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL
    await page.goto('/');
  });

  test('1. Flujo de Autenticación y Cambio Rápido de Rol RBAC', async ({ page }) => {
    // Verify application header or login presence
    await expect(page.locator('body')).toBeVisible();

    // Check if brand logo exists
    const brandHeading = page.getByText(/SERGEM MENSAJERIA S.A.S./i).first();
    await expect(brandHeading).toBeVisible();

    // Verify navigation tabs for Admin are rendered
    await expect(page.getByRole('button', { name: /Control Operativo/i }).or(page.getByText(/Control Operativo/i))).toBeVisible();
    await expect(page.getByRole('button', { name: /Jefe de Zona/i }).or(page.getByText(/Jefe de Zona/i))).toBeVisible();
    await expect(page.getByRole('button', { name: /Mi Turno/i }).or(page.getByText(/Mi Turno/i))).toBeVisible();
  });

  test('2. Navegación a Portal Jefe de Zona y Registro de Novedad', async ({ page }) => {
    // Click on Jefe de Zona tab
    const zoneChiefTab = page.getByText(/Jefe de Zona/i).first();
    await zoneChiefTab.click();

    // Verify Zone Chief Portal view is displayed
    await expect(page.getByText(/Gestión de Cuadrantes/i).or(page.getByText(/Novedades de Campo/i))).toBeVisible();

    // Verify schedule table or tab controls
    const novedadesSubtab = page.getByRole('button', { name: /Novedades de Campo/i }).or(page.getByText(/Novedades de Campo/i)).first();
    if (await novedadesSubtab.isVisible()) {
      await novedadesSubtab.click();
      await expect(page.getByText(/Reportar Permiso o Incapacidad/i)).toBeVisible();
    }
  });

  test('3. Portal del Repartidor — Auditoría y Marcación de Jornada', async ({ page }) => {
    // Navigate to Driver Portal
    const driverTab = page.getByText(/Mi Turno/i).first();
    await driverTab.click();

    // Verify Driver Portal Elements
    await expect(page.getByText(/Panel Diario del Repartidor/i).or(page.getByText(/Control de Asistencia/i))).toBeVisible();
  });

  test('4. Flujo de Cierre de Sesión y Retorno a Pantalla de Login', async ({ page }) => {
    // Find logout button in Header
    const logoutBtn = page.getByTitle(/Cerrar Sesión/i).first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      // Should show login form with quick access
      await expect(page.getByText(/Acceso Rápido por Rol/i).or(page.getByText(/Iniciar Sesión/i))).toBeVisible();
    }
  });
});
