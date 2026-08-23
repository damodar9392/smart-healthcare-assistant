import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div className="footer-brand">
        <span className="navbar-brand">SmartCare</span>
        <p className="muted">
          AI-powered symptom guidance, verified doctors, and effortless booking —
          in one place.
        </p>
      </div>
      <nav className="footer-links" aria-label="Footer">
        <Link to="/symptoms">Check Symptoms</Link>
        <Link to="/doctors">Find Doctors</Link>
        <Link to="/services">Services</Link>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      </nav>
    </div>
    <div className="footer-bottom">
      <p className="muted">
        Medical disclaimer: guidance provided here is temporary and does not
        replace professional medical advice, diagnosis, or treatment.
      </p>
      <span className="muted">© {new Date().getFullYear()} SmartCare</span>
    </div>
  </footer>
);

export default Footer;
