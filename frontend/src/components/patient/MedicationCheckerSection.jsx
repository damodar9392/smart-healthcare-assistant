import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import { patientService } from '../../services/patientService';

const SEVERITY_LABELS = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Caution',
  safe: 'No interaction found',
};

const BADGE_CLASS = {
  urgent: 'emergency',
  high: 'high',
  medium: 'medium',
  safe: 'low',
};

const TagInput = ({ value, onChange, suggestions = [] }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const tag = draft.trim();
    if (!tag) return;
    const exists = value.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (!exists) onChange([...value, tag]);
    setDraft('');
  };
  const remove = (tag) => onChange(value.filter((t) => t !== tag));
  return (
    <div>
      <div className="tag-input">
        <input
          list="med-catalog"
          value={draft}
          placeholder="Type a medicine name, e.g. ibuprofen"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
        <datalist id="med-catalog">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button type="button" className="btn btn-outline" onClick={add}>
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="tags">
          {value.map((tag) => (
            <span key={tag} className="tag">
              {tag}
              <button type="button" className="tag-remove" aria-label={`Remove ${tag}`} onClick={() => remove(tag)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const MedicationCheckerSection = () => {
  const [catalog, setCatalog] = useState([]);
  const [medications, setMedications] = useState([]);
  const [result, setResult] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const { data } = await patientService.getInteractionsCatalog();
      setCatalog(data.data);
    } catch {
      setCatalog([]);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const check = async (e) => {
    e.preventDefault();
    if (medications.length === 0) {
      setError('Add at least one medicine to check.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await patientService.checkInteractions(medications);
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not run the check.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>Medication Interaction Checker</h2>
      <p className="muted section-intro">
        Add the medicines you are taking to see common interactions. This is general guidance,
        not a substitute for your doctor's advice.
      </p>

      {loadingCatalog ? (
        <Loading />
      ) : (
        <form className="card" onSubmit={check}>
          <label>Medicines you are taking</label>
          <TagInput value={medications} onChange={setMedications} suggestions={catalog} />
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Checking…' : 'Check interactions'}
            </button>
          </div>
        </form>
      )}

      {error && <ErrorMessage message={error} />}

      {result && (
        <div className="section-gap">
          {result.duplicates.length > 0 && (
            <div className="alert alert-warning">
              Same medicine listed more than once: {result.duplicates.join(', ')}. This can mean
              accidental double-dosing.
            </div>
          )}
          {result.interactions.length === 0 ? (
            <div className="card interaction-safe">
              <span className={`badge badge-${BADGE_CLASS[result.level]}`}>{SEVERITY_LABELS.safe}</span>
              <p>No common interactions were found between the medicines you listed.</p>
            </div>
          ) : (
            <div className="card-list">
              <div className="summary-bar">
                <span className={`badge badge-${BADGE_CLASS[result.level]}`}>{SEVERITY_LABELS[result.level]}</span>
                <span className="muted">
                  {result.summary.urgent} urgent · {result.summary.high} high ·{' '}
                  {result.summary.medium} caution
                </span>
              </div>
              {result.interactions.map((interaction) => (
                <div className={`card interaction-card interaction-${interaction.severity}`} key={interaction.category}>
                  <div className="appointment-card-head">
                    <h3>
                      {interaction.medications.join(' + ')}
                    </h3>
                    <span className={`badge badge-${BADGE_CLASS[interaction.severity]}`}>
                      {SEVERITY_LABELS[interaction.severity]}
                    </span>
                  </div>
                  <p className="muted">{interaction.category}</p>
                  <p>{interaction.advice}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MedicationCheckerSection;