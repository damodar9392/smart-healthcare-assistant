const SECTIONS = {
  patient: [
    { id: 'appointments', label: 'Appointments' },
    { id: 'searches', label: 'Symptom Analyses' },
    { id: 'saved-doctors', label: 'Saved Doctors' },
    { id: 'notifications', label: 'Notifications' },
  ],
  doctor: [
    { id: 'today', label: "Today's Appointments" },
    { id: 'appointments', label: 'Upcoming Appointments' },
    { id: 'availability', label: 'Manage Availability' },
    { id: 'guidance', label: 'Add Temporary Guidance' },
    { id: 'guidance-status', label: 'Submitted Guidance' },
    { id: 'profile', label: 'My Profile' },
  ],
  admin: [
    { id: 'overview', label: 'Overview' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'verify-doctors', label: 'Verify Doctors' },
    { id: 'guidance-review', label: 'Review Guidance' },
    { id: 'manage-users', label: 'Manage Users' },
    { id: 'reviews', label: 'Manage Reviews' },
    { id: 'sponsored-services', label: 'Sponsored Services' },
  ],
};

const Sidebar = ({ role, active, onSelect }) => (
  <aside className="sidebar">
    <nav className="sidebar-nav">
      {SECTIONS[role].map((section) => (
        <button
          type="button"
          key={section.id}
          className={`sidebar-item${active === section.id ? ' active' : ''}`}
          onClick={() => onSelect(section.id)}
        >
          {section.label}
        </button>
      ))}
    </nav>
  </aside>
);

export default Sidebar;