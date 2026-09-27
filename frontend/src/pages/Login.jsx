import { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ErrorMessage from '../components/ErrorMessage';

const ROLE_HOME = { patient: '/patient', doctor: '/doctor', admin: '/admin' };

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const successMessage = location.state?.success;

  const lockoutActive = cooldown > 0;

  useEffect(() => {
    if (!lockoutActive) return;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [lockoutActive]);

  if (user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedIn = await login(form);
      navigate(ROLE_HOME[loggedIn.role], { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      if (status === 429) {
        const dataRetry = err.response?.data?.retryAfter;
        const headerRetry = err.response?.headers?.['retry-after'];
        const seconds =
          dataRetry != null ? Number(dataRetry) : headerRetry != null ? Number(headerRetry) : NaN;
        const retryAfter =
          Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 30;
        setCooldown(retryAfter);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Login</h1>
        <p className="muted">Access your Smart Healthcare Assistant account.</p>
        {successMessage && <div className="alert alert-success">{successMessage}</div>}
        {error && <ErrorMessage message={error} />}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting || cooldown > 0}>
            {cooldown > 0
              ? `Retry in ${cooldown}s`
              : submitting
                ? 'Logging in...'
                : 'Login'}
          </button>
        </form>
        <p className="muted auth-switch">
          No account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;