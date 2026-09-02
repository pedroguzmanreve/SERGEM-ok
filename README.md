# SERGEM MENSAJERÍA S.A.S. — Sistema de Gestión Operativa, Nómina y Auditoría en Vivo

Aplicación integral fullstack desarrollada en **React 19**, **TypeScript**, **Tailwind CSS** y **Supabase** (PostgreSQL, Row Level Security, Storage & Realtime) para la empresa de logística y mensajería **SERGEM S.A.S.** (NIT 900.564.123-1, Manizales - Caldas).

---

## 🚀 Módulos Implementados

1. **Portal de Administración / Jefatura de Operaciones (`admin-portal`)**:
   - Tablero de control de turnos en tiempo real con estados de jornada (`PENDIENTE_INICIO`, `INICIADO`, `PARTIDO_PAUSA`, `FINALIZADO`).
   - Alertas preventivas y de retraso crítico con acceso directo a llamada telefónica y chat de WhatsApp con plantilla automática.
   - Bitácora de contactos y confirmación de inicio de turno.
   - Administración de colaboradores y liquidación periódica de nómina conforme a la legislación laboral colombiana (Leyes 2101 de 2021, horas extras diurnas/nocturnas/dominicales, auxilio de transporte, aportes a salud y pensión).

2. **Portal de Jefe de Zona (`zone-chief`)**:
   - Asignación de turnos (continuos y partidos) por cliente y sede.
   - Generación y exportación de novedades de campo por horas (permisos remunerados, no remunerados, incapacidades) con soporte adjunto (PDF / imágenes) en **Supabase Storage**.
   - Carga masiva y simulación de cuadrantes operativos.

3. **Portal del Repartidor (`driver-portal`)**:
   - Visualización de turno diario asignado, cliente y horario.
   - **Auditoría visual con cámara**: Captura o carga de foto de dotación con subida instantánea al bucket de Storage `driver-audits`.
   - Control de jornada (Inicio de turno, Inicio/Fin de jornada partida y Cierre de jornada).
   - Bitácora de encomiendas entregadas y cálculo de recargo por lluvia.

4. **Portal de Reportes de Clientes (`client-report`)**:
   - Registro y análisis de despachos, pedidos entregados y facturación por cliente corporativo (Almacenes Éxito, D1, Farmatodo, etc.).

---

## 🔐 Autenticación y RBAC (Control de Acceso Basado en Roles)

| Rol | Permisos |
|---|---|
| **Administrativo** | Acceso total: Parámetros de empresa, gestión de colaboradores, nómina, turnos, reportes y novedades. |
| **Jefe de Operaciones** | Gestión operativa: Monitoreo en vivo de repartidores, gestión de turnos, contactos de retraso y reportes de clientes. |
| **Jefe de Zona** | Cuadrantes de zona: Asignación de turnos a repartidores de su zona, registro de novedades con adjuntos y seguimiento de jornada. |
| **Repartidor** | Vista personal: Foto-auditoría obligatoria, marcación de jornada y registro de entregas. |

---

## 🧪 Pruebas Automatizadas y QA (Vitest & Playwright)

El proyecto cuenta con una suite completa de pruebas unitarias, de integración y end-to-end (E2E):

```bash
# Ejecutar suite de pruebas unitarias e integración
npm run test:run

# Modo interactivo / observador con Vitest
npm run test

# Reporte de cobertura de código
npm run test:coverage

# Pruebas End-to-End con Playwright
npx playwright test
```

### Cobertura de Pruebas:
- **`src/test/utils/payrollCalculator.test.ts`**: Cálculos de nómina colombiana (salario base, horas extras HED/HEN/RN, auxilio de transporte, deducciones al 4%, exención Art. 114-1).
- **`src/test/services/api.test.ts`**: Mapeo y transformación de entidades PostgreSQL hacia modelos de dominio TypeScript, inserción y consultas.
- **`src/test/services/storage.test.ts`**: Gestión de URLs públicas, URLs firmadas con caducidad y subida binaria / Base64.
- **`src/test/context/AuthContext.test.tsx`**: Estados de autenticación, conmutación de roles RBAC y persistencia segura.
- **`src/test/components/Header.test.tsx`** & **`FileUpload.test.tsx`**: Renderizado de badges, validación de tipos/tamaño de archivo y eventos de usuario.
- **`e2e/sergem-flow.spec.ts`**: Validación E2E del ciclo de vida de usuario (Login -> Navegación RBAC -> Registro de Novedad -> Control de Turno -> Logout).

---

## 🔄 Pipeline de Integración Continua (CI/CD)

El repositorio incluye el flujo de trabajo `.github/workflows/deploy.yml` que se ejecuta en cada `push` o `pull request` a la rama `main`:
1. **Lint & TypeCheck**: Validación estricta con `tsc --noEmit`.
2. **Automated Tests**: Ejecución de las pruebas unitarias y de integración con Vitest.
3. **Build**: Compilación optimizada para producción (`vite build`).
4. **E2E Testing**: Ejecución de Playwright sobre entorno Chromium headless.
5. **Artifact Release**: Generación y almacenamiento del paquete compilado en `dist/`.

---

## 🌐 Configuración de Despliegue en Producción

### Vercel (`vercel.json`)
El archivo `vercel.json` incluye reglas de rewrite SPA (`source: /(.*) -> /index.html`) y encabezados de seguridad HTTP (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`).

### Netlify (`netlify.toml`)
El archivo `netlify.toml` incluye redirección `/* -> /index.html 200` y políticas de inmutabilidad para la carpeta `/assets`.

### Variables de Entorno en Hosting (Production Checklist)
Configurar en el panel del proveedor (Vercel Settings -> Environment Variables o Netlify Site Settings):
- `VITE_SUPABASE_URL`: `https://[tu-proyecto].supabase.co`
- `VITE_SUPABASE_ANON_KEY`: Clave pública anónima de Supabase
- `APP_URL`: Dominio de producción (ej. `https://app.sergem.com.co`)

---

## 🗄️ Esquema de Base de Datos y Supabase Storage

### 1. Tablas en PostgreSQL
- `company_settings`: Parámetros de nómina (salario mínimo, auxilio de transporte, porcentajes de ley).
- `employees`: Colaboradores con roles, zonas y cargos.
- `payroll_periods`: Periodos quincenales / mensuales de corte.
- `employee_novedades`: Novedades consolidadas por periodo (horas extras, comisiones, deducciones).
- `weekly_schedules`: Cuadrante semanal y turnos asignados por día.
- `zone_novedades`: Novedades reportadas por jefes de zona con archivo soporte (`archivo_url`).
- `driver_daily_attendances`: Asistencia y auditoría de foto en vivo (`foto_auditoria`, `estado`, `ultimo_contacto`).
- `client_order_reports`: Reportes de paquetes y tarifas por cliente.

### 2. Buckets de Supabase Storage
- `driver-audits`: Fotografías de carnet y dotación capturadas al inicio del turno (público / lectura RLS).
- `novedades-attachments`: Certificados médicos, incapacidades y permisos (privado / lectura restringida por RLS).
- `payroll-receipts`: Desprendibles de nómina en formato PDF.
- `employee-docs`: Hojas de vida y contratos de colaboradores.
