import * as XLSX from 'xlsx';

/**
 * Genera y descarga directamente en el navegador la plantilla oficial de Excel
 * para el registro y carga masiva de clientes corporativos de SERGEM S.A.S.
 *
 * Utiliza un Blob binario con el tipo MIME correcto para evitar que navegadores
 * o entornos en iframes interpreten la descarga como una página HTML.
 */
export function downloadClientExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Clientes_SERGEM
  const clientsData = [
    [
      'NIT / Identificación',
      'Nombre o Razón Social *',
      'Ciudad *',
      'Dirección de Sede / Muelle',
      'Nombre Supervisor / Contacto',
      'Teléfono Celular (WhatsApp)',
      'Correo Electrónico Contacto',
      'Tarifa Base por Hora ($ COP)',
      'Observaciones Operativas / EPP',
      'Estado (Activo / Inactivo)'
    ],
    [
      '890.900.608-9',
      'ALKOSTO CALI (HIPERAHORRO)',
      'Cali',
      'Av. Pasoancho # 80-120, Bodega 4',
      'Liceth Morales',
      '3154567890',
      'logistica.cali@alkosto.com.co',
      12500,
      'Ingreso con botas de seguridad y carné de ARL vigente. Despacho matutino.',
      'Activo'
    ],
    [
      '900.123.456-1',
      'TCC LOGÍSTICA S.A.S. - VALLE',
      'Yumbo',
      'Zona Industrial Acopi, Calle 15 # 22-45',
      'Ing. Carlos Ruiz',
      '3109876543',
      'operaciones.valle@tcc.com.co',
      14000,
      'Cargue diario de 6:00 AM a 8:00 AM. Control estricto de paquetes y remisiones.',
      'Activo'
    ],
    [
      '901.456.789-2',
      'DISTRIBUIDORA DE MEDICAMENTOS DEL VALLE S.A.S.',
      'Palmira',
      'Parque Industrial La Dolores, Bodega 12',
      'Dra. Patricia Gómez',
      '3201234567',
      'despachos@distrimedvalle.com',
      13500,
      'Exclusivo reparto motorizado con maletín térmico para transporte de medicamentos.',
      'Activo'
    ]
  ];

  const wsClients = XLSX.utils.aoa_to_sheet(clientsData);

  wsClients['!cols'] = [
    { wch: 22 }, // NIT
    { wch: 38 }, // Nombre
    { wch: 16 }, // Ciudad
    { wch: 38 }, // Dirección
    { wch: 28 }, // Contacto
    { wch: 20 }, // Teléfono
    { wch: 32 }, // Correo
    { wch: 26 }, // Tarifa
    { wch: 45 }, // Observaciones
    { wch: 18 }  // Estado
  ];

  XLSX.utils.book_append_sheet(wb, wsClients, 'Clientes_SERGEM');

  // Hoja 2: Guia_y_Condiciones
  const instructionsData = [
    ['SERGEM MENSAJERÍA Y LOGÍSTICA S.A.S. - GUÍA DE CARGA MASIVA DE CLIENTES'],
    ['Instrucciones para diligenciar la plantilla oficial de clientes corporativos:'],
    [''],
    ['Campo', 'Obligatorio', 'Descripción y Formato', 'Ejemplo'],
    ['NIT / Identificación', 'Opcional', 'Número de Identificación Tributaria con o sin guion', '890.900.608-9'],
    ['Nombre o Razón Social', 'SÍ (Obligatorio)', 'Razón social completa o nombre comercial de la empresa cliente', 'ALKOSTO CALI'],
    ['Ciudad', 'Recomendado', 'Ciudad sede de despacho (Cali, Yumbo, Palmira, Jamundí, etc.)', 'Cali'],
    ['Dirección de Sede', 'Opcional', 'Dirección de bodega, muelle o sede administrativa', 'Av. Pasoancho # 80-120'],
    ['Nombre Supervisor', 'Opcional', 'Persona encargada de coordinar los repartidores de SERGEM', 'Liceth Morales'],
    ['Teléfono Celular', 'Opcional', 'Número móvil o fijo para contacto y notificaciones WhatsApp', '3154567890'],
    ['Correo Electrónico', 'Opcional', 'Correo para envío de informes y novedades operativas', 'logistica@cliente.com'],
    ['Tarifa Base por Hora', 'Opcional', 'Tarifa estándar acordada por hora de servicio (número sin puntos)', '12500'],
    ['Observaciones', 'Opcional', 'Requisitos de EPP, horarios de descargue o restricciones', 'Uso obligatorio de chaleco'],
    ['Estado', 'Opcional', 'Activo o Inactivo (por defecto Activo)', 'Activo'],
    [''],
    ['Nota: Las 3 filas iniciales son de ejemplo y la plataforma las identifica automáticamente para desmarcarlas con un clic al importar.']
  ];

  const wsGuia = XLSX.utils.aoa_to_sheet(instructionsData);
  wsGuia['!cols'] = [
    { wch: 25 },
    { wch: 18 },
    { wch: 60 },
    { wch: 28 }
  ];

  XLSX.utils.book_append_sheet(wb, wsGuia, 'Guia_y_Condiciones');

  // Generación binaria y descarga segura mediante Blob
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Plantilla_Registro_Clientes_SERGEM.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Genera y descarga la plantilla oficial de colaboradores
 */
export function downloadCollaboratorExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const colsHeaders = [
    'Cédula',
    'Nombres',
    'Apellidos',
    'Rol en Plataforma',
    'Cargo Operativo',
    'Departamento',
    'Correo Electrónico (Para Invitación)',
    'Teléfono / Celular',
    'Placa Vehículo (Motos/Carros)',
    'Ciudad / Sede',
    'Salario Base Mensual (COP)',
    'Tipo de Contrato',
    'Nivel Riesgo ARL (1 a 5)',
    'EPS (Salud)',
    'Fondo de Pensiones (AFP)',
    'Caja de Compensación (CCF)',
    'Entidad Bancaria',
    'Tipo de Cuenta',
    'Número de Cuenta Bancaria',
    'Jefe de Zona Asignado (Solo Repartidores)',
    'Estado Inicial'
  ];

  const sampleRows = [
    colsHeaders,
    [
      '1144123456',
      'Carlos Andrés',
      'Restrepo Gómez',
      'Repartidor',
      'Repartidor Motorizado Urbano',
      'Operaciones y Mensajería',
      'carlos.repartidor@gmail.com',
      '3157890123',
      'ABC12D',
      'Cali',
      1423500,
      'Término Indefinido',
      4,
      'Sura EPS',
      'Protección',
      'Comfandi',
      'Bancolombia',
      'Ahorros',
      '301-458921-12',
      'Hernando Morales (Cédula: 94567890)',
      'Activo'
    ],
    [
      '1130987654',
      'Diana Marcela',
      'Quintero Ospina',
      'Administrativo',
      'Coordinadora de Nómina y Talento Humano',
      'Administración',
      'diana.administrativo@sergemsas.com',
      '3186543210',
      'N/A',
      'Cali',
      2800000,
      'Término Indefinido',
      1,
      'Sanitas EPS',
      'Porvenir',
      'Comfandi',
      'Bancolombia',
      'Ahorros',
      '502-114789-05',
      'N/A (Nivel Central)',
      'Activo'
    ],
    [
      '94567890',
      'Hernando',
      'Morales Caicedo',
      'Jefe de Zona',
      'Jefe de Zona Operacional - Zona Norte',
      'Operaciones y Mensajería',
      'hernando.jefezona@sergemsas.com',
      '3109876543',
      'XYZ789',
      'Cali',
      2300000,
      'Término Indefinido',
      2,
      'Sura EPS',
      'Protección',
      'Comfandi',
      'Banco de Bogotá',
      'Corriente',
      '024-998877-33',
      'N/A (Es Supervisor de Zona)',
      'Activo'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 28 },
    { wch: 22 },
    { wch: 32 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 20 },
    { wch: 28 },
    { wch: 14 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores_SERGEM');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Plantilla_Registro_Colaboradores_SERGEM.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
