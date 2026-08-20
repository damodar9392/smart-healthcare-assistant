import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import { doctorService } from '../../services/doctorService';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const EMPTY_FORM = {
  dayOfWeek: '1',
  startTime: '09:00',
  endTime: '17:00',
  isAvailable: true,
};

const AvailabilitySection = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await doctorService.getAvailability();
      setSlots(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load availability.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const addSlot = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await doctorService.addAvailability({ ...form, dayOfWeek: Number(form.dayOfWeek) });
      setMessage('Working hours added.');
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add slot.');
    }
  };

  const openEdit = (slot) => {
    setError('');
    setEditingId(slot._id);
    setEditForm({
      dayOfWeek: String(slot.dayOfWeek),
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: slot.isAvailable,
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusyId(editingId);
    try {
      await doctorService.updateAvailability(editingId, {
        ...editForm,
        dayOfWeek: Number(editForm.dayOfWeek),
      });
      setMessage('Working hours updated.');
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update slot.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleAvailability = async (slot) => {
    setError('');
    setMessage('');
    setBusyId(slot._id);
    try {
      await doctorService.updateAvailability(slot._id, { isAvailable: !slot.isAvailable });
      setMessage(`Slot marked ${slot.isAvailable ? 'unavailable' : 'available'}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update slot.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteSlot = async (slot) => {
    setError('');
    if (!window.confirm('Delete this slot?')) return;
    setBusyId(slot._id);
    try {
      await doctorService.deleteAvailability(slot._id);
      setMessage('Slot deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete slot.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2>Manage Availability</h2>
      <p className="muted section-intro">
        Add your working hours. Patients can book 30-minute slots inside them.
      </p>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <ErrorMessage message={error} />}

      <div className="card form-card">
        <h3>Add working hours</h3>
        <form onSubmit={addSlot}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dayOfWeek">Day</label>
              <select
                id="dayOfWeek"
                name="dayOfWeek"
                value={form.dayOfWeek}
                onChange={handleChange}
              >
                {DAY_NAMES.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="startTime">Start</label>
              <input
                id="startTime"
                name="startTime"
                type="time"
                value={form.startTime}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="endTime">End</label>
              <input
                id="endTime"
                name="endTime"
                type="time"
                value={form.endTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="isAvailable"
              checked={form.isAvailable}
              onChange={handleChange}
            />
            Available for bookings
          </label>
          <button type="submit" className="btn btn-primary">
            Add Slot
          </button>
        </form>
      </div>

      {loading ? (
        <Loading />
      ) : slots.length === 0 ? (
        <EmptyState title="No working hours yet" hint="Add your first slot above." />
      ) : (
        <div className="card-list">
          {slots.map((slot) => (
            <div className="card" key={slot._id}>
              {editingId === slot._id ? (
                <form className="availability-edit" onSubmit={saveEdit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Day</label>
                      <select
                        name="dayOfWeek"
                        value={editForm.dayOfWeek}
                        onChange={(e) =>
                          setEditForm({ ...editForm, dayOfWeek: e.target.value })
                        }
                      >
                        {DAY_NAMES.map((day, index) => (
                          <option key={day} value={index}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Start</label>
                      <input
                        type="time"
                        name="startTime"
                        value={editForm.startTime}
                        onChange={(e) =>
                          setEditForm({ ...editForm, startTime: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End</label>
                      <input
                        type="time"
                        name="endTime"
                        value={editForm.endTime}
                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="card-actions">
                    <button type="submit" className="btn btn-sm btn-primary" disabled={busyId}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setEditingId(null)}
                    >
                      Close
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="appointment-card-head">
                    <div>
                      <h3>{DAY_NAMES[slot.dayOfWeek]}</h3>
                      <p>
                        {slot.startTime} - {slot.endTime}
                      </p>
                    </div>
                    <span className={`badge ${slot.isAvailable ? 'badge-confirmed' : 'badge-cancelled'}`}>
                      {slot.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => openEdit(slot)}
                      disabled={busyId === slot._id}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => toggleAvailability(slot)}
                      disabled={busyId === slot._id}
                    >
                      {slot.isAvailable ? 'Mark unavailable' : 'Mark available'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteSlot(slot)}
                      disabled={busyId === slot._id}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailabilitySection;