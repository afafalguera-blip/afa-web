import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'

function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-900">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<Loading />}>
        <App />
    </Suspense>
  </StrictMode>,
)
