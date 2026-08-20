import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import { adminService } from '../../services/adminService';
import { formatDate } from '../../utils/format';

const STATUS_TABS = ['pending', 'verified', 'rejected'];

const VerifyDoctorsSection = () => {
  const [tab, setTab] = useState('pending');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminService.getPendingDoctors(tab);
      setDoctors(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load doctors.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id, status) => {
    setError('');
    setMessage('');
    try {
      await adminService.verifyDoctor(id, { status, notes: notes[id] || '' });
      setMessage(`Doctor ${status}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update verification status.');
    }
  };

  return (
    <div>
      <h2>Verify Doctors</h2>
      <p className="muted section-intro">
        Review license details and approve or reject physician profiles.
      </p>
      <div className="tabs">
        {STATUS_TABS.map((tabName) => (
          <button
            type="button"
            key={tabName}
            className={`tab${tab === tabName ? ' active' : ''}`}
            onClick={() => setTab(tabName)}
          >
            {tabName}
          </button>
        ))}
      </div>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <ErrorMessage message={error} />}
      {loading ? (
        <Loading />
      ) : doctors.length === 0 ? (
        <EmptyState title={`No ${tab} doctors`} hint="Nothing to do here right now." />
      ) : (
        <div className="card-list">
          {doctors.map((doctor) => (
            <div className="card" key={doctor._id}>
              <div className="doctor-card-head">
                {doctor.profilePhoto && (
                  <img
                    className="doctor-photo"
                    src={doctor.profilePhoto}
                    alt={doctor.user?.name}
                  />
                )}
                <div>
                  <h3>{doctor.user?.name || 'Doctor'}</h3>
                  <p>
                    {doctor.specialization} · {doctor.experience} yrs · fee Rs.{' '}
                    {doctor.consultationFee}
                  </p>
                  <p className="muted">
                    {doctor.qualification.join(', ')} · {doctor.hospital?.name}
                    {doctor.hospital?.city ? `, ${doctor.hospital.city}` : ''}
                  </p>
                  {doctor.about && <p className="muted">{doctor.about}</p>}
                </div>
              </div>
              <p className="muted">
                Location: {doctor.location?.coordinates?.[1]},{' '}
                {doctor.location?.coordinates?.[0]}
              </p>
              {doctor.verificationDetails?.licenseNumber && (
                <div className="verification-details">
                  <strong>Verification details:</strong>{' '}
                  {doctor.verificationDetails.licenseNumber} ·{' '}
                  {doctor.verificationDetails.issuingAuthority} · submitted{' '}
                  {formatDate(doctor.verificationDetails.submittedAt)}
                </div>
              )}
              {doctor.verificationHistory?.length > 0 && (
                <div className="history-list">
                  {doctor.verificationHistory
                    .slice(-3)
                    .reverse()
                    .map((entry, index) => (
                      <div className="history-item" key={index}>
                        <span className={`badge badge-${entry.status}`}>{entry.status}</span>
                        <span className="muted">
                          {' '}
                          {formatDate(entry.changedAt)}
                          {entry.notes ? ` — ${entry.notes}` : ''}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              <span className={`badge badge-${doctor.verificationStatus}`}>
                {doctor.verificationStatus}
              </span>
              <div className="form-group">
                <label htmlFor={`vnotes-${doctor._id}`}>Admin notes</label>
                <input
                  id={`vnotes-${doctor._id}`}
                  value={notes[doctor._id] || ''}
                  onChange={(e) => setNotes({ ...notes, [doctor._id]: e.target.value })}
                  placeholder="Reason / instructions for the doctor"
                />
              </div>
              <div className="card-actions">
                {doctor.verificationStatus !== 'verified' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setStatus(doctor._id, 'verified')}
                  >
                    Verify
                  </button>
                )}
                {doctor.verificationStatus !== 'rejected' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setStatus(doctor._id, 'rejected')}
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VerifyDoctorsSection;