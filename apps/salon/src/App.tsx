import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';

const AppLayout = lazy(() => import('./components/AppLayout'));
const CreateSalonPage = lazy(() => import('./pages/CreateSalonPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const AppointmentFormPage = lazy(() => import('./pages/AppointmentFormPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const CreateServicePage = lazy(() => import('./pages/CreateServicePage'));
const EditServicePage = lazy(() => import('./pages/EditServicePage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const CreateClientPage = lazy(() => import('./pages/CreateClientPage'));
const ClientDetailsPage = lazy(() => import('./pages/ClientDetailsPage'));
const EditClientPage = lazy(() => import('./pages/EditClientPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const StaffProfilePage = lazy(() => import('./pages/StaffProfilePage'));
const InviteStaffPage = lazy(() => import('./pages/InviteStaffPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ServiceCategoriesPage = lazy(() => import('./pages/ServiceCategoriesPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const UserSettingsPage = lazy(() => import('./pages/UserSettingsPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AddExistingSalonPage = lazy(() => import('./pages/AddExistingSalonPage'));
const SalonSettingsPage = lazy(() => import('./pages/SalonSettingsPage'));
const ThemeSettingsPage = lazy(() => import('./pages/ThemeSettingsPage'));

const AppLoader = (): JSX.Element => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="text-muted-foreground">Загрузка интерфейса…</div>
  </div>
);

function App(): JSX.Element {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<AppLoader />}>
            <Routes>
              {/* Вход и регистрация без layout */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Основное приложение с layout - требует аутентификации */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/onboarding/create-salon"
                element={
                  <ProtectedRoute>
                    <CreateSalonPage />
                  </ProtectedRoute>
                }
              />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <AppLayout><DashboardPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <AppLayout><CalendarPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/appointments" element={
                <ProtectedRoute>
                  <AppLayout><AppointmentsPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/appointments/new" element={
                <ProtectedRoute>
                  <AppLayout><AppointmentFormPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/appointments/:id" element={
                <ProtectedRoute>
                  <AppLayout><AppointmentFormPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/services" element={
                <ProtectedRoute>
                  <AppLayout><ServicesPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/services/create" element={
                <ProtectedRoute>
                  <AppLayout><CreateServicePage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/services/:id/edit" element={
                <ProtectedRoute>
                  <AppLayout><EditServicePage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/services/service-categories" element={
                <ProtectedRoute>
                  <AppLayout><ServiceCategoriesPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute>
                  <AppLayout><ClientsPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/clients/create" element={
                <ProtectedRoute>
                  <AppLayout><CreateClientPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/clients/:id" element={
                <ProtectedRoute>
                  <AppLayout><ClientDetailsPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/clients/:id/edit" element={
                <ProtectedRoute>
                  <AppLayout><EditClientPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/team" element={
                <ProtectedRoute>
                  <AppLayout><TeamPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/team/:id" element={
                <ProtectedRoute>
                  <AppLayout><StaffProfilePage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/team/invite" element={
                <ProtectedRoute requiredRoles={['SALON_OWNER', 'MANAGER']}>
                  <AppLayout><InviteStaffPage /></AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Страницы с проверкой ролей */}
              <Route path="/payments" element={
                <ProtectedRoute requiredRoles={['SALON_OWNER', 'MANAGER', 'ACCOUNTANT']}>
                  <AppLayout><PaymentsPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute requiredRoles={['SALON_OWNER', 'MANAGER']}>
                  <AppLayout><AnalyticsPage /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <AppLayout><NotificationsPage /></AppLayout>
                </ProtectedRoute>
              } />

              {/* Настройки */}
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <SettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/settings/salon" element={
                <ProtectedRoute requiredRoles={['SALON_OWNER', 'MANAGER']}>
                  <AppLayout>
                    <SalonSettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings/theme" element={
                <ProtectedRoute requiredRoles={['SALON_OWNER', 'MANAGER']}>
                  <AppLayout>
                    <ThemeSettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />

              {/* Управление салонами */}
              <Route path="/salon/add-existing" element={
                <ProtectedRoute>
                  <AppLayout>
                    <AddExistingSalonPage />
                  </AppLayout>
                </ProtectedRoute>
              } />

              {/* Профиль пользователя */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <AppLayout>
                    <UserProfilePage />
                  </AppLayout>
                </ProtectedRoute>
              } />

              {/* Настройки пользователя */}
              <Route path="/user-settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <UserSettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/help" element={
                <ProtectedRoute>
                  <AppLayout>
                    <HelpPage />
                  </AppLayout>
                </ProtectedRoute>
              } />

              {/* OAuth регистрация - ПЕРЕД fallback маршрутом! */}
              <Route path="/auth/register" element={<LoginPage />} />

              {/* Fallback для всех неизвестных маршрутов */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
          <Toaster position="bottom-right" richColors closeButton />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App
