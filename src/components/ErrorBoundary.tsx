import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home, Copy, Check, Terminal } from 'lucide-react';
import { telemetry } from '../services/telemetry';

export interface ErrorBoundaryProps {

  children: ReactNode;
  fallback?: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SERGEM ErrorBoundary] Uncaught runtime exception:', error, errorInfo);
    this.setState({ errorInfo });
    telemetry.captureException(error, {
      componentStack: errorInfo.componentStack || undefined,
      extra: { source: 'ErrorBoundary' },
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    try {
      localStorage.removeItem('sergem_auth_user');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  private handleCopyError = () => {
    const text = `Error: ${this.state.error?.message}\nStack: ${this.state.error?.stack}\nComponent Stack: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 3000);
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-xl w-full bg-slate-800 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0 ring-8 ring-red-500/10">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Recuperación de Fallos</span>
                <h1 className="text-xl font-bold text-white leading-tight">Ocurrió un error inesperado</h1>
                <p className="text-xs text-slate-400 mt-0.5">El sistema protegió los datos y evitó el colapso de la sesión.</p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-700/60 font-mono text-xs space-y-2 overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Terminal className="w-3.5 h-3.5 text-red-400" />
                  Detalle del Error
                </span>
                <button
                  onClick={this.handleCopyError}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-300 hover:text-white bg-slate-800 px-2 py-0.5 rounded cursor-pointer transition-all"
                >
                  {this.state.copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-red-300 break-words leading-relaxed">
                {this.state.error?.message || 'Error de ejecución en componente React'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar / Recargar</span>
              </button>

              <button
                onClick={this.handleResetState}
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Reiniciar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
