import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import { patientService } from '../../services/patientService';
import { formatDate } from '../../utils/format';

const URGENCY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  emergency: 'Emergency',
};

const SearchesSection = () => {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await patientService.getSearches();
      setSearches(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load search history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h2>Recent Symptom Analyses</h2>
      <p className="muted section-intro">
        Your past analyses with recommended specialty and urgency level.
      </p>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : searches.length === 0 ? (
        <EmptyState
          title="No analyses yet"
          hint="Check your symptoms to get a recommended specialty and urgency level."
          action={
            <Link to="/symptoms" className="btn btn-sm btn-primary">
              Check symptoms
            </Link>
          }
        />
      ) : (
        <div className="card-list">
          {searches.map((search) => (
            <div className="card" key={search._id}>
              <div className="appointment-card-head">
                <h3>{search.symptoms.join(', ')}</h3>
                <span className={`badge badge-${search.result?.urgencyLevel || 'low'}`}>
                  {URGENCY_LABELS[search.result?.urgencyLevel || 'low']}
                </span>
              </div>
              <p className="muted">
                {formatDate(search.createdAt)} · {search.severity} ·{' '}
                {search.durationInDays} day{search.durationInDays === 1 ? '' : 's'}
              </p>
              <p>
                Recommended: <strong>{search.result?.recommendedSpecialty}</strong>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchesSection;