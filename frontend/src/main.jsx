import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SocketProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '1rem',
                background: '#fff',
                color: '#333',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              },
              success: { iconTheme: { primary: '#56AA3E', secondary: '#fff' } },
              error: { iconTheme: { primary: '#FF76A4', secondary: '#fff' } },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
