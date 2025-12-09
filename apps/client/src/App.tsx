import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './hooks/useAuth'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const MySalonsPage = lazy(() => import('./pages/MySalonsPage'))
const MySalonDetailsPage = lazy(() => import('./pages/MySalonDetailsPage'))
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage'))
const ReferralPage = lazy(() => import('./pages/ReferralPage'))
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const BookingFlow = lazy(() => import('./components/BookingFlow'))
const AddSalonPage = lazy(() => import('./pages/AddSalonPage'))

const FullScreenLoader = () => {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="flex flex-col items-center space-y-3 text-indigo-600">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm font-medium">{t('common.loading')}</p>
      </div>
    </div>
  )
}

const RequireAuth: React.FC<{ children: React.ReactElement; requirePhoneVerified?: boolean }> = ({
  children,
  requirePhoneVerified = true
}) => {
  const { status, user } = useAuth()
  const location = useLocation()

  // При loading показываем загрузку
  if (status === 'loading') {
    return <FullScreenLoader />
  }

  // При unauthenticated или отсутствии user редиректим на логин
  if (status === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (requirePhoneVerified && !user.phoneVerified) {
    return <Navigate to="/complete-profile" replace />
  }

  if (!requirePhoneVerified && user.phoneVerified) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

const PublicOnly: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { status, user } = useAuth()

  // При loading показываем загрузку
  if (status === 'loading') {
    return <FullScreenLoader />
  }

  // Если залогинен - редирект на соответствующую страницу
  if (status === 'authenticated' && user) {
    return <Navigate to={user.phoneVerified ? '/dashboard' : '/complete-profile'} replace />
  }

  return children
}

const AppRoutes = () => {
  const { status, user } = useAuth()

  // Мемоизируем defaultRedirect чтобы избежать лишних re-render
  // ВАЖНО: useMemo должен быть ДО любого early return (Rules of Hooks)
  const defaultRedirect = useMemo(
    () =>
      status === 'authenticated' && user
        ? user.phoneVerified
          ? '/dashboard'
          : '/complete-profile'
        : '/login',
    [status, user]
  )

  // При loading показываем загрузку
  if (status === 'loading') {
    return <FullScreenLoader />
  }

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to={defaultRedirect} replace />} />
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
        <Route path="/complete-profile" element={<RequireAuth requirePhoneVerified={false}><CompleteProfilePage /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth requirePhoneVerified><DashboardPage /></RequireAuth>} />
        <Route path="/my-salons" element={<RequireAuth requirePhoneVerified><MySalonsPage /></RequireAuth>} />
        <Route path="/salons/:salonId" element={<RequireAuth requirePhoneVerified><MySalonDetailsPage /></RequireAuth>} />
        <Route path="/salons/:salonId/booking" element={<RequireAuth requirePhoneVerified><BookingFlow /></RequireAuth>} />
        <Route path="/add-salon" element={<RequireAuth requirePhoneVerified><AddSalonPage /></RequireAuth>} />
        <Route path="/loyalty" element={<RequireAuth requirePhoneVerified><LoyaltyPage /></RequireAuth>} />
        <Route path="/referral" element={<RequireAuth requirePhoneVerified><ReferralPage /></RequireAuth>} />
        <Route path="/appointments" element={<RequireAuth requirePhoneVerified><AppointmentsPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth requirePhoneVerified><NotificationsPage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth requirePhoneVerified><SettingsPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth requirePhoneVerified><ProfilePage /></RequireAuth>} />
        <Route path="/home" element={<HomePage />} />
        <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 text-foreground">
        <AppRoutes />
      </div>
    </Router>
  )
}
