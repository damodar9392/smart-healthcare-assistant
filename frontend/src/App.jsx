import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import use3DEffects from './hooks/use3DEffects';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BackToTop from './components/BackToTop';
import AssistantChat from './components/AssistantChat';
import NotificationToaster from './components/NotificationToaster';
import ProtectedRoute from './components/ProtectedRoute';
import useLiveNotifications from './hooks/useLiveNotifications';
import { useAuth } from './hooks/useAuth';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ComingSoon from './pages/ComingSoon';
import DoctorList from './pages/DoctorList';
import DoctorDetail from './pages/DoctorDetail';
import BookAppointment from './pages/BookAppointment';
import SymptomForm from './pages/SymptomForm';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ServicesPage from './pages/ServicesPage';
import VideoCallPage from './pages/VideoCallPage';

const Scene3D = lazy(() => import('./components/Scene3D'));

const App = () => {
  use3DEffects();
  const { user } = useAuth();
  const { toasts, dismiss } = useLiveNotifications(Boolean(user));

  return (
    <>
      <Suspense fallback={null}>
        <Scene3D />
      </Suspense>
      <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/symptoms" element={<SymptomForm />} />
      <Route path="/doctors" element={<DoctorList />} />
      <Route path="/doctors/:id" element={<DoctorDetail />} />
      <Route path="/doctors/:id/book" element={<BookAppointment />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route
        path="/patient"
        element={
          <ProtectedRoute role="patient">
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute role="doctor">
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/video/:id"
        element={
          <ProtectedRoute>
            <VideoCallPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<ComingSoon title="Page Not Found" />} />
    </Routes>
    <Footer />
    <BackToTop />
    <AssistantChat />
    <NotificationToaster toasts={toasts} onDismiss={dismiss} />
    </>
  );
};

export default App;