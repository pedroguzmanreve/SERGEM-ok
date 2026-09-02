# SERGEM MENSAJERÍA S.A.S. — Manual de Usuario y Guía de Operación

**Aplicación:** Sistema de Gestión Operativa, Nómina y Auditoría en Vivo  
**Empresa:** SERGEM MENSAJERÍA S.A.S. (NIT 900.564.123-1, Manizales - Caldas)  
**Versión:** 2026.3.1  
**Audiencia:** Administradores, Jefes de Operaciones, Jefes de Zona, Repartidores y Clientes Corporativos  

---

## 1. Introducción y Acceso al Sistema

El sistema **SERGEM S.A.S.** es una solución web integral diseñada para la optimización de rutas de mensajería, control de asistencia en tiempo real con foto-auditoría, gestión de cuadrantes operativos por sede y liquidación automatizada de nómina bajo la legislación laboral colombiana.

### 1.1 Requisitos Técnicos Mínimos
- **Navegadores Soportados:** Google Chrome (v110+), Mozilla Firefox (v115+), Microsoft Edge (v110+), Safari (v16+).
- **Dispositivos Móviles:** Teléfonos Android e iOS con cámara funcional para repartidores y jefes de zona.
- **Conectividad:** Conexión a Internet (3G/4G/5G o Wi-Fi) para sincronización en tiempo real vía WebSockets.

### 1.2 Inicio de Sesión y Autenticación
1. Ingrese a la URL de la plataforma (`https://app.sergem.com.co` o entorno asignado).
2. En la pantalla de inicio de sesión:
   - Ingrese su **Cédula de Ciudadanía** o correo corporativo.
   - Ingrese su **Contraseña**.
   - O utilice los botones de **Acceso Rápido por Rol** para demostración y pruebas operativas.
3. Al autenticarse, el sistema cargará automáticamente el portal y las opciones de navegación correspondientes a su rol asignado.

---

## 2. Guía de Operación por Rol

---

### 2.1 Portal del Administrador (Gerencia y Recursos Humanos)

El Administrador tiene control total sobre los parámetros de la empresa, colaboradores, periodos de liquidación y monitoreo en vivo.

#### A. Tablero de Monitoreo de Asistencia en Tiempo Real
- **Ubicación:** Pestaña `Control Operativo` > Subpestaña `Monitoreo en Vivo`.
- **Funcionalidades:**
  - **Indicadores Clave:** Total de turnos asignados, repartidores en ruta (`INICIADO`), pausas de jornada partida (`PARTIDO_PAUSA`), turnos completados (`FINALIZADO`) y alertas de retraso (`PENDIENTE_INICIO`).
  - **Acción Inmediata ante Retrasos:**
    - **Llamar al Repartidor:** Clic en el botón verde con ícono de teléfono para iniciar marcación celular directa.
    - **Chat de WhatsApp:** Clic en el botón con ícono de mensaje para abrir WhatsApp Web/App con un mensaje predeterminado:
      > *"Hola [Nombre], te contactamos de SERGEM Operaciones. Registras turno programado a las [Hora] en [Cliente] y aún no reportas inicio de jornada. Por favor confirma tu estado."*
    - **Confirmar Inicio:** Clic en el botón de confirmación verde si el colaborador reportó su ingreso por radio o llamada.

#### B. Gestión de Colaboradores (Directorio de Empleados)
- **Ubicación:** Pestaña `Control Operativo` > Subpestaña `Gestión de Colaboradores`.
- **Agregar Nuevo Colaborador:**
  1. Clic en **"+ Nuevo Empleado"**.
  2. Diligenciar: Cédula, Nombres, Apellidos, Cargo, Rol (Administrativo, Jefe de Operaciones, Jefe de Zona, Repartidor), Salario Base, Nivel de Riesgo ARL (Nivel 4 para motorizados), Banco, Tipo y Número de Cuenta, EPS, Fondo de Pensiones (AFP) y Caja de Compensación (CCF).
  3. Clic en **"Guardar Colaborador"**.
