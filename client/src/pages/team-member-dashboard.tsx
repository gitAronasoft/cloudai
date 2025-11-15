import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Plus, Clock, FileText, CheckCircle, Mic, Upload } from "lucide-react";
import { Case, Assessment } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function TeamMemberDashboard() {
  const { user } = useAuth();
  
  const { data: assignedCases, isLoading: casesLoading } = useQuery({
    queryKey: ["/api/cases/assigned"],
  });

  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ["/api/assessments"],
  });

  const assignedCasesList = (assignedCases as Case[] || []);
  const recentAssessments = (assessments as Assessment[] || []).slice(0, 5);

  const totalAssigned = assignedCasesList.length;
  const activeCases = assignedCasesList.filter(c => c.status === 'active').length;
  const completedCases = assignedCasesList.filter(c => c.status === 'completed').length;
  const completedAssessments = (assessments as Assessment[] || []).filter(a => 
    a.processingStatus === 'completed'
  ).length;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 md:pl-16 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">My Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user?.firstName}! Track your assigned cases and recordings</p>
          </div>
          <Link href="/record" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" data-testid="button-new-recording">
              <Mic className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Record Audio</span>
              <span className="sm:hidden">Record</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 space-y-6 bg-muted">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Cases</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-assigned-cases">
                {casesLoading ? "..." : totalAssigned}
              </div>
              <p className="text-xs text-muted-foreground">
                Cases assigned to you
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-active-cases">
                {casesLoading ? "..." : activeCases}
              </div>
              <p className="text-xs text-muted-foreground">
                Cases requiring work
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Cases</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-completed-cases">
                {casesLoading ? "..." : completedCases}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assessments</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-assessments">
                {assessmentsLoading ? "..." : completedAssessments}
              </div>
              <p className="text-xs text-muted-foreground">
                Completed assessments
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Assigned Cases */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Assigned Cases</CardTitle>
                <Link href="/cases">
                  <Button variant="ghost" size="sm" data-testid="link-view-all-cases">
                    View all
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {casesLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                </div>
              ) : assignedCasesList.length > 0 ? (
                assignedCasesList.slice(0, 5).map((caseItem) => (
                  <div key={caseItem.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`case-item-${caseItem.id}`}>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{caseItem.clientName}</h3>
                      <p className="text-xs text-muted-foreground">{caseItem.address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={caseItem.status === 'active' ? 'default' : 'secondary'}>
                        {caseItem.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p>No cases assigned yet</p>
                  <p className="text-xs">Contact your administrator to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Assessments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Assessments</CardTitle>
                <Link href="/notes">
                  <Button variant="ghost" size="sm" data-testid="link-view-all-assessments">
                    View all
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {assessmentsLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                </div>
              ) : recentAssessments.length > 0 ? (
                recentAssessments.map((assessment) => (
                  <div key={assessment.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`assessment-item-${assessment.id}`}>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{assessment.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(assessment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={
                      assessment.processingStatus === 'completed' ? 'default' :
                      assessment.processingStatus === 'processing' ? 'secondary' :
                      'destructive'
                    }>
                      {assessment.processingStatus.charAt(0).toUpperCase() + assessment.processingStatus.slice(1)}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p>No assessments yet</p>
                  <p className="text-xs">Start by recording audio for your cases</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <p className="text-sm text-muted-foreground">Common tasks for case work</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/record">
                <Button variant="outline" className="w-full justify-start" data-testid="button-quick-record">
                  <Mic className="mr-2 h-4 w-4" />
                  Record Audio
                </Button>
              </Link>
              <Link href="/cases">
                <Button variant="outline" className="w-full justify-start" data-testid="button-quick-view-cases">
                  <FileText className="mr-2 h-4 w-4" />
                  View My Cases
                </Button>
              </Link>
              <Link href="/notes">
                <Button variant="outline" className="w-full justify-start" data-testid="button-quick-view-assessments">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  View Assessments
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}