import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Could not find root element to mount to');
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Wait for the DOM to be ready before rendering the app to prevent mounting errors.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .catch((error) => {
      console.warn('Service worker registration failed', error);
    });
};

if (import.meta.env.PROD) {
  window.addEventListener('load', registerServiceWorker, { once: true });
}
