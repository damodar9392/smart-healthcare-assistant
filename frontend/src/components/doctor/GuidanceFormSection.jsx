import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import { doctorService } from '../../services/doctorService';

const EMPTY_FORM = {
  symptoms: [],
  probableConditionCategory: '',
  recommendedSpecialty: '',
  safeTemporaryGuidance: '',
  precautions: '',
  avoid: '',
  emergencyWarningSigns: '',
};

const GuidanceFormSection = () => {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await doctorService.getSymptomCatalog();
      setCatalog(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load symptom catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const toggleSymptom = (id) => {
    const selected = form.symptoms.includes(id);
    setForm({
      ...form,
      symptoms: selected ? form.symptoms.filter((s) => s !== id) : [...form.symptoms, id],
    });
  };

  const splitLines = (text) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await doctorService.createRemedy({
        ...form,
        precautions: splitLines(form.precautions),
        avoid: splitLines(form.avoid),
        emergencyWarningSigns: splitLines(form.emergencyWarningSigns),
      });
      setMessage('Guidance submitted for admin review. Track its status in the Submitted Guidance section.');
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit guidance.');
    }
  };

  return (
    <div>
      <h2>Add Temporary Guidance</h2>
      <p className="muted section-intro">
        Submit educational guidance for patients. An admin must approve it before it is
        shown in symptom analyses.
      </p>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <ErrorMessage message={error} />}
      <div className="card form-card">
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Related symptoms</label>
            {loading ? (
              <Loading />
            ) : (
              <div className="checkbox-grid">
                {catalog.map((symptom) => (
                  <label key={symptom._id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.symptoms.includes(symptom._id)}
                      onChange={() => toggleSymptom(symptom._id)}
                    />
                    {symptom.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="probableConditionCategory">Probable condition category</label>
              <input
                id="probableConditionCategory"
                name="probableConditionCategory"
                value={form.probableConditionCategory}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="recommendedSpecialty">Recommended specialty</label>
              <input
                id="recommendedSpecialty"
                name="recommendedSpecialty"
                value={form.recommendedSpecialty}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="safeTemporaryGuidance">Safe temporary guidance</label>
            <textarea
              id="safeTemporaryGuidance"
              name="safeTemporaryGuidance"
              rows={4}
              value={form.safeTemporaryGuidance}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="precautions">Precautions (one per line)</label>
            <textarea
              id="precautions"
              name="precautions"
              rows={3}
              value={form.precautions}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="avoid">Foods or activities to avoid (one per line)</label>
            <textarea
              id="avoid"
              name="avoid"
              rows={3}
              value={form.avoid}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="emergencyWarningSigns">Emergency warning signs (one per line)</label>
            <textarea
              id="emergencyWarningSigns"
              name="emergencyWarningSigns"
              rows={3}
              value={form.emergencyWarningSigns}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Submit for Review
          </button>
        </form>
      </div>
    </div>
  );
};

export default GuidanceFormSection;