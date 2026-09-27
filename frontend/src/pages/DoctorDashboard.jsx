import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TodaySection from '../components/doctor/TodaySection';
import UpcomingSection from '../components/doctor/UpcomingSection';
import AvailabilitySection from '../components/doctor/AvailabilitySection';
import GuidanceFormSection from '../components/doctor/GuidanceFormSection';
import GuidanceStatusSection from '../components/doctor/GuidanceStatusSection';
import ProfileSection from '../components/doctor/ProfileSection';
import PrescriptionsSection from '../components/doctor/PrescriptionsSection';

const DoctorDashboard = () => {
  const [section, setSection] = useState('today');

  return (
    <div className="dashboard-layout">
      <Sidebar role="doctor" active={section} onSelect={setSection} />
      <main className="dashboard-content">
        {section === 'today' && <TodaySection />}
        {section === 'appointments' && <UpcomingSection />}
        {section === 'prescriptions' && <PrescriptionsSection />}
        {section === 'availability' && <AvailabilitySection />}
        {section === 'guidance' && <GuidanceFormSection />}
        {section === 'guidance-status' && <GuidanceStatusSection />}
        {section === 'profile' && <ProfileSection />}
      </main>
    </div>
  );
};

export default DoctorDashboard;