import { useState } from 'react';
import api from '../services/api';

const UrgencyWarning = ({ result }) => {
  const isEmergency = result.urgencyLevel === 'emergency';
  const isHigh = result.urgencyLevel === 'high';

  const [services, setServices] = useState([]);
  const [showServices, setShowServices] = useState(false);
  const [servicesError, setServicesError] = useState('');

  if (!isEmergency && !isHigh) {
    return null;
  }

  const loadServices = async () => {
    setServicesError('');
    try {
      const { data } = await api.get('/sponsored-services', {
        params: { category: 'emergency' },
      });
      setServices(data.data);
    } catch (err) {
      setServicesError(err.response?.data?.message || 'Failed to load emergency services.');
    }
    setShowServices(true);
  };

  return (
    <div className={`urgency-panel ${isEmergency ? 'urgency-emergency' : 'urgency-high'}`}>
      <h3>{isEmergency ? 'Possible Medical Emergency' : 'Prompt Medical Attention Needed'}</h3>
      <p className="urgency-message">{result.message}</p>
      <p className="urgency-advice">
        {isEmergency
          ? 'Seek immediate professional medical attention now. Do not wait.'
          : 'Consult a doctor as soon as possible.'}
      </p>
      <p className="urgency-note">
        Temporary self-care guidance is intentionally not shown for this case, as it must
        not replace professional medical care.
      </p>
      {!showServices && (
        <button type="button" className="btn btn-outline" onClick={loadServices}>
          Find emergency services near you
        </button>
      )}
      {showServices && servicesError && (
        <p className="muted">Could not load emergency services. Call your local emergency number instead.</p>
      )}
      {showServices && !servicesError && (
        <div className="emergency-services">
          {services.length === 0 ? (
            <p className="muted">
              No emergency services listed in the directory yet. Call your local emergency
              number instead.
            </p>
          ) : (
            services.map((service) => (
              <div className="card emergency-service" key={service._id}>
                <span className="service-tags">
                  <strong>{service.name}</strong>
                  {service.isSponsored && (
                    <span className="service-tag service-tag-sponsored">
                      Sponsored{service.sponsor ? ` · ${service.sponsor}` : ''}
                    </span>
                  )}
                </span>
                {service.contact?.phone && <span>{service.contact.phone}</span>}
                {service.contact?.website && (
                  <a href={service.contact.website} target="_blank" rel="noreferrer">
                    Website
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UrgencyWarning;