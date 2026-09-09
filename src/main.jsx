import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppStateProvider } from './state/AppState.jsx';
import { SessionProvider } from './state/SessionState.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>
);
