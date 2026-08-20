import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
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

const App = () => (
  <>
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
      <Route path="*" element={<ComingSoon title="Page Not Found" />} />
    </Routes>
  </>
);

export default App;