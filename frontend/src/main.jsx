import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import App from './App.jsx'
import './index.css'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (clientId) {
  console.log(`[AUTH INFO] Google Client ID loaded (starts with ${clientId.substring(0, 8)}...)`);
} else {
  console.error(`[AUTH ERROR] VITE_GOOGLE_CLIENT_ID is missing in Vercel environment variables! using dummy client ID.`);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={clientId || 'dummy_client_id'}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'premium-toast',
              success: {
                className: 'premium-toast premium-toast-success',
                iconTheme: { primary: '#C9A84C', secondary: '#0D0D0D' }
              },
              error: {
                className: 'premium-toast premium-toast-error',
                iconTheme: { primary: '#ef4444', secondary: '#0D0D0D' }
              },
            }}
          />
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
