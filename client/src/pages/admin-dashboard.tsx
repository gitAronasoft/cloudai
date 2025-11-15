import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Plus, Users, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Case, User } from "@shared/schema";

export default function AdminDashboard() {
  const { data: cases, isLoading: casesLoading } = useQuery({
    queryKey: ["/api/cases"],
  });

  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery({
    queryKey: ["/api/admin/team-members-only"],
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/admin/assignments"],
  });

  const recentCases = (cases as Case[] || []).slice(0, 5);
  const recentTeamMembers = (teamMembers as User[] || []).slice(0, 5);
  const allAssignments = (assignments as any[] || []);

  const totalCases = (cases as Case[] || []).length;
  const activeCases = (cases as Case[] || []).filter(c => c.status === 'active').length;
  const completedCases = (cases as Case[] || []).filter(c => c.status === 'completed').length;
  const totalTeamMembers = (teamMembers as User[] || []).length;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 md:pl-16 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage cases, team members, and assignments</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Link href="/team-management" className="flex-1 sm:flex-initial">
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-manage-team">
                <Users className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Manage Team</span>
                <span className="sm:hidden">Team</span>
              </Button>
            </Link>
            <Link href="/cases" className="flex-1 sm:flex-initial">
              <Button className="w-full sm:w-auto" data-testid="button-create-case">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Create Case</span>
                <span className="sm:hidden">New Case</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 space-y-6 bg-muted">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-cases">
                {casesLoading ? "..." : totalCases}
              </div>
              <p className="text-xs text-muted-foreground">
                All cases in system
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
                Cases in progress
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
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-team-members">
                {teamMembersLoading ? "..." : totalTeamMembers}
              </div>
              <p className="text-xs text-muted-foreground">
                Active users
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Cases */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Cases</CardTitle>
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
              ) : recentCases.length > 0 ? (
                recentCases.map((caseItem) => (
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
                  <p>No cases yet</p>
                  <Link href="/cases">
                    <Button variant="outline" size="sm" className="mt-2">
                      Create your first case
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Users</CardTitle>
                <Link href="/team-management">
                  <Button variant="ghost" size="sm" data-testid="link-manage-team">
                    Manage
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamMembersLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                </div>
              ) : recentTeamMembers.length > 0 ? (
                recentTeamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`team-member-${member.id}`}>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{member.firstName} {member.lastName}</h3>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant="outline">
                      {member.role}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p>No users yet</p>
                  <Link href="/team-management">
                    <Button variant="outline" size="sm" className="mt-2">
                      Invite users
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <p className="text-sm text-muted-foreground">Common administrative tasks</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/cases">
                <Button variant="outline" className="w-full justify-start" data-testid="button-quick-create-case">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Case
                </Button>
              </Link>
              <Link href="/team-management">
                <Button variant="outline" className="w-full justify-start" data-testid="button-quick-invite-member">
                  <Users className="mr-2 h-4 w-4" />
                  Invite Team Member
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" className="w-full justify-start" data-testid="button-quick-view-reports">
                  <FileText className="mr-2 h-4 w-4" />
                  View Reports
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}