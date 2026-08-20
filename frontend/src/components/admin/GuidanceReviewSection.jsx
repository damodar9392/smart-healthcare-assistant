import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import { adminService } from '../../services/adminService';

const GuidanceReviewSection = () => {
  const [remedies, setRemedies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminService.getPendingGuidance();
      setRemedies(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load guidance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id, status) => {
    setError('');
    setMessage('');
    setBusyId(id);
    try {
      await adminService.decideGuidance(id, status, notes[id] || '');
      setMessage(`Guidance ${status}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update approval status.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2>Review Submitted Guidance</h2>
      <p className="muted section-intro">
        Only approved guidance is shown to patients. Add notes for the submitting doctor.
      </p>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <ErrorMessage message={error} />}
      {loading ? (
        <Loading />
      ) : remedies.length === 0 ? (
        <EmptyState title="No pending guidance" hint="New submissions will appear here." />
      ) : (
        <div className="card-list">
          {remedies.map((remedy) => (
            <div className="card" key={remedy._id}>
              <h3>{remedy.probableConditionCategory}</h3>
              <p className="muted">
                Submitted by {remedy.doctor?.name || 'Doctor'} · Specialty:{' '}
                {remedy.recommendedSpecialty}
              </p>
              <p className="muted">Symptoms: {remedy.symptoms.map((s) => s.name).join(', ')}</p>
              <p>{remedy.safeTemporaryGuidance}</p>
              {remedy.precautions?.length > 0 && (
                <p className="muted">Precautions: {remedy.precautions.join('; ')}</p>
              )}
              {remedy.avoid?.length > 0 && (
                <p className="muted">Avoid: {remedy.avoid.join('; ')}</p>
              )}
              {remedy.emergencyWarningSigns?.length > 0 && (
                <p className="muted">Warning signs: {remedy.emergencyWarningSigns.join('; ')}</p>
              )}
              <div className="form-group">
                <label htmlFor={`notes-${remedy._id}`}>Admin notes</label>
                <input
                  id={`notes-${remedy._id}`}
                  value={notes[remedy._id] || ''}
                  onChange={(e) => setNotes({ ...notes, [remedy._id]: e.target.value })}
                  placeholder="Optional note to the doctor"
                />
              </div>
              <div className="card-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => decide(remedy._id, 'approved')}
                  disabled={busyId === remedy._id}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => decide(remedy._id, 'rejected')}
                  disabled={busyId === remedy._id}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GuidanceReviewSection;