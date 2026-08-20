import { Link } from 'react-router-dom';

const ComingSoon = ({ title }) => (
  <div className="coming-soon">
    <h1>{title}</h1>
    <p className="muted">This module is under construction and will be available soon.</p>
    <Link to="/" className="btn btn-outline">
      Back to Home
    </Link>
  </div>
);

export default ComingSoon;