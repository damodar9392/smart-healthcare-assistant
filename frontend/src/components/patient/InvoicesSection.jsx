import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import { patientService } from '../../services/patientService';
import { formatDate } from '../../utils/format';

const STATUS_BADGES = {
  paid: 'completed',
  pending: 'scheduled',
  refunded: 'rescheduled',
  failed: 'cancelled',
};

const InvoicesSection = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await patientService.getInvoices();
      setInvoices(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pay = async (invoice) => {
    setBusyId(invoice._id);
    setError('');
    try {
      await patientService.payInvoice(invoice._id, 'mock');
      await load();
      setReceipt(invoice._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h2>My Invoices & Payments</h2>
      <p className="muted section-intro">
        Consultation fees, payment status and refunds for your appointments.
      </p>
      {error && <ErrorMessage message={error} onRetry={load} />}

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          hint="Your consultation invoices will appear here after you book an appointment."
          action={
            <Link to="/doctors" className="btn btn-sm btn-primary">
              Find a doctor
            </Link>
          }
        />
      ) : (
        <div className="card-list">
          {invoices.map((invoice) => (
            <div className="card invoice-card" key={invoice._id}>
              <div className="appointment-card-head">
                <h3>
                  {invoice.currency} {invoice.amount}
                </h3>
                <span className={`badge badge-${STATUS_BADGES[invoice.status] || 'scheduled'}`}>
                  {invoice.status}
                </span>
              </div>
              <p className="muted">
                {invoice.doctor?.name || 'Doctor'}
                {invoice.appointment?.date
                  ? ` · ${formatDate(invoice.appointment.date)} at ${invoice.appointment.startTime}`
                  : ''}
              </p>
              {invoice.transactionId && (
                <p className="muted">Transaction: {invoice.transactionId}</p>
              )}
              <div className="card-actions">
                {invoice.status === 'pending' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={busyId === invoice._id}
                    onClick={() => pay(invoice)}
                  >
                    {busyId === invoice._id ? 'Processing…' : 'Pay now'}
                  </button>
                )}
                {(invoice.status === 'paid' || invoice.status === 'refunded') && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setReceipt(invoice)}
                  >
                    View receipt
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {receipt && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card print-area">
            <h3>SmartCare Receipt</h3>
            <p className="muted">Smart Healthcare Assistant</p>
            <hr />
            <div className="receipt-row">
              <span>Invoice</span>
              <span>{receipt._id}</span>
            </div>
            <div className="receipt-row">
              <span>Doctor</span>
              <span>{receipt.doctor?.name || '-'}</span>
            </div>
            <div className="receipt-row">
              <span>Amount</span>
              <span>
                {receipt.currency} {receipt.amount}
              </span>
            </div>
            <div className="receipt-row">
              <span>Status</span>
              <span>{receipt.status}</span>
            </div>
            {receipt.transactionId && (
              <div className="receipt-row">
                <span>Transaction</span>
                <span>{receipt.transactionId}</span>
              </div>
            )}
            <div className="card-actions no-print">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()}>
                Print
              </button>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setReceipt(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesSection;