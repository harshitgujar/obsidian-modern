import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TrayCaptureApp } from './components/Tray/TrayCaptureApp';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import './index.css';

const isTrayView = window.location.search.includes('view=tray') || window.location.hash === '#tray';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary componentName={isTrayView ? "Runagon Quick Capture Tray" : "Runagon Application"}>
      {isTrayView ? <TrayCaptureApp /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);
