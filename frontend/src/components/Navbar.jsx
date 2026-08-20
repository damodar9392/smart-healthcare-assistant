import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        SmartCare
      </Link>
      <nav className="navbar-links">
        <Link to="/">Home</Link>
        {user && <Link to="/symptoms">Check Symptoms</Link>}
        <Link to="/services">Services</Link>
        {user && <Link to={`/${user.role}`}>Dashboard</Link>}
      </nav>
      <div className="navbar-actions">
        {user ? (
          <>
            <span className="navbar-user">
              {user.name} <span className={`badge badge-${user.role}`}>{user.role}</span>
            </span>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline btn-sm">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;