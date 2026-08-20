import { useEffect, useState } from 'react';
import { patientService } from '../services/patientService';

const SaveButton = ({ doctorId, className = 'btn btn-sm btn-outline' }) => {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    patientService
      .getSavedDoctors()
      .then(({ data }) => {
        if (!cancelled) {
          setSaved(data.data.some((item) => String(item.doctor?._id) === String(doctorId)));
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load saved status.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const toggle = async () => {
    setError('');
    try {
      if (saved) {
        await patientService.removeSavedDoctor(doctorId);
      } else {
        await patientService.saveDoctor(doctorId);
      }
      setSaved((prev) => !prev);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update saved doctors.');
    }
  };

  return (
    <span className="save-button-wrap">
      <button
        type="button"
        className={`${className}${saved ? ' saved' : ''}`}
        onClick={toggle}
        disabled={loading}
      >
        {loading ? 'Loading…' : saved ? '★ Saved' : '☆ Save doctor'}
      </button>
      {error && <span className="muted save-button-error">{error}</span>}
    </span>
  );
};

export default SaveButton;