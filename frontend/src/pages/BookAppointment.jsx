import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../hooks/useAuth';
import { todayISO, addDaysISO } from '../utils/format';

const BookAppointment = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [booked, setBooked] = useState(null);
  const slotsRequestRef = useRef(0);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/doctors/${id}`);
      setProfile(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load doctor profile.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadSlots = async (selectedDate) => {
    const requestId = ++slotsRequestRef.current;
    setSlotsLoading(true);
    setSlotsError('');
    setSelected(null);
    try {
      const { data } = await api.get(`/doctors/${id}/slots`, {
        params: { date: selectedDate },
      });
      if (requestId !== slotsRequestRef.current) return;
      setSlots(data.data);
    } catch (err) {
      if (requestId !== slotsRequestRef.current) return;
      setSlotsError(err.response?.data?.message || 'Failed to load available slots.');
    } finally {
      if (requestId === slotsRequestRef.current) {
        setSlotsLoading(false);
      }
    }
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    setDate(value);
    setBooked(null);
    setSubmitError('');
    if (value) {
      loadSlots(value);
    } else {
      slotsRequestRef.current += 1;
      setSlots([]);
    }
  };

  const confirmBooking = async (e) => {
    e.preventDefault();
    if (!selected) {
      setSubmitError('Please select a time slot.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data } = await api.post('/appointments', {
        doctor: profile.user._id,
        date,
        startTime: selected.startTime,
        endTime: selected.endTime,
        reason: reason.trim(),
      });
      setBooked(data.data);
      setSlots((prev) => prev.filter((s) => s.startTime !== selected.startTime));
      setSelected(null);
      setReason('');
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
          'Booking failed. The slot may have just been taken — please try another.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="card">
        <h2>Book an Appointment</h2>
        <p className="muted">
          Log in as a patient to book an appointment.{' '}
          <Link to="/login">Login</Link> or <Link to="/register">Register</Link>.
        </p>
      </div>
    );
  }

  if (user.role !== 'patient') {
    return (
      <div className="card">
        <h2>Book an Appointment</h2>
        <p className="muted">Only patients can book appointments.</p>
      </div>
    );
  }

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (booked) {
    return (
      <div className="card">
        <h2>Appointment Booked</h2>
        <div className="alert alert-success">
          Your appointment with {profile.user?.name} is scheduled for {date} at{' '}
          {booked.startTime}.
        </div>
        <p className="muted">You can view or manage it from your dashboard.</p>
        <Link to="/patient" className="btn btn-primary">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="book-page">
      <Link to={`/doctors/${id}`} className="back-link">
        ← Back to {profile.user?.name || 'doctor profile'}
      </Link>
      <h1>Book with {profile.user?.name}</h1>
      <p className="muted">
        {profile.specialization} · Rs. {profile.consultationFee} per consultation ·{' '}
        {profile.hospital?.name}
      </p>

      <div className="card form-card">
        <div className="form-group">
          <label htmlFor="book-date">Select date</label>
          <input
            id="book-date"
            type="date"
            min={todayISO()}
            max={addDaysISO(14)}
            value={date}
            onChange={handleDateChange}
            required
          />
        </div>

        {slotsLoading && <Loading label="Loading available slots..." />}
        {!slotsLoading && slotsError && <ErrorMessage message={slotsError} />}

        {!slotsLoading && !slotsError && date && slots.length === 0 && (
          <p className="muted">
            No available slots on this date. Try another day within the next 14 days.
          </p>
        )}

        {!slotsLoading && slots.length > 0 && (
          <div className="slots-grid">
            {slots.map((slot) => (
              <button
                type="button"
                key={slot.startTime}
                className={`slot-btn${selected?.startTime === slot.startTime ? ' selected' : ''}`}
                onClick={() => setSelected(slot)}
              >
                {slot.startTime} - {slot.endTime}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <form onSubmit={confirmBooking}>
            <div className="form-group">
              <label htmlFor="book-reason">Reason for visit</label>
              <textarea
                id="book-reason"
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe why you need the appointment"
                required
              />
            </div>
            {submitError && <div className="alert alert-error">{submitError}</div>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Booking...' : `Confirm ${selected.startTime} Appointment`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BookAppointment;