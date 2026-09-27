import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../EmptyState';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import { patientService } from '../../services/patientService';
import { formatDate } from '../../utils/format';

const CATEGORIES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'medical', label: 'Medical' },
  { value: 'technical', label: 'Technical' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Other' },
];

const EnquiriesSection = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('other');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await patientService.getEnquiries();
      setEnquiries(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load enquiries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setFormError('Subject and message are required.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setSuccess('');
    try {
      const { data } = await patientService.createEnquiry({
        subject: subject.trim(),
        category,
        message: message.trim(),
      });
      setEnquiries((prev) => [data.data, ...prev]);
      setSuccess(
        'Ticket created. A confirmation email has been sent to your inbox.'
      );
      setSubject('');
      setCategory('other');
      setMessage('');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="section-head">
        <h2>Enquiries</h2>
        <p className="section-intro">
          Raise a question or issue about appointments, medical guidance or the
          platform. Our team responds by email and in-app notification.
        </p>
      </div>

      <div className="card form-card">
        <h4>New enquiry</h4>
        {success && <div className="alert alert-success">{success}</div>}
        {formError && <div className="alert alert-error">{formError}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="enquiry-category">Category</label>
              <select
                id="enquiry-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="enquiry-subject">Subject</label>
              <input
                id="enquiry-subject"
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary (max 200 characters)"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="enquiry-message">Message</label>
            <textarea
              id="enquiry-message"
              rows={5}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your enquiry (max 2000 characters)"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Enquiry'}
          </button>
        </form>
      </div>

      <h3 className="section-gap">My tickets</h3>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : enquiries.length === 0 ? (
        <EmptyState
          title="No enquiries yet"
          hint="Tickets you submit will appear here with their status."
        />
      ) : (
        <div className="notification-list">
          {enquiries.map((enquiry) => (
            <div className="notification-item" key={enquiry._id}>
              <div className="notification-head">
                <span className={`badge badge-${enquiry.status}`}>
                  {enquiry.status}
                </span>
                <span className="badge badge-system">{enquiry.category}</span>
                <span className="muted">{formatDate(enquiry.createdAt)}</span>
              </div>
              <strong>{enquiry.subject}</strong>
              <p className="muted">{enquiry.message}</p>
              <span className="muted">Reference: {enquiry._id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnquiriesSection;