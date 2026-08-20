import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import { doctorService } from '../../services/doctorService';
import { formatDate } from '../../utils/format';

const STATUS_LABELS = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const GuidanceStatusSection = () => {
  const [remedies, setRemedies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await doctorService.getRemedies({ mine: 'true' });
      setRemedies(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load submitted guidance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = remedies.reduce(
    (acc, remedy) => {
      acc[remedy.approvalStatus] += 1;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0 }
  );

  const deletePending = async (remedy) => {
    if (!window.confirm('Delete this pending submission?')) return;
    setBusyId(remedy._id);
    try {
      await doctorService.deleteRemedy(remedy._id);
      setRemedies((prev) => prev.filter((r) => r._id !== remedy._id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete submission.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2>Submitted Guidance Status</h2>
      <p className="muted section-intro">
        Every submission must be reviewed and approved by an admin before patients see it.
      </p>
      {remedies.length > 0 && (
        <div className="status-summary">
          <span className="status-chip chip-pending">{counts.pending} pending</span>
          <span className="status-chip chip-approved">{counts.approved} approved</span>
          <span className="status-chip chip-rejected">{counts.rejected} rejected</span>
        </div>
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : remedies.length === 0 ? (
        <EmptyState
          title="Nothing submitted yet"
          hint="Add temporary guidance — its review status will be tracked here."
        />
      ) : (
        <div className="card-list">
          {remedies.map((remedy) => (
            <div className="card" key={remedy._id}>
              <div className="appointment-card-head">
                <div>
                  <h3>{remedy.probableConditionCategory}</h3>
                  <p className="muted">
                    {remedy.symptoms.map((s) => s.name).join(', ')} ·{' '}
                    {remedy.recommendedSpecialty}
                  </p>
                </div>
                <span className={`badge badge-${remedy.approvalStatus}`}>
                  {STATUS_LABELS[remedy.approvalStatus] || remedy.approvalStatus}
                </span>
              </div>
              <p className="muted">
                Submitted {formatDate(remedy.createdAt)}
                {remedy.approval?.approvedAt
                  ? ` · Reviewed ${formatDate(remedy.approval.approvedAt)}`
                  : ''}
              </p>
              {remedy.approval?.notes && (
                <p className="alert alert-error remedy-notes">
                  Admin note: {remedy.approval.notes}
                </p>
              )}
              {remedy.approvalStatus === 'pending' && (
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => deletePending(remedy)}
                    disabled={busyId === remedy._id}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GuidanceStatusSection;