- **Editar / Desactivar:** Permite modificar datos bancarios o actualizar el estado contractual del colaborador.

#### C. Liquidación de Nómina Colombiana
- **Ubicación:** Pestaña `Control Operativo` > Subpestaña `Liquidación de Nómina`.
- **Procedimiento de Liquidación Quincenal/Mensual:**
  1. **Selección de Periodo:** Seleccione el periodo activo en la barra superior o cree uno nuevo con el botón **"+ Nuevo Periodo"**.
  2. **Registro de Novedades Consolidadas:** Clic en el botón de lápiz al lado de cada empleado para ingresar:
     - Días laborados en la quincena (base 15 días).
     - Horas extras diurnas (HED 25%), nocturnas (HEN 75%), dominicales diurnas (HEDDF 100%) o dominicales nocturnas (HENDF 150%).
     - Recargo nocturno ordinario (RN 35%) y dominical (RD 75%).
     - Comisiones por entregas, bonificaciones y préstamos/deducciones de nómina.
  3. **Visualización de Resultados:** La tabla calcula automáticamente el total devengado, auxilio de transporte ($200.000/mes para $\le 2$ SMMLV), deducción de salud (4%), deducción de pensión (4%), parafiscales (SENA, ICBF, Caja) y provisiones de prestaciones sociales (Cesantías 8.33%, Intereses 1%, Prima 8.33%, Vacaciones 4.17%).
  4. **Exportar a Excel / CSV:** Clic en **"Exportar Nómina"** para generar la sábana de liquidación lista para la dispersión bancaria y la PILA.

#### D. Parámetros de Empresa y Ley Laboral
- **Ubicación:** Clic en el ícono de engranaje en la barra superior (`Configuración de Empresa`).
- **Valores Configurables:** SMMLV vigente ($1.423.500 COP), Auxilio de Transporte ($200.000 COP), Jornada máxima semanal (42 horas Ley 2101), tarifas de cobro a clientes corporativos y exención tributaria del Art. 114-1 del Estatuto Tributario.

---

### 2.2 Portal del Operador (Jefe de Zona y Operaciones)

El Jefe de Zona administra los cuadrantes de trabajo de los motorizados asignados a su sector y reporta novedades de campo con evidencia digital.

#### A. Asignación y Programación de Cuadrantes Semanales
- **Ubicación:** Pestaña `Jefe de Zona` > Subpestaña `Gestión de Cuadrantes`.
- **Programar Turno:**
  1. Seleccionar la semana de trabajo y el cliente (ej. Almacenes Éxito Centro, Farmatodo Palermo, D1 Chipre).
  2. Para cada repartidor, seleccionar el tipo de jornada:
     - **Turno Continuo:** Hora de entrada y hora de salida (ej. 08:00 a 16:00).
     - **Turno Partido:** Primer bloque (ej. 08:00 a 12:00) y segundo bloque (ej. 14:00 a 18:00).
     - **Descanso Programado:** Marca el día libre del colaborador.
  3. Clic en **"Guardar Cuadrante"**.

#### B. Registro de Novedades de Campo con Adjuntos
- **Ubicación:** Pestaña `Jefe de Zona` > Subpestaña `Novedades de Campo`.
- **Paso a Paso para Reportar Incapacidad o Permiso:**
  1. Clic en **"+ Reportar Novedad de Campo"**.
  2. Seleccionar el Repartidor y la Fecha.
  3. Seleccionar el **Tipo de Novedad**:
     - *Incapacidad Médica*: Requiere certificado de la EPS.
     - *Permiso Remunerado*: Aprobado por la jefatura.
     - *Permiso No Remunerado*: Descuenta horas de la quincena.
  4. Ingresar la hora de inicio, hora de fin y duración en horas.
  5. **Cargar Soporte Documental (Drag & Drop):**
     - Arrastre el archivo (PDF, JPG, PNG de hasta 10 MB) al área de carga o haga clic para seleccionarlo de su dispositivo.
     - El componente subirá el archivo directamente a **Supabase Storage** (`novedades-attachments`) de forma cifrada.
  6. Ingresar observaciones pertinentes y hacer clic en **"Guardar Novedad"**.

---

### 2.3 Portal del Repartidor (Motorizados y Mensajeros)

Diseñado para uso en teléfonos móviles por parte de los mensajeros en calle.

#### A. Consulta de Turno Asignado
- Al iniciar sesión con rol **Repartidor**, la pantalla muestra:
  - Cliente asignado y sede de despacho.
  - Horario programado del día.
  - Indicador de estado del turno en tiempo real.

#### B. Foto-Auditoría Obligatoria de Dotación
- Antes de iniciar la jornada, el sistema solicita la verificación visual de dotación y carnet:
  1. Clic en el botón **"Tomar Foto / Cargar Evidencia"**.
  2. El navegador activará la cámara del dispositivo móvil.
  3. Encuadre el carnet corporativo y la indumentaria de seguridad (chaleco reflectivo, casco reglamentario).
  4. Capture la fotografía o seleccione una imagen de la galería.
  5. El sistema cargará automáticamente la foto al bucket `driver-audits`.

#### C. Control de Marcación de Jornada
- **Iniciar Turno:** Clic en **"Iniciar Jornada"**. El estado cambiará a `INICIADO` y se notificará en tiempo real al tablero de monitoreo.
- **Pausa de Jornada Partida (si aplica):** Clic en **"Iniciar Pausa de Almuerzo / Descanso"**. El estado cambiará a `PARTIDO_PAUSA`.
- **Reanudar Turno:** Clic en **"Reanudar Jornada"**.
- **Finalizar Jornada:** Al culminar las entregas, clic en **"Finalizar Turno"** e ingresar el kilometraje de cierre o paquetes entregados.

#### D. Registro de Encomiendas y Recargo por Clima (Lluvia)
- Registre la cantidad de paquetes entregados durante el día.
- En caso de condiciones climáticas adversas, active la casilla **"Recargo por Lluvia"** para liquidar la bonificación de rodamiento correspondiente.

---

### 2.4 Portal de Reportes de Clientes Corporativos

Permite a la gerencia y a los clientes empresariales auditar los despachos y la facturación asociada.

- **Ubicación:** Pestaña `Reportes Clientes`.
- **Filtros Disponibles:**
  - Rango de fechas (desde/hasta).
  - Cliente específico (Éxito, D1, Farmatodo, etc.).
- **Métricas Visibles:** Total de horas ordinarias facturadas, horas extras diurnas y nocturnas, número total de paquetes despachados, recargos por fuera de perímetro urbano y valor consolidado a facturar.
- **Exportación:** Generación de resúmenes en formato CSV y PDF para soporte de facturación electrónica.

---

## 3. Solución de Problemas Frecuentes (FAQ)

| Problema | Causa Probable | Solución |
|---|---|---|
| *No se activa la cámara para la foto-auditoría.* | Permiso bloqueado en el navegador móvil. | Ingrese a la configuración del navegador > Permisos del sitio > Permitir acceso a la Cámara. |
| *El estado de los repartidores no se actualiza automáticamente.* | Pérdida momentánea de conexión WebSocket. | Verifique el badge "En Tiempo Real" en la barra superior. Si aparece "Desconectado", recargue la página. |
| *Error al subir archivo de incapacidad.* | Archivo excede 10 MB o formato no permitido. | Asegúrese de que el archivo sea PDF, JPG o PNG y pese menos de 10 MB. |
| *No coinciden los cálculos de horas extras.* | Jornada base no ajustada a la Ley 2101 (42 horas). | Verifique en Configuración que la jornada base esté configurada en 42h/semana (7h/día). |
