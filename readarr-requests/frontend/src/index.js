import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorker from './serviceWorker';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// Register service worker for PWA support
// Register service worker with update handling
serviceWorker.register({
  onUpdate: registration => {
    console.log('New service worker update available', registration);
    
    // Dispatch an update event for the UpdateNotification component
    const updateEvent = new CustomEvent('serviceWorkerUpdate', { 
      detail: { registration: registration }
    });
    window.dispatchEvent(updateEvent);
  },
  onSuccess: registration => {
    console.log('Service worker registered successfully');
  }
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
