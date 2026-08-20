import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import Pagination from '../Pagination';
import { adminService } from '../../services/adminService';
import { formatDate } from '../../utils/format';

const STATUS_TABS = ['scheduled', 'rescheduled', 'completed', 'cancelled'];

const AppointmentsSection = () => {
  const [tab, setTab] = useState('scheduled');
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10, status: tab };
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await adminService.getAppointments(params);
      setAppointments(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, [tab, page, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (next) => {
    setTab(next);
    setPage(1);
  };

  return (
    <div>
      <h2>Appointments</h2>
      <div className="tabs">
        {STATUS_TABS.map((tabName) => (
          <button
            type="button"
            key={tabName}
            className={`tab${tab === tabName ? ' active' : ''}`}
            onClick={() => switchTab(tabName)}
          >
            {tabName}
          </button>
        ))}
      </div>
      <form className="filter-bar">
        <label>
          From{' '}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To{' '}
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </form>
      {error && <ErrorMessage message={error} />}
      {loading ? (
        <Loading />
      ) : appointments.length === 0 ? (
        <EmptyState title={`No ${tab} appointments`} hint="Adjust the filters to see more." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment._id}>
                    <td>{appointment.patient?.name || '—'}</td>
                    <td>{appointment.doctor?.name || '—'}</td>
                    <td>{formatDate(appointment.date)}</td>
                    <td>
                      {appointment.startTime}-{appointment.endTime}
                    </td>
                    <td>{appointment.reason || '—'}</td>
                    <td>
                      <span className={`badge badge-${appointment.status}`}>
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination?.page}
            pages={pagination?.pages}
            onPage={(p) => setPage(p)}
          />
        </>
      )}
    </div>
  );
};

export default AppointmentsSection;