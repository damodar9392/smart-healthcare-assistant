import { CATEGORY_LABELS } from '../utils/categories';

const ServiceCard = ({ service }) => (
  <div className="card service-card">
    <div className="service-tags">
      <span className="service-tag service-tag-optional">Optional</span>
      {service.isSponsored && (
        <span className="service-tag service-tag-sponsored">
          Sponsored{service.sponsor ? ` · ${service.sponsor}` : ''}
        </span>
      )}
    </div>
    <span className="badge badge-system">
      {CATEGORY_LABELS[service.category] || service.category}
    </span>
    <h3>{service.name}</h3>
    {service.description && <p className="muted">{service.description}</p>}
    {service.price > 0 && <p>Price: Rs. {service.price}</p>}
    {service.distanceKm !== undefined && (
      <p className="service-distance">{service.distanceKm} km away</p>
    )}
    <div className="service-contact">
      {service.contact?.phone && <span>📞 {service.contact.phone}</span>}
      {service.contact?.email && (
        <a href={`mailto:${service.contact.email}`}>{service.contact.email}</a>
      )}
      {service.contact?.website && (
        <a href={service.contact.website} target="_blank" rel="noreferrer">
          Website ↗
        </a>
      )}
      {!service.contact?.phone && !service.contact?.email && !service.contact?.website && (
        <span className="muted">No contact details listed</span>
      )}
    </div>
  </div>
);

export default ServiceCard;