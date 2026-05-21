import StaffDashboardPage from '../../../components/business/StaffDashboardPage';
import StaffDashboardGuard from '../../../components/business/StaffDashboardGuard';

export default function StaffAccountPage() {
  return (
    <StaffDashboardGuard>
      <StaffDashboardPage />
    </StaffDashboardGuard>
  );
}
