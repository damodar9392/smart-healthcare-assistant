import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AppointmentsSection from '../components/patient/AppointmentsSection';
import SearchesSection from '../components/patient/SearchesSection';
import SavedDoctorsSection from '../components/patient/SavedDoctorsSection';
import NotificationsSection from '../components/patient/NotificationsSection';
import EnquiriesSection from '../components/patient/EnquiriesSection';
import RecordsSection from '../components/patient/RecordsSection';
import InvoicesSection from '../components/patient/InvoicesSection';
import MedicationCheckerSection from '../components/patient/MedicationCheckerSection';
import HealthProfileSection from '../components/patient/HealthProfileSection';
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
        {section === 'records' && <RecordsSection />}
        {section === 'invoices' && <InvoicesSection />}
        {section === 'medication-checker' && <MedicationCheckerSection />}
        {section === 'health-profile' && <HealthProfileSection />}
        {section === 'searches' && <SearchesSection />}
        {section === 'saved-doctors' && <SavedDoctorsSection />}
        {section === 'notifications' && <NotificationsSection />}
        {section === 'enquiries' && <EnquiriesSection />}
      </main>
    </div>
  );
};

export default PatientDashboard;