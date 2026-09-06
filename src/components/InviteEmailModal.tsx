import React, { useState } from 'react';
import { Employee } from '../types/payroll';
import {
  EmailInviteDetails,
  buildEmployeeInvite,
  dispatchNativeEmailInvite,
} from '../services/emailInviteService';
import {
  Mail,
  CheckCircle2,
  Copy,
  ExternalLink,
  X,
  Share2,
  Check,
  Send,
  User,
  Shield,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface InviteEmailModalProps {
  employee: Employee;
  jefeZonaName?: string;
  isOpen: boolean;
  onClose: () => void;
  isNewInvite?: boolean;
}

export const InviteEmailModal: React.FC<InviteEmailModalProps> = ({
  employee,
  jefeZonaName,
  isOpen,
  onClose,
  isNewInvite = false,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const details: EmailInviteDetails = buildEmployeeInvite(employee, jefeZonaName);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(details.inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(details.bodyText);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2500);
  };

  const handleSendMailto = () => {
    dispatchNativeEmailInvite(details);
  };

  return (
    <div
      id="invite-email-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        id="invite-email-modal-card"
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/90 text-white flex items-center justify-center shadow-md">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-white">
                  {isNewInvite ? '¡Invitación Registrada y Lista!' : 'Invitación por Correo'}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {employee.estadoInvitacion || 'Invitado'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Envía la invitación oficial a {employee.nombre} {employee.apellido}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Status Alert Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-950 text-xs">
                Colaborador registrado exitosamente en la base de datos de SERGEM S.A.S.
              </p>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Usa las opciones a continuación para despachar la invitación oficial directamente a la bandeja de correo del colaborador.
              </p>
            </div>
          </div>

          {/* Collaborator Profile Summary Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-600 flex items-center gap-1.5 text-xs">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Destinatario:
              </span>
              <span className="font-extrabold text-slate-900 text-xs font-mono">
                {details.recipientEmail || 'Sin correo registrado'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 font-medium">Nombre:</span>{' '}
                <strong className="text-slate-800">{employee.nombre} {employee.apellido}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Cédula:</span>{' '}
                <strong className="text-slate-800 font-mono">{employee.cedula}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Rol Asignado:</span>{' '}
                <strong className="text-red-700">{employee.rol}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Portal Destino:</span>{' '}
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  details.portal === 'driver-portal'
                    ? 'bg-blue-100 text-blue-800'
                    : details.portal === 'zone-chief'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {details.portalDisplayName.split('(')[0].trim()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Cargo:</span>{' '}
                <strong className="text-slate-800">{employee.cargo}</strong>
              </div>
              {employee.placaVehiculo && (
                <div>
                  <span className="text-slate-500 font-medium">Placa:</span>{' '}
                  <strong className="text-slate-800 font-mono font-black">{employee.placaVehiculo}</strong>
                </div>
              )}
              {jefeZonaName && (
                <div>
                  <span className="text-slate-500 font-medium">Jefe Zona:</span>{' '}
                  <strong className="text-slate-800">{jefeZonaName}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Action Dispatch Buttons */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              1. Despachar Invitación por Correo Electrónico:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: Open in Gmail Web */}
              <a
                href={details.gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-900 rounded-xl flex items-center justify-between transition-all group cursor-pointer active:scale-98"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    M
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xs text-red-950">Abrir en Gmail Web</div>
                    <div className="text-[10px] text-red-700">Ventana lista con plantilla</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-red-600 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* Option B: Open in Outlook Web */}
              <a
                href={details.outlookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-sky-50 hover:bg-sky-100/80 border border-sky-200 text-sky-950 rounded-xl flex items-center justify-between transition-all group cursor-pointer active:scale-98"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    O
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xs text-sky-950">Abrir en Outlook Web</div>
                    <div className="text-[10px] text-sky-700">Redacción directa</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-sky-600 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>

            {/* Option C: Native mail client (mailto:) */}
            <button
              onClick={handleSendMailto}
              className="w-full p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center space-x-2 font-bold text-xs transition-all cursor-pointer shadow-md active:scale-98"
            >
              <Send className="w-4 h-4 text-red-400" />
              <span>Abrir en Cliente de Correo Predeterminado (Mailto)</span>
            </button>
          </div>

          {/* Share via WhatsApp & Direct Link Copy */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <span className="text-xs font-bold text-slate-800 block">
              2. Enlace Directo & Canal Alternativo:
            </span>

            {/* Direct Activation Link */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">
                  Enlace único de activación:
                </span>
                <button
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 flex items-center space-x-1 transition-all cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar Enlace</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={details.inviteUrl}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-[11px] font-mono text-slate-700 select-all"
              />
            </div>

            {/* WhatsApp Share button */}
            {details.whatsappUrl && (
              <a
                href={details.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center space-x-2 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <Smartphone className="w-4 h-4" />
                <span>Enviar Notificación por WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            )}
          </div>

          {/* Expandable Email Body Preview */}
          <div className="pt-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between py-2 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer border-t border-slate-100"
            >
              <span>Ver texto del correo electrónico preparado</span>
              {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showPreview && (
              <div className="mt-2 p-3 bg-slate-100/80 rounded-xl border border-slate-300 text-[11px] space-y-2 text-slate-800 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="font-bold text-slate-600">Asunto:</span>
                  <span className="font-semibold text-slate-900">{details.subject}</span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-700 max-h-48 overflow-y-auto leading-relaxed">
                  {details.bodyText}
                </pre>
                <div className="pt-1 text-right">
                  <button
                    onClick={handleCopyBody}
                    className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded-md text-[10px] font-bold text-slate-700 inline-flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedBody ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                    <span>{copiedBody ? '¡Texto Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            SERGEM S.A.S. • Control de Acceso & Roles
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer transition-all active:scale-95 text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
