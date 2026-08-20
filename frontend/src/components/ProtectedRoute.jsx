import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loading from './Loading';

const ROLE_HOME = { patient: '/patient', doctor: '/doctor', admin: '/admin' };

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  return children;
};

export default ProtectedRoute;