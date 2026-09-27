import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import AppointmentCard from '../AppointmentCard';
import { patientService } from '../../services/patientService';
import { todayISO, localDateISO } from '../../utils/format';

const AppointmentsSection = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await patientService.getAppointments();
      setAppointments(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayISO();
  const upcoming = appointments.filter(
    (a) =>
      ['scheduled', 'rescheduled'].includes(a.status) &&
      localDateISO(a.date) >= today
  );
  const past = appointments.filter((a) => !upcoming.includes(a));

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <h2>Upcoming Appointments</h2>
      {error && <ErrorMessage message={error} onRetry={load} />}
      {!error && upcoming.length === 0 ? (
        <EmptyState
          title="No upcoming appointments"
          hint="Find a doctor and book your first visit."
          action={
            <Link to="/doctors" className="btn btn-sm btn-primary">
              Find a doctor
            </Link>
          }
        />
      ) : (
        <div className="card-list">
          {upcoming.map((appointment) => (
            <AppointmentCard
              key={appointment._id}
              appointment={appointment}
              onChanged={load}
            />
          ))}
        </div>
      )}

      <h2 className="section-gap">Previous Appointments</h2>
      {!error && past.length === 0 ? (
        <EmptyState
          title="No previous appointments"
          hint="Your completed and cancelled appointments will appear here."
          action={
            <Link to="/doctors" className="btn btn-sm btn-outline">
              Book an appointment
            </Link>
          }
        />
      ) : (
        <div className="card-list">
          {past.map((appointment) => (
            <AppointmentCard key={appointment._id} appointment={appointment} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentsSection;