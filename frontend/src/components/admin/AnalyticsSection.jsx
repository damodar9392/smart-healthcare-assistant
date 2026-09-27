import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import { adminService } from '../../services/adminService';

const LineChart = ({ points, height = 160, color = 'var(--accent)' }) => {
  const values = points.map((p) => p.value);
  const max = Math.max(1, ...values);
  const stepX = points.length > 1 ? 100 / (points.length - 1) : 100;
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * stepX : 50;
    const y = 100 - (p.value / max) * 100;
    return `${x},${y}`;
  });

  return (
    <div className="chart-wrap">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" height={height} className="line-chart">
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="chart-axis">
        <span>{points[0]?.label || ''}</span>
        <span>max {max}</span>
        <span>{points[points.length - 1]?.label || ''}</span>
      </div>
    </div>
  );
};

const BarList = ({ items }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <span className="bar-label">{item.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="bar-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

const StatTile = ({ label, value, hint }) => (
  <div className="stat-card">
    <p className="muted">{label}</p>
    <h3>{value}</h3>
    {hint && <p className="muted stat-hint">{hint}</p>}
  </div>
);

const AnalyticsSection = () => {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getAnalytics(days);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!data) return null;

  const apptPoints = data.appointmentsByDay.map((d) => ({ label: d._id.slice(5), value: d.count }));
  const userPoints = data.usersTrend.map((d) => ({ label: d._id.slice(5), value: d.count }));
  const revenueTotal = data.revenue.byStatus.paid?.total || 0;

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Analytics</h2>
          <p className="muted section-intro">Platform activity over the last {days} days.</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="stats-grid">
        <StatTile label="Appointments" value={apptPoints.reduce((s, p) => s + p.value, 0)} />
        <StatTile label="New users" value={userPoints.reduce((s, p) => s + p.value, 0)} />
        <StatTile label="Assistant conversations" value={data.conversations} />
        <StatTile label="Active prescriptions" value={data.prescriptions} />
        <StatTile label="Revenue collected" value={revenueTotal} hint="Paid invoices" />
      </div>

      <div className="card">
        <h3>Appointments per day</h3>
        {apptPoints.length ? <LineChart points={apptPoints} /> : <p className="muted">No data.</p>}
      </div>

      <div className="card">
        <h3>New users per day</h3>
        {userPoints.length ? <LineChart points={userPoints} color="var(--accent-2)" /> : <p className="muted">No data.</p>}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Top reported symptoms</h3>
          {data.topSymptoms.length ? (
            <BarList
              items={data.topSymptoms.map((s) => ({ label: s.symptom || 'unknown', value: s.count }))}
            />
          ) : (
            <p className="muted">No data.</p>
          )}
        </div>

        <div className="card">
          <h3>Urgency distribution</h3>
          <BarList
            items={Object.entries(data.urgencyDistribution).map(([label, value]) => ({ label, value }))}
          />
        </div>

        <div className="card">
          <h3>Appointment status</h3>
          <BarList
            items={Object.entries(data.statusDistribution).map(([label, value]) => ({ label, value }))}
          />
        </div>

        <div className="card">
          <h3>Busiest doctors</h3>
          {data.doctorLoad.length ? (
            <BarList items={data.doctorLoad.map((d) => ({ label: d.doctor, value: d.count }))} />
          ) : (
            <p className="muted">No data.</p>
          )}
        </div>

        <div className="card">
          <h3>Payments by status</h3>
          <BarList
            items={Object.entries(data.revenue.byStatus).map(([label, v]) => ({
              label: `${label} (${v.total})`,
              value: v.count,
            }))}
          />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSection;