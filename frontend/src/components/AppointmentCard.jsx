import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Loading from './Loading';
import { patientService } from '../services/patientService';
import { formatDate, todayISO } from '../utils/format';

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const AppointmentCard = ({ appointment, onChanged, showActions = true }) => {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const slotsRequestRef = useRef(0);

  const isActive = ['scheduled', 'rescheduled'].includes(appointment.status);
  const doctorId = appointment.doctorProfileId;

  const loadSlots = async (value) => {
    const requestId = ++slotsRequestRef.current;
    setDate(value);
    setSelected(null);
    setError('');
    if (!value) {
      setSlots([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await patientService.getSlots(doctorId, value);
      if (requestId !== slotsRequestRef.current) return;
      setSlots(data.data);
    } catch (err) {
      if (requestId !== slotsRequestRef.current) return;
      setError(err.response?.data?.message || 'Failed to load slots.');
    } finally {
      if (requestId === slotsRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const cancel = async () => {
    setError('');
    setMessage('');
    if (!window.confirm(`Cancel this appointment with ${appointment.doctor?.name}?`)) return;
    setBusy(true);
    try {
      await patientService.cancelAppointment(appointment._id);
      setMessage('Appointment cancelled.');
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel appointment.');
    } finally {
      setBusy(false);
    }
  };

  const confirmReschedule = async () => {
    if (!selected) {
      setError('Please select a new time slot.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await patientService.rescheduleAppointment(appointment._id, {
        date,
        startTime: selected.startTime,
        endTime: selected.endTime,
      });
      setMessage('Appointment rescheduled.');
      setRescheduleOpen(false);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reschedule appointment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card appointment-card">
      <div className="appointment-card-head">
        <h3>{appointment.doctor?.name || 'Doctor'}</h3>
        <span className={`badge badge-${appointment.status}`}>
          {STATUS_LABELS[appointment.status] || appointment.status}
        </span>
      </div>
      <p>
        {formatDate(appointment.date)} at {appointment.startTime}-{appointment.endTime}
      </p>
      {appointment.reason && <p className="muted">{appointment.reason}</p>}
      {appointment.rescheduleCount > 0 && (
        <p className="muted">Rescheduled {appointment.rescheduleCount}×</p>
      )}
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showActions && (
        <div className="card-actions">
          {isActive && (
            <>
              <Link to={`/video/${appointment._id}`} className="btn btn-sm btn-primary">
                Video call
              </Link>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setRescheduleOpen((open) => !open)}
                disabled={busy}
              >
                Reschedule
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={cancel}
                disabled={busy}
              >
                Cancel
              </button>
            </>
          )}
          {doctorId && (
            <>
              <Link to={`/doctors/${doctorId}`} className="btn btn-sm btn-outline">
                View doctor
              </Link>
              {!isActive && (
                <Link to={`/doctors/${doctorId}/book`} className="btn btn-sm btn-primary">
                  Book another appointment
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {rescheduleOpen && isActive && doctorId && (
        <div className="reschedule-form">
          <div className="form-group">
            <label htmlFor={`rs-date-${appointment._id}`}>New date</label>
            <input
              id={`rs-date-${appointment._id}`}
              type="date"
              min={todayISO()}
              value={date}
              onChange={(e) => loadSlots(e.target.value)}
              disabled={busy}
            />
          </div>
          {loading && <Loading label="Loading slots..." />}
          {!loading && slots.length === 0 && date && (
            <p className="muted">No available slots on this date.</p>
          )}
          {slots.length > 0 && (
            <>
              <div className="slots-grid">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.startTime}
                    className={`slot-btn${selected?.startTime === slot.startTime ? ' selected' : ''}`}
                    onClick={() => setSelected(slot)}
                    disabled={busy}
                  >
                    {slot.startTime} - {slot.endTime}
                  </button>
                ))}
              </div>
              <div className="card-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={confirmReschedule}
                  disabled={busy}
                >
                  Confirm New Time
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setRescheduleOpen(false)}
                  disabled={busy}
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AppointmentCard;