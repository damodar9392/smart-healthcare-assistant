import { useEffect, useState } from 'react';
import api from '../services/api';

const VerifiedGuidance = ({ symptoms, specialty }) => {
  const [guidance, setGuidance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!specialty) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    setGuidance([]);
    api
      .post('/remedies/match', { symptoms, recommendedSpecialty: specialty })
      .then(({ data }) => {
        if (!cancelled) setGuidance(data.data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load doctor-verified guidance.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symptoms, specialty]);

  if (!specialty) {
    return null;
  }

  if (loading) {
    return <p className="muted">Searching doctor-verified guidance...</p>;
  }

  if (error) {
    return <p className="muted">{error}</p>;
  }

  if (guidance.length === 0) {
    return (
      <p className="muted">
        No doctor-verified guidance is published yet for this combination. Follow the
        advice of your treating doctor.
      </p>
    );
  }

  return (
    <div className="verified-guidance">
      <h4>Doctor-verified temporary guidance</h4>
      <p className="guidance-note">
        These entries were reviewed and approved before publication. They are educational
        only and not a diagnosis.
      </p>
      {guidance.map((item) => (
        <div className="card guidance-item" key={item._id}>
          <h5>{item.probableConditionCategory}</h5>
          <p className="muted">
            For: {item.symptoms.map((s) => s.name).join(', ')} · {item.recommendedSpecialty}
          </p>
          <p>{item.safeTemporaryGuidance}</p>
          {item.precautions?.length > 0 && (
            <ul className="guidance-list">
              {item.precautions.map((line) => (
                <li key={line}>Precaution: {line}</li>
              ))}
            </ul>
          )}
          {item.avoid?.length > 0 && (
            <ul className="guidance-list">
              {item.avoid.map((line) => (
                <li key={line}>Avoid: {line}</li>
              ))}
            </ul>
          )}
          {item.emergencyWarningSigns?.length > 0 && (
            <div className="warning-signs">
              <strong>Seek urgent care if you notice:</strong>
              <ul>
                {item.emergencyWarningSigns.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="disclaimer">{item.disclaimer}</p>
          <p className="muted">
            Verified by {item.approval?.approvedBy?.name || 'a medical admin'} · Submitted
            by Dr. {item.doctor?.name || 'Unknown'}
          </p>
        </div>
      ))}
    </div>
  );
};

export default VerifiedGuidance;