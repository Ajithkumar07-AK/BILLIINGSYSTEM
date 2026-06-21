import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silently suppress benign Vite Hot Module Replacement (HMR) WebSocket connection errors
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.toString() || '';
  if (reason.includes('WebSocket') || reason.includes('HMR') || reason.includes('vite')) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const message = event.message || '';
  if (message.includes('WebSocket') || message.includes('HMR') || message.includes('vite')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <App />
);
