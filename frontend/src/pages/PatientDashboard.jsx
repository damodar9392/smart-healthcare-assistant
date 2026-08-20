import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AppointmentsSection from '../components/patient/AppointmentsSection';
import SearchesSection from '../components/patient/SearchesSection';
import SavedDoctorsSection from '../components/patient/SavedDoctorsSection';
import NotificationsSection from '../components/patient/NotificationsSection';
import { useAuth } from '../hooks/useAuth';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [section, setSection] = useState('appointments');

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="dashboard-layout">
      <Sidebar role="patient" active={section} onSelect={setSection} />
      <main className="dashboard-content">
        <section className="welcome-hero">
          <div>
            <h1>Welcome back, {firstName}</h1>
            <p className="muted">
              Manage your appointments, symptom analyses and saved doctors from one place.
            </p>
          </div>
          <div className="welcome-actions">
            <Link to="/doctors" className="btn btn-primary">
              Book an appointment
            </Link>
            <Link to="/symptoms" className="btn btn-outline">
              Check symptoms
            </Link>
          </div>
        </section>

        {section === 'appointments' && <AppointmentsSection />}
        {section === 'searches' && <SearchesSection />}
        {section === 'saved-doctors' && <SavedDoctorsSection />}
        {section === 'notifications' && <NotificationsSection />}
      </main>
    </div>
  );
};

export default PatientDashboard;