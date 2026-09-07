import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer, { type Transporter } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function buildHtmlEmail(params: {
  employeeName: string;
  cedula: string;
  role: string;
  portalDisplayName: string;
  cargo: string;
  inviteUrl: string;
  placaVehiculo?: string;
  jefeZonaName?: string;
}): string {
  const {
    employeeName,
    cedula,
    role,
    portalDisplayName,
    cargo,
    inviteUrl,
    placaVehiculo,
    jefeZonaName,
  } = params;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación Oficial a SERGEM S.A.S.</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 32px 28px; text-align: center; border-bottom: 4px solid #dc2626; }
    .logo-badge { display: inline-block; background: #dc2626; color: #ffffff; font-weight: 900; font-size: 13px; letter-spacing: 2px; padding: 6px 14px; border-radius: 6px; margin-bottom: 12px; }
    .title { color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; }
    .subtitle { color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; font-weight: 500; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .lead { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
    .details-table { width: 100%; border-collapse: separate; border-spacing: 0; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 28px; }
    .details-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    .details-table tr:last-child td { border-bottom: none; }
    .table-label { color: #64748b; font-weight: 600; width: 40%; }
    .table-val { color: #0f172a; font-weight: 700; }
    .role-badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 12px; }
    .btn-container { text-align: center; margin: 32px 0 24px 0; }
    .btn { display: inline-block; background: #dc2626; color: #ffffff !important; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35); }
    .direct-link-box { background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px 14px; margin-top: 20px; font-size: 11px; color: #475569; word-break: break-all; }
    .footer { background: #f8fafc; padding: 24px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">SERGEM S.A.S.</div>
      <h1 class="title">Acceso Oficial a tu Portal</h1>
      <p class="subtitle">Servicios Generales y Mensajería Especializada</p>
    </div>
    <div class="content">
      <div class="greeting">Estimado(a) ${employeeName},</div>
      <p class="lead">
        Has sido registrado(a) e invitado(a) a la plataforma operativa de <strong>SERGEM S.A.S.</strong> Tu cuenta ha sido habilitada con los siguientes parámetros de acceso:
      </p>

      <table class="details-table">
        <tr>
          <td class="table-label">Colaborador:</td>
          <td class="table-val">${employeeName}</td>
        </tr>
        <tr>
          <td class="table-label">Cédula de Ciudadanía:</td>
          <td class="table-val">${cedula}</td>
        </tr>
        <tr>
          <td class="table-label">Rol Asignado:</td>
          <td class="table-val"><span class="role-badge">${role}</span></td>
        </tr>
        <tr>
          <td class="table-label">Portal de Destino:</td>
          <td class="table-val">${portalDisplayName}</td>
        </tr>
        <tr>
          <td class="table-label">Cargo Operativo:</td>
          <td class="table-val">${cargo}</td>
        </tr>
        ${placaVehiculo ? `<tr><td class="table-label">Placa de Vehículo:</td><td class="table-val">${placaVehiculo}</td></tr>` : ''}
        ${jefeZonaName ? `<tr><td class="table-label">Jefe de Zona Asignado:</td><td class="table-val">${jefeZonaName}</td></tr>` : ''}
      </table>

      <div class="btn-container">
        <a href="${inviteUrl}" target="_blank" class="btn">
          Ingresar al ${portalDisplayName.split('(')[0].trim()}
        </a>
      </div>

      <div class="direct-link-box">
        <strong>¿Problemas con el botón?</strong> Copia y pega el siguiente enlace directamente en tu navegador web:<br>
        <a href="${inviteUrl}" style="color: #dc2626; word-break: break-all;">${inviteUrl}</a>
      </div>
    </div>
    <div class="footer">
      <strong>SERGEM S.A.S. - Gestión Humana y Operaciones</strong><br>
      Cali, Valle del Cauca, Colombia • Sistema de Nómina y Turnos Operativos
    </div>
  </div>
</body>
</html>
  `;
}

async function startServer() {
  const app = express();

  app.use(express.json());

  // API 1: Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API 2: Verify email dispatch configuration status
  app.get('/api/email-config-status', (req: Request, res: Response) => {
    const hasSmtp = Boolean(process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_HOST));
    const hasResend = Boolean(process.env.RESEND_API_KEY);
    const configured = hasSmtp || hasResend;

    res.json({
      configured,
      provider: hasResend ? 'resend' : hasSmtp ? 'smtp' : 'none',
      senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || null,
      message: configured
        ? 'Servidor de correo configurado y listo para despacho automático.'
        : 'Servicio de correo no configurado aún en variables de entorno (SMTP_USER/SMTP_PASS o RESEND_API_KEY).',
    });
  });

  // API 3: Automatic invitation email dispatch
  app.post('/api/send-invite-email', async (req: Request, res: Response) => {
    try {
      const {
        recipientEmail,
        employeeName,
        cedula,
        role,
        portalDisplayName,
        cargo,
        inviteUrl,
        placaVehiculo,
        jefeZonaName,
        subject,
        bodyText,
      } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({ success: false, message: 'El correo electrónico del destinatario es requerido.' });
      }

      const emailSubject = subject || `Invitación Oficial a SERGEM S.A.S. - Acceso a tu ${portalDisplayName || 'Portal'}`;
      const htmlContent = buildHtmlEmail({
        employeeName: employeeName || 'Colaborador',
        cedula: cedula || '',
        role: role || 'Colaborador',
        portalDisplayName: portalDisplayName || 'Portal Operativo',
        cargo: cargo || 'Operativo',
        inviteUrl: inviteUrl || 'https://sergem.app',
        placaVehiculo,
        jefeZonaName,
      });

      // 1. Try Resend if configured
      if (process.env.RESEND_API_KEY) {
        const fromAddress = process.env.SMTP_FROM || 'SERGEM S.A.S. <onboarding@resend.dev>';
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [recipientEmail],
            subject: emailSubject,
            text: bodyText,
            html: htmlContent,
          }),
        });

        const resendData = await resendRes.json();
        if (resendRes.ok) {
          console.info(`[Email Dispatch]: Invitación enviada exitosamente vía Resend a ${recipientEmail}`);
          return res.json({
            success: true,
            provider: 'resend',
            messageId: (resendData as any).id,
            recipient: recipientEmail,
          });
        } else {
          console.error('[Resend Error]:', resendData);
        }
      }

      // 2. Try SMTP via Nodemailer if configured
      const transporter = getTransporter();
      if (transporter) {
        const fromAddress = process.env.SMTP_FROM || `SERGEM S.A.S. <${process.env.SMTP_USER}>`;
        const info = await transporter.sendMail({
          from: fromAddress,
          to: recipientEmail,
          subject: emailSubject,
          text: bodyText,
          html: htmlContent,
        });

        console.info(`[Email Dispatch]: Invitación enviada exitosamente vía SMTP a ${recipientEmail}, messageId: ${info.messageId}`);
        return res.json({
          success: true,
          provider: 'smtp',
          messageId: info.messageId,
          recipient: recipientEmail,
        });
      }

      // 3. If neither SMTP nor Resend is set in environment variables
      console.warn(`[Email Dispatch Warning]: No hay credenciales SMTP ni RESEND_API_KEY configuradas en el servidor.`);
      return res.json({
        success: false,
        configured: false,
        recipient: recipientEmail,
        message: 'No hay servidor SMTP ni RESEND_API_KEY configurados en las variables de entorno.',
      });
    } catch (error) {
      console.error('[Email Dispatch Exception]:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errMsg,
        message: `Error al intentar despachar el correo: ${errMsg}`,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
