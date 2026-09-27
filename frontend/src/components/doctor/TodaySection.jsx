import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import AppointmentItem from '../AppointmentItem';
import useAppointments from '../../hooks/useAppointments';
import { todayISO, localDateISO } from '../../utils/format';

const TodaySection = () => {
  const { appointments, loading, error, message, updateStatus, reload } = useAppointments();
  const today = todayISO();

  const todays = appointments
    .filter((a) => localDateISO(a.date) === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div>
      <h2>Today's Appointments</h2>
      <p className="muted section-intro">{today}</p>
      {message && <div className="alert alert-success">{message}</div>}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : todays.length === 0 ? (
        <EmptyState
          title="No appointments today"
          hint="Patients will appear here when they book a slot for today."
        />
      ) : (
        <div className="card-list">
          {todays.map((appointment) => (
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

export default TodaySection;