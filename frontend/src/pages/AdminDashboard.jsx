import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import StatsSection from '../components/admin/StatsSection';
import AppointmentsSection from '../components/admin/AppointmentsSection';
import VerifyDoctorsSection from '../components/admin/VerifyDoctorsSection';
import GuidanceReviewSection from '../components/admin/GuidanceReviewSection';
import UsersSection from '../components/admin/UsersSection';
import ReviewsSection from '../components/admin/ReviewsSection';
import SponsoredServicesSection from '../components/admin/SponsoredServicesSection';
import AnalyticsSection from '../components/admin/AnalyticsSection';

const AdminDashboard = () => {
  const [section, setSection] = useState('overview');

  return (
    <div className="dashboard-layout">
      <Sidebar role="admin" active={section} onSelect={setSection} />
      <main className="dashboard-content">
        {section === 'overview' && <StatsSection />}
        {section === 'analytics' && <AnalyticsSection />}
        {section === 'appointments' && <AppointmentsSection />}
        {section === 'verify-doctors' && <VerifyDoctorsSection />}
        {section === 'guidance-review' && <GuidanceReviewSection />}
        {section === 'manage-users' && <UsersSection />}
        {section === 'reviews' && <ReviewsSection />}
        {section === 'sponsored-services' && <SponsoredServicesSection />}
      </main>
    </div>
  );
};

export default AdminDashboard;