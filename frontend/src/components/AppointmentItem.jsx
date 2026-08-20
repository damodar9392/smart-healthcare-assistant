import { useState } from 'react';
import { formatDate } from '../utils/format';

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const AppointmentItem = ({ appointment, onUpdated }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isActive = ['scheduled', 'rescheduled'].includes(appointment.status);
  const patient = appointment.patient || {};

  const changeStatus = async (status) => {
    if (status === 'cancelled' && !window.confirm('Cancel this appointment?')) return;
    setBusy(true);
    setError('');
    try {
      await onUpdated(appointment, status);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update appointment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card appointment-item">
      <div className="appointment-card-head">
        <div>
          <h3>{patient.name || 'Patient'}</h3>
          <p className="muted">
            {formatDate(appointment.date)} at {appointment.startTime}-{appointment.endTime}
          </p>
        </div>
        <span className={`badge badge-${appointment.status}`}>
          {STATUS_LABELS[appointment.status] || appointment.status}
        </span>
      </div>
      {appointment.reason && <p className="muted appointment-reason">{appointment.reason}</p>}
      {appointment.rescheduleCount > 0 && (
        <p className="muted">Rescheduled {appointment.rescheduleCount}×</p>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card-actions">
        {isActive && (
          <>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => changeStatus('completed')}
              disabled={busy}
            >
              Mark Complete
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => changeStatus('cancelled')}
              disabled={busy}
            >
              Cancel
            </button>
          </>
        )}
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? 'Hide patient details' : 'View patient details'}
        </button>
      </div>

      {detailsOpen && (
        <div className="patient-details">
          <h4>Patient details</h4>
          <p>
            <strong>{patient.name || 'Patient'}</strong>
          </p>
          {patient.phone && <p>Phone: {patient.phone}</p>}
          {patient.email && <p>Email: {patient.email}</p>}
          {appointment.reason && <p>Reason: {appointment.reason}</p>}
          <p className="muted details-note">
            Contact details are visible only for the duration of this appointment.
          </p>
        </div>
      )}
    </div>
  );
};

export default AppointmentItem;