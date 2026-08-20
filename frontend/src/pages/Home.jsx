import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <section className="hero">
        <h1>AI-Powered Smart Healthcare Assistant</h1>
        <p>
          Describe your symptoms, receive safe temporary guidance reviewed by qualified
          doctors, and find verified specialists near you — all in one place.
        </p>
        <div className="hero-actions">
          <Link to="/symptoms" className="btn btn-primary">
            Check Symptoms
          </Link>
          <Link to="/doctors" className="btn btn-outline">
            Find Doctors
          </Link>
        </div>
        <div className="hero-auth">
          {user ? (
            <Link to={`/${user.role}`} className="btn btn-primary">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary">
                Login
              </Link>
              <Link to="/register" className="btn btn-outline">
                Register
              </Link>
            </>
          )}
        </div>
      </section>
      <section className="features">
        <div className="card feature-card">
          <h3>Symptom Guidance</h3>
          <p>
            Doctor-reviewed, admin-approved temporary guidance for your symptoms — with
            clear emergency warning signs and a medical disclaimer.
          </p>
        </div>
        <div className="card feature-card">
          <h3>Verified Doctors</h3>
          <p>
            Search verified specialists by specialty, city, rating, or proximity, and
            book appointments with real-time slot conflict checks.
          </p>
        </div>
        <div className="card feature-card">
          <h3>Role-Based Dashboards</h3>
          <p>
            Dedicated workspaces for patients, doctors, and admins with appointments,
            availability, and guidance approvals.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;