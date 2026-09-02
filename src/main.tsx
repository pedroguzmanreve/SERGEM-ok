import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { telemetry } from './services/telemetry';

// Initialize Production Telemetry and Web Vitals Observer
telemetry.init({
  appVersion: '2026.3.1',
  environment: import.meta.env.MODE || 'production',
});

// Register PWA Service Worker for offline capability & mobile installation
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

