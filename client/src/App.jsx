import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './routes/ProtectedRoute.jsx';
import { DashboardLayout } from './components/layout/DashboardLayout.jsx';
import { LandingPage } from './pages/public/LandingPage.jsx';
import { RequestFormPage } from './pages/public/RequestFormPage.jsx';
import { RequestConfirmationPage } from './pages/public/RequestConfirmationPage.jsx';
import { StatusLookupPage } from './pages/public/StatusLookupPage.jsx';
import { LoginPage } from './pages/public/LoginPage.jsx';
import { OperatorDashboardPage } from './pages/operator/OperatorDashboardPage.jsx';
import { HospitalDashboardPage } from './pages/hospital/HospitalDashboardPage.jsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.jsx';
import { AdminCasesPage } from './pages/admin/AdminCasesPage.jsx';
import { AdminCaseDetailPage } from './pages/admin/AdminCaseDetailPage.jsx';
import { AdminAmbulancesPage } from './pages/admin/AdminAmbulancesPage.jsx';
import { AdminHospitalsPage } from './pages/admin/AdminHospitalsPage.jsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx';
import { AdminReportsPage } from './pages/admin/AdminReportsPage.jsx';
import { AdminAuditPage } from './pages/admin/AdminAuditPage.jsx';

export default function App() {
  return <AuthProvider><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/request/emergency" element={<RequestFormPage />} />
    <Route path="/request/requirements" element={<RequestFormPage requirementMode />} />
    <Route path="/request/confirmation" element={<RequestConfirmationPage />} />
    <Route path="/request/status" element={<StatusLookupPage />} />
    <Route path="/login" element={<LoginPage />} />

    <Route element={<ProtectedRoute roles={['OPERATOR']} />}><Route path="/operator" element={<DashboardLayout />}><Route index element={<OperatorDashboardPage />} /></Route></Route>
    <Route element={<ProtectedRoute roles={['HOSPITAL']} />}><Route path="/hospital" element={<DashboardLayout />}><Route index element={<HospitalDashboardPage />} /></Route></Route>
    <Route element={<ProtectedRoute roles={['ADMIN']} />}><Route path="/admin" element={<DashboardLayout />}>
      <Route index element={<AdminDashboardPage />} />
      <Route path="cases" element={<AdminCasesPage />} />
      <Route path="requests/:id" element={<AdminCaseDetailPage />} />
      <Route path="ambulances" element={<AdminAmbulancesPage />} />
      <Route path="hospitals" element={<AdminHospitalsPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="reports" element={<AdminReportsPage />} />
      <Route path="audit" element={<AdminAuditPage />} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider>;
}
