import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import { patientService } from '../../services/patientService';
import { formatDate } from '../../utils/format';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['male', 'female', 'other', 'prefer not to say'];
const VITAL_TYPES = ['blood_pressure', 'heart_rate', 'temperature', 'weight', 'blood_sugar'];

const TimelineDot = ({ type }) => (
  <span className={`timeline-dot timeline-${type}`} />
);

const Sparkline = ({ values }) => {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 180;
  const height = 48;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - 6 - ((v - min) / range) * (height - 12);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg className="sparkline" width={width} height={height} aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

const VitalsPanel = ({ onCountChange }) => {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    type: 'blood_pressure',
    value: '',
    systolic: '',
    diastolic: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await patientService.getVitals();
      setVitals(data.data);
      onCountChange?.(data.data.length);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vitals.');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    const payload = { type: form.type, notes: form.notes };
    if (form.type === 'blood_pressure') {
      payload.systolic = form.systolic;
      payload.diastolic = form.diastolic;
    } else {
      payload.value = form.value;
    }
    try {
      await patientService.addVital(payload);
      setForm({ type: form.type, value: '', systolic: '', diastolic: '', notes: '' });
      setSaved(true);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save vital.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await patientService.deleteVital(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete vital.');
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  const numericByType = {};
  vitals.slice().reverse().forEach((v) => {
    if (v.type === 'blood_pressure') return;
    if (!numericByType[v.type]) numericByType[v.type] = [];
    if (typeof v.value === 'number') numericByType[v.type].push(v.value);
  });

  const recent = vitals.slice(0, 8);

  return (
    <div className="card">
      <h3>Vitals Log</h3>
      <p className="muted">Track readings over time to build a health picture for you and your doctor.</p>

      <form className="grid-2" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="vital-type">Type</label>
          <select
            id="vital-type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            {VITAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        {form.type === 'blood_pressure' ? (
          <>
            <div className="form-group">
              <label htmlFor="vital-sys">Systolic (mmHg)</label>
              <input
                id="vital-sys"
                type="number"
                required
                value={form.systolic}
                onChange={(e) => setForm((f) => ({ ...f, systolic: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="vital-dia">Diastolic (mmHg)</label>
              <input
                id="vital-dia"
                type="number"
                required
                value={form.diastolic}
                onChange={(e) => setForm((f) => ({ ...f, diastolic: e.target.value }))}
              />
            </div>
          </>
        ) : (
          <div className="form-group">
            <label htmlFor="vital-value">Value</label>
            <input
              id="vital-value"
              type="number"
              required
              placeholder={
                form.type === 'temperature'
                  ? 'e.g. 98.6'
                  : form.type === 'heart_rate'
                    ? 'e.g. 72'
                    : form.type === 'weight'
                      ? 'e.g. 65'
                      : 'e.g. 110'
              }
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="vital-notes">Notes (optional)</label>
          <input
            id="vital-notes"
            value={form.notes}
            placeholder="e.g. after breakfast"
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <div className="form-group form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Add reading'}
          </button>
        </div>
      </form>
      {saved && <div className="alert alert-success">Reading saved.</div>}

      {Object.keys(numericByType).length > 0 && (
        <div className="sparkline-grid">
          {Object.entries(numericByType).map(([type, values]) => (
            <div key={type} className="sparkline-card">
              <span className="muted">{type.replace(/_/g, ' ')} trend</span>
              <Sparkline values={values} />
            </div>
          ))}
        </div>
      )}

      {recent.length === 0 ? (
        <EmptyState title="No readings yet" hint="Add your first reading above." />
      ) : (
        <ul className="plain-list">
          {recent.map((v) => (
            <li key={v._id}>
              <span className="badge badge-outline">{v.type.replace(/_/g, ' ')}</span>
              <span className="vital-value">
                {v.type === 'blood_pressure' ? v.value : typeof v.value === 'number' ? v.value : v.systolic}/{v.diastolic}
                {v.unit ? ` ${v.unit}` : ''}
              </span>
              <span className="muted">{formatDate(v.recordedAt)}</span>
              {v.notes && <span className="muted vital-notes">· {v.notes}</span>}
              <button
                type="button"
                className="btn btn-link btn-sm"
                onClick={() => remove(v._id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const TimelinePanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: result } = await patientService.getTimeline();
      setData(result.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load timeline.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  const { entries = [], counts = {} } = data || {};

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Your health timeline is empty"
        hint="Run a symptom analysis, log a vital or receive a prescription and it will appear here."
      />
    );
  }

  return (
    <div className="card">
      <h3>Symptom & Health Timeline</h3>
      <div className="timeline-counts">
        <span>{counts.symptoms} analyses</span>
        <span>{counts.vitals} vitals</span>
        <span>{counts.prescriptions} prescriptions</span>
      </div>
      <ul className="timeline">
        {entries.map((entry) => (
          <li key={entry.id} className="timeline-item">
            <TimelineDot type={entry.type} />
            <div className="timeline-body">
              <div className="timeline-head">
                <strong>{entry.title}</strong>
                <span className="muted">{formatDate(entry.date)}</span>
              </div>
              <p className="muted">
                {entry.type === 'vital' && `${entry.meta.value}${entry.meta.unit ? ` ${entry.meta.unit}` : ''}`}
                {entry.type === 'symptom' &&
                  `${entry.meta.severity} · ${entry.meta.urgency} · ${entry.meta.recommendedSpecialty}`}
                {entry.type === 'prescription' &&
                  `${entry.meta.doctor || 'Doctor'} · ${entry.meta.medicineCount} medicines`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const HealthProfileSection = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [vitalCount, setVitalCount] = useState(0);

  const formToState = (p) => ({
    dob: p?.dob ? p.dob.slice(0, 10) : '',
    gender: p?.gender || 'prefer not to say',
    bloodGroup: p?.bloodGroup || '',
    heightCm: p?.heightCm ?? '',
    weightKg: p?.weightKg ?? '',
    allergies: p?.allergies || [],
    chronicConditions: p?.chronicConditions || [],
    currentMedications: p?.currentMedications || [],
    emergencyName: p?.emergencyContact?.name || '',
    emergencyPhone: p?.emergencyContact?.phone || '',
    emergencyRelation: p?.emergencyContact?.relation || '',
  });

  const [form, setForm] = useState(formToState(null));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await patientService.getProfile();
      setProfile(data.data);
      setForm(formToState(data.data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setTag = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await patientService.updateProfile({
        dob: form.dob || null,
        gender: form.gender,
        bloodGroup: form.bloodGroup || null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        allergies: form.allergies,
        chronicConditions: form.chronicConditions,
        currentMedications: form.currentMedications,
        emergencyContact: {
          name: form.emergencyName,
          phone: form.emergencyPhone,
          relation: form.emergencyRelation,
        },
      });
      setSaved(true);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h2>Health Profile</h2>
      <p className="muted section-intro">
        Your personal medical profile. Only you and doctors you consult can see this information.
      </p>
      {error && <ErrorMessage message={error} onRetry={load} />}
      {saved && <div className="alert alert-success">Profile saved.</div>}
      {profile && (
        <p className="muted">
          Profile on file · last updated {formatDate(profile.updatedAt || profile.createdAt)}
        </p>
      )}

      <form className="card" onSubmit={save}>
        <h3>Basic information</h3>
        <div className="grid-2">
          <div className="form-group">
            <label htmlFor="hp-dob">Date of birth</label>
            <input
              id="hp-dob"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.dob}
              onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="hp-gender">Gender</label>
            <select
              id="hp-gender"
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="hp-blood">Blood group</label>
            <select
              id="hp-blood"
              value={form.bloodGroup}
              onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}
            >
              <option value="">Not specified</option>
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="hp-height">Height (cm)</label>
            <input
              id="hp-height"
              type="number"
              placeholder="e.g. 170"
              value={form.heightCm}
              onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="hp-weight">Weight (kg)</label>
            <input
              id="hp-weight"
              type="number"
              placeholder="e.g. 65"
              value={form.weightKg}
              onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
            />
          </div>
        </div>

        <h3 className="section-gap">Allergies, conditions & medications</h3>
        <div className="grid-2">
          <SimpleTags label="Allergies" value={form.allergies} onChange={setTag('allergies')} />
          <SimpleTags
            label="Chronic conditions"
            value={form.chronicConditions}
            onChange={setTag('chronicConditions')}
          />
          <SimpleTags
            label="Current medications"
            value={form.currentMedications}
            onChange={setTag('currentMedications')}
          />
        </div>

        <h3 className="section-gap">Emergency contact</h3>
        <div className="grid-2">
          <div className="form-group">
            <label htmlFor="hp-ec-name">Name</label>
            <input
              id="hp-ec-name"
              value={form.emergencyName}
              onChange={(e) => setForm((f) => ({ ...f, emergencyName: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="hp-ec-phone">Phone</label>
            <input
              id="hp-ec-phone"
              value={form.emergencyPhone}
              onChange={(e) => setForm((f) => ({ ...f, emergencyPhone: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="hp-ec-relation">Relation</label>
            <input
              id="hp-ec-relation"
              placeholder="e.g. spouse"
              value={form.emergencyRelation}
              onChange={(e) => setForm((f) => ({ ...f, emergencyRelation: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <div className="section-gap">
        <VitalsPanel onCountChange={setVitalCount} />
      </div>
      <div className="section-gap">
        <TimelinePanel key={vitalCount} />
      </div>
    </div>
  );
};

const SimpleTags = ({ label, value, onChange }) => {
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
    <div className="form-group">
      <label>{label}</label>
      <div className="tag-input">
        <input
          value={draft}
          placeholder={`Add ${label.toLowerCase()}…`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
        <button type="button" className="btn btn-sm btn-outline" onClick={add}>
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

export default HealthProfileSection;