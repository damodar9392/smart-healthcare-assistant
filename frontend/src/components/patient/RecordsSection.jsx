import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import { patientService } from '../../services/patientService';
import { formatDate } from '../../utils/format';

const RecordsSection = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [printRecord, setPrintRecord] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await patientService.getPrescriptions();
      setRecords(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load medical records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading />;

  return (
    <div>
      <h2>Medical Records</h2>
      <p className="muted section-intro">
        Prescriptions issued by your doctors, available anytime. Print or share them at a pharmacy.
      </p>
      {error && <ErrorMessage message={error} onRetry={load} />}

      {records.length === 0 ? (
        <EmptyState
          title="No prescriptions yet"
          hint="After a consultation your doctor can issue a digital prescription that will appear here."
        />
      ) : (
        <div className="card-list">
          {records.map((record) => {
            const open = openId === record._id;
            return (
              <div className="card record-card" key={record._id}>
                <div className="appointment-card-head">
                  <h3>{record.diagnosis || 'Prescription'}</h3>
                  <span className="badge badge-outline">{record.medicines.length} medicines</span>
                </div>
                <p className="muted">
                  {record.doctor?.name || 'Doctor'}
                  {record.appointment?.date
                    ? ` · ${formatDate(record.appointment.date)}`
                    : ''}
                </p>
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setOpenId(open ? null : record._id)}
                  >
                    {open ? 'Hide details' : 'View prescription'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setPrintRecord(record)}
                  >
                    Print
                  </button>
                </div>

                {open && (
                  <div className="record-details">
                    {record.symptoms?.length > 0 && (
                      <p className="muted">Symptoms: {record.symptoms.join(', ')}</p>
                    )}
                    <table className="med-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.medicines.map((med, index) => (
                          <tr key={`${med.name}-${index}`}>
                            <td>{med.name}</td>
                            <td>{med.dosage || '-'}</td>
                            <td>{med.frequency || '-'}</td>
                            <td>{med.durationDays ? `${med.durationDays} day(s)` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {record.advice && <p><strong>Advice:</strong> {record.advice}</p>}
                    {record.followUpDays > 0 && (
                      <p className="muted">Follow-up in {record.followUpDays} day(s)</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {printRecord && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card print-area">
            <h3>SmartCare Prescription</h3>
            <p className="muted">
              {printRecord.doctor?.name || 'Doctor'} ·{' '}
              {printRecord.appointment?.date ? formatDate(printRecord.appointment.date) : formatDate(printRecord.issuedAt)}
            </p>
            <hr />
            <p>
              <strong>Diagnosis:</strong> {printRecord.diagnosis}
            </p>
            <table className="med-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {printRecord.medicines.map((med, index) => (
                  <tr key={`${med.name}-print-${index}`}>
                    <td>{med.name}</td>
                    <td>{med.dosage || '-'}</td>
                    <td>{med.frequency || '-'}</td>
                    <td>{med.durationDays ? `${med.durationDays} day(s)` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {printRecord.advice && <p><strong>Advice:</strong> {printRecord.advice}</p>}
            <p className="muted">
              This is a digitally generated prescription from a verified doctor on SmartCare.
            </p>
            <div className="card-actions no-print">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()}>
                Print
              </button>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setPrintRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsSection;