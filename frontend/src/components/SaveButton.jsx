import { useEffect, useState } from 'react';
import { patientService } from '../services/patientService';

const SaveButton = ({ doctorId, className = 'btn btn-sm btn-outline' }) => {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (saved) {
        await patientService.removeSavedDoctor(doctorId);
      } else {
        await patientService.saveDoctor(doctorId);
      }
      setSaved((prev) => !prev);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update saved doctors.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="save-button-wrap">
      <button
        type="button"
        className={`${className}${saved ? ' saved' : ''}`}
        onClick={toggle}
        disabled={loading || busy}
      >
        {loading ? 'Loading…' : busy ? 'Saving…' : saved ? '★ Saved' : '☆ Save doctor'}
      </button>
      {error && <span className="muted save-button-error">{error}</span>}
    </span>
  );
};

export default SaveButton;