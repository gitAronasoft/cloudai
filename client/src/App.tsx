import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, AdminRoute } from "@/lib/protected-route";
import { MainLayout } from "@/components/layout/main-layout";
import { SidebarProvider } from "@/contexts/sidebar-context";
import Home from "@/pages/home";
import Cases from "@/pages/cases";
import CaseDetail from "@/pages/case-detail";
import AssessmentDetail from "@/pages/assessment-detail";
import Templates from "@/pages/templates";
import Reports from "@/pages/reports";
import Support from "@/pages/support";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import TeamManagement from "@/pages/team-management";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

// SPA-safe redirect component for legacy routes
function LegacyRedirect() {
  const [, setLocation] = useLocation();
  setLocation('/cases');
  return null;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/accept-invitation" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* Protected routes */}
      <ProtectedRoute path="/" component={() => <MainLayout><Home /></MainLayout>} />
      <ProtectedRoute path="/cases" component={() => <MainLayout><Cases /></MainLayout>} />
      <ProtectedRoute path="/cases/:id" component={() => <MainLayout><CaseDetail /></MainLayout>} />
      <ProtectedRoute path="/assessments/:id" component={() => <MainLayout><AssessmentDetail /></MainLayout>} />
      <ProtectedRoute path="/templates" component={() => <MainLayout><Templates /></MainLayout>} />
      <ProtectedRoute path="/reports" component={() => <MainLayout><Reports /></MainLayout>} />
      <ProtectedRoute path="/support" component={() => <MainLayout><Support /></MainLayout>} />
      <ProtectedRoute path="/settings" component={() => <MainLayout><Settings /></MainLayout>} />
      
      {/* Legacy redirect routes */}
      <Route path="/notes" component={LegacyRedirect} />
      <Route path="/record" component={LegacyRedirect} />
      
      {/* Admin-only routes */}
      <AdminRoute path="/team-management" component={() => <MainLayout><TeamManagement /></MainLayout>} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
