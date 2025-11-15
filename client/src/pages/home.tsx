import { useAuth } from "@/hooks/use-auth";
import AdminDashboard from "./admin-dashboard";
import TeamMemberDashboard from "./team-member-dashboard";

export default function Home() {
  const { user } = useAuth();

  // Route to role-based dashboard
  if (user?.role === "admin") {
    return <AdminDashboard />;
  }

  // Default to team member dashboard for all other users
  return <TeamMemberDashboard />;
}