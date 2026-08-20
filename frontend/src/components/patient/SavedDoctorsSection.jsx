import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import { patientService } from '../../services/patientService';

const SavedDoctorsSection = () => {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await patientService.getSavedDoctors();
      setSaved(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load saved doctors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (profileId) => {
    setBusyId(profileId);
    try {
      await patientService.removeSavedDoctor(profileId);
      setSaved((prev) => prev.filter((item) => String(item.doctor?._id) !== String(profileId)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove doctor.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2>Saved Doctors</h2>
      <p className="muted section-intro">
        Doctors you marked as favourites for quick booking.
      </p>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : saved.length === 0 ? (
        <EmptyState
          title="No saved doctors yet"
          hint="Save doctors you like from their profile page."
          action={
            <Link to="/doctors" className="btn btn-sm btn-primary">
              Browse doctors
            </Link>
          }
        />
      ) : (
        <div className="card-list">
          {saved.map((item) => {
            const doctor = item.doctor || {};
            return (
              <div className="card" key={item._id}>
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
                    <p className="muted">
                      {doctor.specialization}
                      {doctor.experience ? ` · ${doctor.experience} yrs experience` : ''}
                    </p>
                    <span className={`badge badge-${doctor.verificationStatus}`}>
                      {doctor.verificationStatus}
                    </span>
                  </div>
                </div>
                <div className="doctor-card-meta">
                  {doctor.consultationFee ? (
                    <span>Consultation fee: Rs. {doctor.consultationFee}</span>
                  ) : null}
                  <span className="badge badge-approved">
                    ★ {doctor.rating?.toFixed(1) || '0.0'}
                  </span>
                </div>
                <div className="card-actions">
                  <Link to={`/doctors/${doctor._id}`} className="btn btn-sm btn-outline">
                    View profile
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => remove(doctor._id)}
                    disabled={busyId === doctor._id}
                  >
                    {busyId === doctor._id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedDoctorsSection;