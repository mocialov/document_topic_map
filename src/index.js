import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress harmless SES_UNCAUGHT_EXCEPTION warnings from browser extensions (like MetaMask)
// These are caused by security extensions and don't affect app functionality
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('SES_UNCAUGHT_EXCEPTION') || 
      args[0]?.includes?.('lockdown-install')) {
    // Silently ignore SES/lockdown errors from browser extensions
    return;
  }
  originalConsoleError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
