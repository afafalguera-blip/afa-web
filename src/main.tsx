import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './core/i18n/i18n'
import App from './App.tsx'

import { HelmetProvider } from 'react-helmet-async'

import { Loading } from './components/common/Loading'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <Suspense fallback={<Loading />}>
        <App />
      </Suspense>
    </HelmetProvider>
  </StrictMode>,
)
