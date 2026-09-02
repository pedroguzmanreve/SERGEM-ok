# SERGEM MENSAJERÍA S.A.S. — Documento de Arquitectura del Sistema (SAD)

**Sistema:** Sistema de Gestión Operativa, Nómina y Auditoría en Vivo  
**Empresa:** SERGEM MENSAJERÍA S.A.S. (NIT 900.564.123-1, Manizales - Caldas)  
**Versión:** 2026.3.1  
**Estado:** Producción  

---

## 1. Resumen Ejecutivo y Objetivos del Sistema

El sistema **SERGEM S.A.S.** es una plataforma empresarial fullstack diseñada para centralizar:
1. **Control de Asistencia y Turnos en Vivo**: Seguimiento de motorizados y repartidores en tiempo real con estados de jornada (`PENDIENTE_INICIO`, `INICIADO`, `PARTIDO_PAUSA`, `FINALIZADO`).
2. **Auditoría Visual de Dotación y Carnet**: Captura fotográfica con almacenamiento en Supabase Storage y validación previa a la habilitación de rutas.
3. **Planificación de Cuadrantes Operativos**: Asignación de turnos continuos y partidos por cliente y sede por los Jefes de Zona.
4. **Novedades de Campo y Nómina Colombiana**: Registro de incapacidades y permisos por horas con soporte documental, y liquidación automática de nómina bajo las leyes laborales vigentes (Ley 2101 de 2021 de reducción de jornada a 42h, horas extras diurnas/nocturnas/dominicales, auxilio de transporte condicional y exención Art. 114-1 del E.T.).
5. **Control de Rentabilidad por Cliente**: Facturación de horas de mensajería, paquetes despachados y recargos por clima lluvioso.

---

## 2. Arquitectura de Alto Nivel (Modelo C4)

### 2.1 Diagrama de Contexto del Sistema (C4 Level 1)
```
+-----------------------------------------------------------------------------------+
|                                SERGEM ECOSYSTEM                                   |
|                                                                                   |
|  [Administrativos]    [Jefes de Operaciones]    [Jefes de Zona]    [Repartidores] |
|         |                      |                       |                 |        |
+---------+----------------------+-----------------------+-----------------+--------+
          |                      |                       |                 |
          +----------------------+-----------+-----------+-----------------+
                                             |
                                      (HTTPS / TLS 1.3)
                                             v
                           +-----------------------------------+
                           |   SERGEM S.A.S. Web Application   |
                           |   (React 19 + TypeScript + Vite)  |
                           +-----------------+-----------------+
                                             |
                   +-------------------------+-------------------------+
                   | (REST API / PostgREST)  | (WSS Realtime Channels) | (Multipart / S3)
                   v                         v                         v
       +-----------------------+ +-----------------------+ +-----------------------+
       |   Supabase Database   | |   Supabase Realtime   | |   Supabase Storage    |
       |  (PostgreSQL 16 Engine| |  (Postgres CDC Events | | (Object Storage S3-   |
       |   + RLS Row Security) | |   Pub/Sub WebSockets) | |  compatible Buckets)  |
       +-----------------------+ +-----------------------+ +-----------------------+
```

### 2.2 Diagrama de Contenedores y Módulos de Frontend (C4 Level 2 & 3)
```
/src
├── main.tsx                # Entrypoint con Telemetry & Web Vitals bootstrap
├── App.tsx                 # Core Shell con Code Splitting (React.lazy + Suspense)
├── context/
│   ├── AuthContext.tsx     # RBAC State, Session Token & Role Switching
│   └── ToastContext.tsx    # Sistema global de notificaciones y alertas
├── hooks/
│   └── useRealtime.ts      # WebSocket CDC subscription (PostgreSQL Changes)
├── services/
│   ├── api.ts              # Data Access Layer con Mapeo CamelCase <-> snake_case
│   ├── storage.ts          # Integración con Buckets de Supabase Storage
│   ├── telemetry.ts        # Monitor de errores y Core Web Vitals
│   └── monitoring.ts       # SRE Health Checks & Network Probes
├── components/
│   ├── AdminPortalView.tsx      # Tablero Administrativo & Nómina (Lazy)
│   ├── ZoneChiefPortalView.tsx  # Cuadrante Semanal y Novedades de Campo (Lazy)
│   ├── DriverPortalView.tsx     # Marcación de Turno & Foto-Auditoría (Lazy)
│   ├── ClientReportsView.tsx    # Reportes Operativos & Facturación (Lazy)
│   ├── Header.tsx               # Barra superior con estado Realtime y Sesión
│   ├── Navigation.tsx           # Pestañas adaptativas según rol RBAC
│   ├── FileUpload.tsx           # Dropzone con soporte Drag&Drop y previsualización
│   └── ErrorBoundary.tsx        # Captura de excepciones con telemetría
└── utils/
    ├── payrollCalculator.ts     # Motor de liquidación laboral colombiana
    └── formatters.ts            # Formateo monetario COP, fechas y teléfonos
```

