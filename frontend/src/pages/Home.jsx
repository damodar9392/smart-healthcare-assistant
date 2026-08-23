import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Reveal from '../components/Reveal';

const FEATURES = [
  {
    title: 'Symptom Guidance',
    description:
      'Doctor-reviewed, admin-approved temporary guidance for your symptoms — with clear emergency warning signs and a medical disclaimer.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
        <path d="M9 12.5V15a5.5 5.5 0 0 0 11 0v-1.5" />
        <circle cx="20" cy="11" r="2" />
      </svg>
    ),
  },
  {
    title: 'Verified Doctors',
    description:
      'Search verified specialists by specialty, city, rating, or proximity, and book appointments with real-time slot conflict checks.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Role-Based Dashboards',
    description:
      'Dedicated workspaces for patients, doctors, and admins with appointments, availability, and guidance approvals.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="5" rx="2" />
        <rect x="13" y="10" width="8" height="11" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
      </svg>
    ),
  },
  {
    title: '24/7 AI Assistance',
    description:
      'Smart symptom triage around the clock with urgency detection, safety overrides, and instant specialist recommendations when you need them.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
];

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <div className="hero-orb hero-orb-a" aria-hidden="true" />
      <div className="hero-orb hero-orb-b" aria-hidden="true" />
      <section className="hero">
        <Reveal>
          <span className="hero-eyebrow">AI-Powered Healthcare</span>
          <h1>
            Your Smart <span>Healthcare Assistant</span>
          </h1>
          <p>
            Describe your symptoms, receive safe temporary guidance reviewed by qualified
            doctors, and find verified specialists near you — all in one place.
          </p>
          <div className="hero-actions">
            <Link to="/symptoms" className="btn btn-primary btn-lg">
              Check Symptoms
            </Link>
            <Link to="/doctors" className="btn btn-outline btn-lg">
              Find Doctors
            </Link>
          </div>
          <div className="hero-auth">
            {user ? (
              <Reveal delay={150}>
                <Link to={`/${user.role}`} className="btn btn-primary">
                  Go to Dashboard
                </Link>
              </Reveal>
            ) : (
              <>
                <Reveal delay={150}>
                  <Link to="/login" className="btn btn-primary">
                    Login
                  </Link>
                </Reveal>
                <Reveal delay={250}>
                  <Link to="/register" className="btn btn-outline">
                    Register
                  </Link>
                </Reveal>
              </>
            )}
          </div>
        </Reveal>
      </section>
      <section className="features">
        {FEATURES.map((feature, index) => (
          <Reveal key={feature.title} delay={index * 120}>
            <div className="card feature-card">
              <span className="feature-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          </Reveal>
        ))}
      </section>
    </div>
  );
};

export default Home;
