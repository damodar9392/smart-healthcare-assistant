import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import { doctorService } from '../../services/doctorService';
import { formatDate } from '../../utils/format';

const emptyMedicine = () => ({ name: '', dosage: '', frequency: '', durationDays: '', notes: '' });

const PrescriptionsSection = () => {
  const [appointments, setAppointments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({
    diagnosis: '',
    advice: '',
    followUpDays: '',
    medicines: [emptyMedicine()],
  });
  const [loading, setLoading] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await doctorService.getAppointments();
      const eligible = data.data.filter((a) =>
        ['scheduled', 'rescheduled', 'completed'].includes(a.status)
      );
      setAppointments(eligible);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({ diagnosis: '', advice: '', followUpDays: '', medicines: [emptyMedicine()] });
    setExisting(null);
  };

  const selectAppointment = async (id) => {
    setSelectedId(id);
    setMessage('');
    setError('');
    resetForm();
    if (!id) return;
    setLoadingRecord(true);
    try {
      const { data } = await doctorService.getPrescriptionForAppointment(id);
      if (data.data) {
        setExisting(data.data);
        setForm({
          diagnosis: data.data.diagnosis || '',
          advice: data.data.advice || '',
          followUpDays: data.data.followUpDays || '',
          medicines:
            data.data.medicines?.length > 0
              ? data.data.medicines.map((m) => ({
                  name: m.name || '',
                  dosage: m.dosage || '',
                  frequency: m.frequency || '',
                  durationDays: m.durationDays || '',
                  notes: m.notes || '',
                }))
              : [emptyMedicine()],
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load prescription.');
    } finally {
      setLoadingRecord(false);
    }
  };

  const updateMedicine = (index, key, value) => {
    setForm((f) => {
      const medicines = f.medicines.map((m, i) => (i === index ? { ...m, [key]: value } : m));
      return { ...f, medicines };
    });
  };

  const addMedicine = () =>
    setForm((f) => ({ ...f, medicines: [...f.medicines, emptyMedicine()] }));

  const removeMedicine = (index) =>
    setForm((f) => ({
      ...f,
      medicines: f.medicines.filter((_, i) => i !== index),
    }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const medicines = form.medicines
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        durationDays: m.durationDays ? Number(m.durationDays) : undefined,
        notes: m.notes.trim(),
      }));

    if (medicines.length === 0) {
      setError('Add at least one medicine with a name.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        diagnosis: form.diagnosis.trim(),
        advice: form.advice.trim(),
        followUpDays: form.followUpDays ? Number(form.followUpDays) : 0,
        medicines,
      };
      if (existing) {
        await doctorService.updatePrescription(existing._id, payload);
        setMessage('Prescription updated.');
      } else {
        await doctorService.createPrescription({ ...payload, appointment: selectedId });
        setMessage('Prescription issued to the patient.');
        await selectAppointment(selectedId);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save prescription.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;

  const selected = appointments.find((a) => a._id === selectedId);
  const canVideo = selected && ['scheduled', 'rescheduled'].includes(selected.status);

  return (
    <div>
      <h2>Prescriptions</h2>
      <p className="muted section-intro">
        Issue a digital prescription for a patient you have consulted.
      </p>
      {error && <ErrorMessage message={error} onRetry={load} />}
      {message && <div className="alert alert-success">{message}</div>}

      {appointments.length === 0 ? (
        <EmptyState
          title="No appointments available"
          hint="Prescriptions can be written for scheduled or completed appointments."
        />
      ) : (
        <div className="card">
          <div className="form-group">
            <label htmlFor="rx-appointment">Select appointment</label>
            <select
              id="rx-appointment"
              value={selectedId}
              onChange={(e) => selectAppointment(e.target.value)}
            >
              <option value="">Choose an appointment…</option>
              {appointments.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.patient?.name || 'Patient'} · {formatDate(a.date)} {a.startTime} ({a.status})
                </option>
              ))}
            </select>
          </div>

          {canVideo && (
            <div className="card-actions">
              <a className="btn btn-sm btn-outline" href={`/video/${selected._id}`}>
                Join video consultation
              </a>
            </div>
          )}

          {loadingRecord ? (
            <Loading />
          ) : selectedId ? (
            <form onSubmit={save}>
              <div className="form-group">
                <label htmlFor="rx-diagnosis">Diagnosis</label>
                <textarea
                  id="rx-diagnosis"
                  rows={2}
                  required
                  value={form.diagnosis}
                  onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
                />
              </div>

              <label className="section-gap">Medicines</label>
              <div className="med-rows">
                {form.medicines.map((med, index) => (
                  <div className="med-row" key={`med-${index}`}>
                    <input
                      placeholder="Name"
                      value={med.name}
                      required
                      onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                    />
                    <input
                      placeholder="Dosage"
                      value={med.dosage}
                      onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                    />
                    <input
                      placeholder="Frequency"
                      value={med.frequency}
                      onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                    />
                    <input
                      type="number"
                      min="1"
                      max="365"
                      placeholder="Days"
                      value={med.durationDays}
                      onChange={(e) => updateMedicine(index, 'durationDays', e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => removeMedicine(index)}
                      disabled={form.medicines.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-sm btn-outline" onClick={addMedicine}>
                + Add medicine
              </button>

              <div className="form-group section-gap">
                <label htmlFor="rx-advice">Advice</label>
                <textarea
                  id="rx-advice"
                  rows={3}
                  value={form.advice}
                  onChange={(e) => setForm((f) => ({ ...f, advice: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="rx-followup">Follow-up after (days)</label>
                <input
                  id="rx-followup"
                  type="number"
                  min="0"
                  max="365"
                  value={form.followUpDays}
                  onChange={(e) => setForm((f) => ({ ...f, followUpDays: e.target.value }))}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : existing ? 'Update prescription' : 'Issue prescription'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default PrescriptionsSection;