---

## 3. Matriz de Control de Acceso Basado en Roles (RBAC)

El sistema aplica una estrategia de seguridad defensiva en profundidad:
1. **Validación en Cliente (Client-Side Guards)**: Componente `ProtectedRoute` y filtrado condicional en `Navigation`.
2. **Seguridad en Base de Datos (Database-Side RLS)**: Políticas de Row Level Security en PostgreSQL en cada tabla.

| Módulo / Funcionalidad | Administrativo | Jefe de Operaciones | Jefe de Zona | Repartidor |
|---|:---:|:---:|:---:|:---:|
| **Tablero de Monitoreo en Vivo** | Total | Total | Zona Asignada | ❌ |
| **Alertas de Retraso y Llamadas** | Total | Total | Zona Asignada | ❌ |
| **Configuración y Parámetros Nómina** | Total | Lectura | ❌ | ❌ |
| **Gestión de Colaboradores** | Total | Lectura | Lectura (Zona) | ❌ |
| **Liquidación y Desprendibles** | Total | Lectura | ❌ | ❌ |
| **Asignación de Cuadrantes / Turnos** | Total | Total | Zona Asignada | ❌ |
| **Registro de Novedades de Campo** | Total | Total | Total (con Adjuntos)| ❌ |
| **Foto-Auditoría de Dotación** | Auditoría | Auditoría | Auditoría | Subida Propia |
| **Marcación de Entrada / Cierre** | ❌ (Solo Admin)| ❌ (Solo Admin)| ❌ (Solo Admin)| Marcación Propia |
| **Registro de Encomiendas y Lluvia** | ❌ | ❌ | ❌ | Registro Propio |
| **Reportes y Facturación Clientes** | Total | Total | Zona Asignada | ❌ |

---

## 4. Esquema de Base de Datos y Políticas RLS

### 4.1 Tablas en PostgreSQL
- `company_settings`: Configuración empresarial (NIT, SMMLV, auxilio transporte, tarifas ARL).
- `employees`: Datos personales, contractuales, bancarios y afiliaciones de seguridad social.
- `payroll_periods`: Periodos quincenales / mensuales de nómina con estados (`Borrador`, `Aprobada`, `Pagada`).
- `employee_novedades`: Novedades consolidadas por periodo (horas extras, deducciones, préstamos).
- `weekly_schedules`: Matriz semanal de turnos por colaborador, cliente y sede.
- `zone_novedades`: Novedades reportadas en campo por horas con soporte documental (`archivo_url`).
- `driver_daily_attendances`: Marcación diaria, estado de jornada, hora inicio/fin y foto de carnet (`foto_auditoria`).
- `client_order_reports`: Reportes de despachos, paquetes y tarifas cobradas a clientes corporativos.

### 4.2 Buckets de Supabase Storage
1. **`driver-audits`**:
   - Tipo: Público para lectura autenticada / subida con prefijo de fecha y cédula.
   - Contenido: Imágenes JPEG/PNG capturadas por la cámara del repartidor al inicio del turno.
2. **`novedades-attachments`**:
   - Tipo: Privado con RLS / acceso restringido a Jefes de Zona y Administrativos.
   - Contenido: Certificados médicos de EPS, resoluciones de incapacidad y permisos.
3. **`payroll-receipts`**:
   - Tipo: Privado / Desprendibles generados en PDF.

---

## 5. Arquitectura de Reactividad y Realtime (WebSockets)

Para permitir que los Jefes de Operaciones visualicen al instante las marcaciones de los repartidores sin recargar la página:
1. **PostgreSQL Change Data Capture (CDC)**: Cada `INSERT` o `UPDATE` en `driver_daily_attendances` dispara un evento a través del canal `realtime:public:driver_daily_attendances`.
2. **Hook `useRealtime`**: Se suscribe a los canales de Supabase y actualiza de manera reactiva el mapa en memoria (`attendanceMap`).
3. **Sincronización Optimista (Optimistic UI)**: Cuando un repartidor inicia turno, el estado se refleja instantáneamente en la interfaz antes de que finalice el viaje de red.

---

## 6. Postura de Ciberseguridad y Hardening

1. **Cifrado**:
   - En tránsito: TLS 1.3 forzado mediante HSTS (`max-age=63072000; includeSubDomains; preload`).
   - En reposo: Cifrado AES-256 en almacenamiento y base de datos gestionada por Supabase.
2. **Cabeceras HTTP de Seguridad (HTTP Security Headers)**:
   - `Content-Security-Policy (CSP)`: Control estricto de orígenes para scripts, estilos, fuentes e imágenes.
   - `X-Frame-Options: SAMEORIGIN`
   - `X-Content-Type-Options: nosniff`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=()`
3. **Manejo Seguro de Credenciales**:
   - No se almacenan claves de servicio (`service_role`) en el cliente.
   - Tokens de sesión se almacenan en almacenamiento local con validación de caducidad.
