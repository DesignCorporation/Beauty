import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'sonner'
import ProtectedRoute from './components/ProtectedRoute'

const AdminLayout = lazy(() => import('./components/AdminLayout'))
const LoginForm = lazy(() => import('./components/LoginForm'))
const MFAVerificationPage = lazy(() => import('./components/MFAVerificationPage'))

const AppLoader = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <span className="text-muted-foreground">Загрузка панели…</span>
  </div>
)
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<AppLoader />}>
          <Routes>
            {/* Публичные маршруты */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/mfa-verify" element={<MFAVerificationPage />} />
            
            {/* Защищенные маршруты - все остальное */}
            <Route 
              path="*" 
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Suspense>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
