import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import TagInput from '../components/TagInput';
import ErrorMessage from '../components/ErrorMessage';
import UrgencyWarning from '../components/UrgencyWarning';
import VerifiedGuidance from '../components/VerifiedGuidance';

const URGENCY_LABELS = {
  low: 'Low — monitor at home',
  medium: 'Medium — see a doctor soon',
  high: 'High — prompt attention',
  emergency: 'Emergency — seek care now',
};

const SymptomForm = () => {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState({
    symptoms: [],
    additionalSymptoms: [],
    durationInDays: '',
    severity: 'mild',
    description: '',
  });
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .get('/symptoms')
      .then(({ data }) => setCatalog(data.data))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const canSubmit =
    form.symptoms.length > 0 && form.durationInDays > 0 && acceptedDisclaimer && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post('/symptoms/analyze', {
        symptoms: form.symptoms,
        additionalSymptoms: form.additionalSymptoms,
        durationInDays: Number(form.durationInDays),
        severity: form.severity,
        description: form.description.trim(),
      });
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="symptom-form-wrap">
      <h1>Check Symptoms</h1>
      <p className="muted">
        Enter your symptoms to receive a preliminary category estimate, recommended
        specialty, and urgency level.
      </p>

      {!user && (
        <div className="alert alert-success">
          <span>Log in to save your search history and see past analyses.</span>
          <Link to="/login" className="btn btn-sm btn-outline">
            Login
          </Link>
        </div>
      )}

      <div className="card form-card">
        <form onSubmit={handleSubmit}>
          <TagInput
            label="Main symptoms"
            name="mainSymptoms"
            value={form.symptoms}
            onChange={(value) => setForm({ ...form, symptoms: value })}
            suggestions={catalog}
            placeholder="Type a symptom and press Enter"
            required
          />
          <TagInput
            label="Additional symptoms"
            name="additionalSymptoms"
            value={form.additionalSymptoms}
            onChange={(value) => setForm({ ...form, additionalSymptoms: value })}
            suggestions={catalog}
            placeholder="Optional — type and press Enter"
          />
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="durationInDays">
                Duration in days <span className="required-star">*</span>
              </label>
              <input
                id="durationInDays"
                name="durationInDays"
                type="number"
                min={1}
                max={365}
                value={form.durationInDays}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>
                Severity <span className="required-star">*</span>
              </label>
              <div className="radio-group">
                {['mild', 'moderate', 'severe'].map((level) => (
                  <label key={level} className="radio-label">
                    <input
                      type="radio"
                      name="severity"
                      value={level}
                      checked={form.severity === level}
                      onChange={handleChange}
                    />
                    {level}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="description">Additional description (optional)</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={handleChange}
              placeholder="Anything else that may help (max 500 characters)"
            />
          </div>
          <div className="disclaimer-box">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={acceptedDisclaimer}
                onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
              />
              <span>
                I understand this tool provides general guidance only and does not
                constitute a medical diagnosis. Emergency symptoms require immediate
                professional care.
              </span>
            </label>
          </div>
          {error && <ErrorMessage message={error} />}
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {loading ? 'Analyzing...' : 'Analyze Symptoms'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card result-card">
          <h3>Analysis Result</h3>
          <div className="result-grid">
            <div>
              <span className="result-label">Recommended specialty</span>
              <strong>{result.recommendedSpecialty}</strong>
            </div>
            <div>
              <span className="result-label">Urgency level</span>
              <span className={`badge badge-${result.urgencyLevel}`}>
                {URGENCY_LABELS[result.urgencyLevel]}
              </span>
            </div>
            <div>
              <span className="result-label">Confidence score</span>
              <strong>{Math.round(result.confidenceScore * 100)}%</strong>
            </div>
          </div>
          <p className="muted">{result.summary}</p>
          {result.message && result.showTemporaryGuidance !== false && (
            <p className="muted">{result.message}</p>
          )}
          <UrgencyWarning result={result} />
          {result.showTemporaryGuidance !== false && (
            <VerifiedGuidance
              symptoms={form.symptoms}
              specialty={result.recommendedSpecialty}
            />
          )}
          <p className="disclaimer">{result.disclaimer}</p>
          <Link
            to={`/doctors?specialty=${encodeURIComponent(result.recommendedSpecialty)}`}
            className="btn btn-primary"
          >
            Find Doctors
          </Link>
        </div>
      )}
    </div>
  );
};

export default SymptomForm;