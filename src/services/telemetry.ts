/**
 * ==============================================================================
 * SERGEM MENSAJERÍA S.A.S. — TELEMETRY & PRODUCTION MONITORING SERVICE
 * ==============================================================================
 * Centralized client telemetry, error reporting, performance metrics (Web Vitals),
 * and network health observation for enterprise observability in production.
 */

import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';

export type LogLevel = 'info' | 'warn' | 'error' | 'fatal';

export interface Breadcrumb {
  timestamp: string;
  category: 'ui.click' | 'navigation' | 'auth' | 'api' | 'realtime' | 'storage' | 'system';
  message: string;
  data?: Record<string, unknown>;
  level?: LogLevel;
}

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: 'error' | 'unhandledrejection' | 'metric' | 'user_feedback';
  message: string;
  stack?: string;
  componentStack?: string;
  user?: {
    id?: string;
    rol?: string;
    email?: string;
  };
  breadcrumbs: Breadcrumb[];
  environment: string;
  appVersion: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetricReport {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType?: string;
}

class TelemetryService {
  private static instance: TelemetryService;
  private breadcrumbsBuffer: Breadcrumb[] = [];
  private readonly maxBreadcrumbs = 50;
  private isInitialized = false;
  private appVersion = '2026.3.1';
  private environment = process.env.NODE_ENV || 'production';
  private currentUser: { id?: string; rol?: string; email?: string } | null = null;
  private metrics: Record<string, PerformanceMetricReport> = {};

  private constructor() {
    // Singleton
  }

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  /**
   * Initializes global error listeners and Web Vitals telemetry
   */
  public init(config?: { appVersion?: string; environment?: string }): void {
    if (this.isInitialized) return;

    if (config?.appVersion) this.appVersion = config.appVersion;
    if (config?.environment) this.environment = config.environment;

    this.addBreadcrumb({
      category: 'system',
      message: `SERGEM Telemetry initialized [Env: ${this.environment}, Ver: ${this.appVersion}]`,
      level: 'info',
    });

    // Global window error listener
    window.addEventListener('error', (event: ErrorEvent) => {
      this.captureException(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        source: 'window.onerror',
      });
    });

    // Global unhandled promise rejection listener
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.captureException(error, {
        source: 'window.onunhandledrejection',
      });
    });

    // Initialize Web Vitals Performance Telemetry
    this.initWebVitals();

    this.isInitialized = true;
  }

  /**
   * Set currently authenticated user identity for telemetry context
   */
  public setUser(user: { id?: string; rol?: string; email?: string } | null): void {
    this.currentUser = user;
    if (user) {
      this.addBreadcrumb({
        category: 'auth',
        message: `Usuario autenticado: ${user.email || user.id} (${user.rol})`,
        level: 'info',
      });
    } else {
      this.addBreadcrumb({
        category: 'auth',
        message: 'Sesión finalizada',
        level: 'info',
      });
    }
  }

  /**
   * Records a user or system breadcrumb trail
   */
  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const entry: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbsBuffer.push(entry);
    if (this.breadcrumbsBuffer.length > this.maxBreadcrumbs) {
      this.breadcrumbsBuffer.shift();
    }
  }

  /**
   * Captures and reports runtime exceptions
   */
  public captureException(
    error: Error,
    context?: {
      componentStack?: string;
      extra?: Record<string, unknown>;
      [key: string]: unknown;
    }
  ): TelemetryEvent {
    const event: TelemetryEvent = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: 'error',
      message: error.message || 'Unknown Error',
      stack: error.stack,
      componentStack: context?.componentStack,
      user: this.currentUser || undefined,
      breadcrumbs: [...this.breadcrumbsBuffer],
      environment: this.environment,
      appVersion: this.appVersion,
      metadata: context?.extra,
    };

    // Console logging with structured styling in development / production logs
    console.error(
      `%c[SERGEM Telemetry %c${event.id}%c]`,
      'color: #ef4444; font-weight: bold;',
      'color: #3b82f6;',
      'color: inherit;',
      event.message,
      event
    );

    // In production with Sentry / DataDog / GCP Cloud Monitoring endpoint:
    this.sendToRemoteEndpoint('/api/telemetry/errors', event);

    return event;
  }

  /**
   * Captures informational or warning messages
   */
  public captureMessage(
    message: string,
    level: LogLevel = 'info',
    extra?: Record<string, unknown>
  ): void {
    this.addBreadcrumb({
      category: 'system',
      message,
      level,
      data: extra,
    });

    if (level === 'error' || level === 'fatal') {
      this.captureException(new Error(message), { extra });
    }
  }

  /**
   * Initializes Core Web Vitals metrics collection
   */
  private initWebVitals(): void {
    try {
      const handleMetric = (metric: Metric) => {
        const report: PerformanceMetricReport = {
          name: metric.name,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          rating: metric.rating,
          delta: Math.round(metric.delta),
          id: metric.id,
          navigationType: metric.navigationType,
        };

        this.metrics[metric.name] = report;

        // Structured console logging for performance tracking
        const badgeColor =
          metric.rating === 'good'
            ? 'color: #10b981; font-weight: bold;'
            : metric.rating === 'needs-improvement'
            ? 'color: #f59e0b; font-weight: bold;'
            : 'color: #ef4444; font-weight: bold;';

        console.debug(
          `%c[Web Vitals: ${metric.name}] %c${report.value}${metric.name === 'CLS' ? ' (x1000)' : 'ms'} (${metric.rating})`,
          'color: #6366f1; font-weight: bold;',
          badgeColor
        );

        this.addBreadcrumb({
          category: 'system',
          message: `Core Web Vital [${metric.name}]: ${report.value} (${metric.rating})`,
          data: report as unknown as Record<string, unknown>,
          level: metric.rating === 'poor' ? 'warn' : 'info',
        });

        this.sendToRemoteEndpoint('/api/telemetry/metrics', report);
      };

      // Collect Core Web Vitals
      onCLS(handleMetric);
      onINP(handleMetric);
      onLCP(handleMetric);
      onFCP(handleMetric);
      onTTFB(handleMetric);
    } catch (err) {
      console.warn('[SERGEM Telemetry] Web Vitals initialization skipped:', err);
    }
  }

  /**
   * Gets current performance metrics summary
   */
  public getMetricsSummary(): Record<string, PerformanceMetricReport> {
    return { ...this.metrics };
  }

  /**
   * Internal dispatcher for telemetry endpoints with non-blocking sendBeacon
   */
  private sendToRemoteEndpoint(url: string, payload: unknown): void {
    try {
      const serialized = JSON.stringify(payload);
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([serialized], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      }
    } catch {
      // Non-blocking fallback: ignore failed remote telemetry dispatch in sandbox
    }
  }
}

export const telemetry = TelemetryService.getInstance();
