import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import AppointmentItem from '../AppointmentItem';
import useAppointments from '../../hooks/useAppointments';
import { todayISO } from '../../utils/format';

const UpcomingSection = () => {
  const { appointments, loading, error, message, updateStatus, reload } = useAppointments();
  const today = todayISO();

  const upcoming = appointments
    .filter(
      (a) =>
        ['scheduled', 'rescheduled'].includes(a.status) &&
        new Date(a.date).toISOString().slice(0, 10) > today
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  return (
    <div>
      <h2>Upcoming Appointments</h2>
      {message && <div className="alert alert-success">{message}</div>}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : upcoming.length === 0 ? (
        <EmptyState
          title="No upcoming appointments"
          hint="Future bookings will appear here."
        />
      ) : (
        <div className="card-list">
          {upcoming.map((appointment) => (
            <AppointmentItem
              key={appointment._id}
              appointment={appointment}
              onUpdated={updateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingSection;