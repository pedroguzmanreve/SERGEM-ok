import { Employee } from '../types/payroll';

export interface EmailInviteDetails {
  recipientEmail: string;
  subject: string;
  bodyText: string;
  inviteUrl: string;
  portal: 'driver-portal' | 'zone-chief' | 'admin-portal';
  portalDisplayName: string;
  mailtoUrl: string;
  gmailUrl: string;
  outlookUrl: string;
  whatsappUrl?: string;
}

/**
 * Returns the target portal tab identifier based on the user's role.
 */
export function getPortalForRole(role: string): 'driver-portal' | 'zone-chief' | 'admin-portal' {
  if (role === 'Repartidor') {
    return 'driver-portal';
  }
  if (role === 'Jefe de Zona' || role === 'Jefe de Operaciones') {
    return 'zone-chief';
  }
  return 'admin-portal';
}

/**
 * Returns the human-readable portal name for a role.
 */
export function getPortalDisplayName(role: string): string {
  if (role === 'Repartidor') {
    return 'Portal del Repartidor (Turnos, Rutas & Desprendibles)';
  }
  if (role === 'Jefe de Zona' || role === 'Jefe de Operaciones') {
    return 'Portal de Jefatura de Zona (Programación & Novedades)';
  }
  return 'Portal de Administración (Control General & Nómina)';
}

/**
 * Builds the invitation details and links for a given employee,
 * ensuring all channels (Email, WhatsApp, Direct Link) redirect directly
 * to the corresponding portal based on the assigned role.
 */
export function buildEmployeeInvite(
  employee: Employee,
  jefeZonaName?: string
): EmailInviteDetails {
  const origin = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://sergem.app';

  const portal = getPortalForRole(employee.rol);
  const portalDisplayName = getPortalDisplayName(employee.rol);
  const token = employee.id
    ? `INV-${employee.id}-${Date.now().toString(36).toUpperCase()}`
    : `INV-${Date.now().toString(36).toUpperCase()}`;

  const params = new URLSearchParams({
    portal: portal,
    role: employee.rol,
    invite_email: employee.email || '',
    emp_id: employee.id || '',
    emp_name: `${employee.nombre} ${employee.apellido}`,
    token: token,
  });

  // Base URL with full query parameters for role-based deep linking
  const inviteUrl = `${origin}?${params.toString()}`;

  const subject = `Invitación Oficial a SERGEM S.A.S. - Acceso a tu ${portalDisplayName}`;

  const bodyText = `Estimado(a) ${employee.nombre} ${employee.apellido},

Recibe un cordial saludo de la Dirección Administrativa y Operativa de SERGEM S.A.S.

Has sido registrado(a) e invitado(a) oficialmente a la plataforma operativa de la compañía con los siguientes datos:

• Colaborador: ${employee.nombre} ${employee.apellido}
• Cédula de Ciudadanía: ${employee.cedula}
• Rol Asignado: ${employee.rol}
• Portal de Destino: ${portalDisplayName}
• Cargo Oficial: ${employee.cargo}
• Correo Registrado: ${employee.email || 'No registrado'}
${employee.placaVehiculo ? `• Placa de Vehículo Asignada: ${employee.placaVehiculo}\n` : ''}${jefeZonaName ? `• Jefe de Zona Asignado: ${jefeZonaName}\n` : ''}
--------------------------------------------------
ENLACE DIRECTO AL PORTAL SEGÚN TU ROL:
--------------------------------------------------
Ingresa directamente a tu portal correspondiente haciendo clic en el siguiente enlace oficial:
${inviteUrl}

Al abrir este enlace, serás dirigido(a) de manera automática y exclusiva a tu ${portalDisplayName}, donde podrás gestionar tu programación de turnos, registrar novedades operativas y consultar tus desprendibles de pago.

Si tienes alguna inquietud o requieres asistencia, contacta al departamento de Gestión Humana y Operaciones de SERGEM S.A.S.

Atentamente,
Equipo de Administración & Operaciones
SERGEM S.A.S. - Servicios Generales y Mensajería Especializada
Cali, Valle del Cauca, Colombia`;

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(bodyText);
  const recipient = employee.email || '';

  const mailtoUrl = `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodedSubject}&body=${encodedBody}`;
  const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(recipient)}&subject=${encodedSubject}&body=${encodedBody}`;

  let whatsappUrl: string | undefined;
  if (employee.telefono) {
    const cleanPhone = employee.telefono.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const waText = `¡Hola ${employee.nombre}! Te damos la bienvenida a SERGEM S.A.S. Has sido registrado(a) con el rol de *${employee.rol}*. Accede directamente a tu *${portalDisplayName}* a través del siguiente enlace oficial: ${inviteUrl}`;
    whatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(waText)}`;
  }

  return {
    recipientEmail: recipient,
    subject,
    bodyText,
    inviteUrl,
    portal,
    portalDisplayName,
    mailtoUrl,
    gmailUrl,
    outlookUrl,
    whatsappUrl,
  };
}

/**
 * Triggers dispatch of the email invitation via native mail client (mailto:).
 */
export function dispatchNativeEmailInvite(details: EmailInviteDetails): void {
  if (typeof window === 'undefined') return;

  // Attempt window.open with mailto
  const link = document.createElement('a');
  link.href = details.mailtoUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
