import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './core/i18n/i18n'
import App from './App.tsx'

import { HelmetProvider } from 'react-helmet-async'

import { Loading } from './components/common/Loading'
import { ErrorBoundary } from './core/errors/ErrorBoundary'
import { instalarCapturaGlobal } from './core/errors/reporter'

// Antes de montar nada: si el propio arranque falla, que quede registrado.
instalarCapturaGlobal()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary zona="root">
      <HelmetProvider>
        <Suspense fallback={<Loading />}>
          <App />
        </Suspense>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
)
