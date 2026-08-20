import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import { adminService } from '../../services/adminService';

const StatCard = ({ label, value, tone }) => (
  <div className={`stat-card${tone ? ` stat-${tone}` : ''}`}>
    <span className="stat-value">{value}</span>
    <span className="stat-label">{label}</span>
  </div>
);

const Breakdown = ({ title, items }) => (
  <div className="card breakdown-card">
    <h4>{title}</h4>
    <div className="breakdown-list">
      {Object.entries(items).map(([key, value]) => (
        <span className="breakdown-item" key={key}>
          <span className="badge badge-admin capitalize">{key}</span>
          <strong>{value}</strong>
        </span>
      ))}
    </div>
  </div>
);

const StatsSection = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminService.getStats();
      setStats(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={load} />;
  }

  return (
    <div>
      <h2>Overview</h2>
      <div className="stats-grid">
        <StatCard label="Total users" value={stats.totalUsers} />
        <StatCard label="Total doctors" value={stats.totalDoctors} tone="blue" />
        <StatCard label="Verified doctors" value={stats.verifiedDoctors} tone="green" />
        <StatCard label="Pending verifications" value={stats.pendingVerifications} tone="yellow" />
        <StatCard label="Pending guidance" value={stats.pendingGuidance} tone="yellow" />
        <StatCard label="Total appointments" value={stats.totalAppointments} tone="purple" />
      </div>
      <div className="breakdown-row">
        <Breakdown title="Users by role" items={stats.usersByRole} />
        <Breakdown title="Doctors by status" items={stats.doctorsByStatus} />
        <Breakdown title="Appointments by status" items={stats.appointmentsByStatus} />
      </div>
    </div>
  );
};

export default StatsSection;