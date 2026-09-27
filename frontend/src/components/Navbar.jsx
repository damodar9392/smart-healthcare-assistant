import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const close = () => setOpen(false);

  const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand" onClick={close}>
        SmartCare
      </Link>
      <button
        type="button"
        className={`nav-toggle${open ? ' open' : ''}`}
        aria-label="Toggle navigation"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav className={`navbar-links${open ? ' open' : ''}`}>
        <NavLink to="/" className={navClass} end onClick={close}>
          Home
        </NavLink>
        {user && (
          <NavLink to="/symptoms" className={navClass} onClick={close}>
            Check Symptoms
          </NavLink>
        )}
        <NavLink to="/services" className={navClass} onClick={close}>
          Services
        </NavLink>
        {user && (
          <NavLink to={`/${user.role}`} className={navClass} onClick={close}>
            Dashboard
          </NavLink>
        )}
      </nav>
      <div className="navbar-actions">
        <ThemeToggle />
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
            <Link to="/login" className="btn btn-outline btn-sm" onClick={close}>
              Login
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
