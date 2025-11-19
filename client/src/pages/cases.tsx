import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Users, MoreHorizontal, Trash2, FileText, UserCheck } from "lucide-react";
import { Case, Assessment } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CaseCreationDialog } from "@/components/case/case-creation-dialog";
import { CaseAssignmentDialog } from "@/components/case/case-assignment-dialog";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";

export default function Cases() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [unassigningCaseId, setUnassigningCaseId] = useState<string | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: cases, isLoading } = useQuery({
    queryKey: ["/api/cases"],
  });

  const { data: assessments } = useQuery({
    queryKey: ["/api/assessments"],
  });

  // Fetch team members to display assigned member names
  const { data: teamMembers } = useQuery({
    queryKey: ["/api/admin/team-members"],
    enabled: user?.role === "admin",
  });

  const createCaseMutation = useMutation({
    mutationFn: async (clientName: string) => {
      const response = await apiRequest("POST", "/api/cases", { 
        clientName, 
        status: "active" 
      });
      return response.json();
    },
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Case created",
        description: `New case created for ${newCase.clientName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredCases = (cases as Case[] || []).filter(caseRecord =>
    caseRecord.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAssessmentCount = (caseId: string) => {
    return (assessments as Assessment[] || []).filter(a => a.caseId === caseId).length;
  };

  const handleCreateCase = () => {
    setShowCreateDialog(true);
  };

  const handleAssignCase = (caseData: Case) => {
    setSelectedCase(caseData);
    setShowAssignmentDialog(true);
  };

  const unassignCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const response = await apiRequest("PATCH", `/api/cases/${caseId}/unassign`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({
        title: "Case unassigned successfully",
        description: "The case has been removed from team member assignment.",
      });
      setUnassigningCaseId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unassign case",
        description: error.message,
        variant: "destructive",
      });
      setUnassigningCaseId(null);
    },
  });

  const deleteCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const response = await apiRequest("DELETE", `/api/cases/${caseId}`, {});
      if (response.status === 204) {
        return null;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({
        title: "Case deleted successfully",
        description: "The case and all related assessments have been permanently deleted.",
      });
      setDeletingCaseId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete case",
        description: error.message,
        variant: "destructive",
      });
      setDeletingCaseId(null);
    },
  });

  const handleUnassignCase = (caseId: string) => {
    setUnassigningCaseId(caseId);
    unassignCaseMutation.mutate(caseId);
  };

  const handleDeleteCase = (caseId: string) => {
    setDeletingCaseId(caseId);
    deleteCaseMutation.mutate(caseId);
  };

  const getAssignedMemberName = (assignedToId: string | null) => {
    if (!assignedToId) return null;
    const member = (teamMembers as any[] || []).find((m: any) => m.id === assignedToId);
    return member?.firstName || member?.email || 'Unknown';
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 md:pl-16 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Cases</h1>
            <p className="text-sm text-muted-foreground">Manage client cases and assessments</p>
          </div>
          {user && (
            <Button onClick={handleCreateCase} data-testid="button-new-case" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Case
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 space-y-6">
        
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-cases"
          />
        </div>

        {/* Cases Table */}
        {isLoading ? (
          <div className="bg-card rounded-lg border">
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-3">
                <div className="bg-muted h-6 w-full rounded"></div>
                <div className="bg-muted h-6 w-full rounded"></div>
                <div className="bg-muted h-6 w-full rounded"></div>
              </div>
            </div>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="bg-card rounded-lg border">
            <div className="text-center py-12 px-4">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? "No cases found" : "No cases yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms." 
                  : "Create your first client case to get started."
                }
              </p>
              {!searchTerm && user && (
                <Button onClick={handleCreateCase} data-testid="button-create-first-case">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Case
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px] sm:w-[250px]">Client Name</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  {user?.role === "admin" && (
                    <TableHead className="hidden lg:table-cell min-w-[150px]">Assigned To</TableHead>
                  )}
                  <TableHead className="hidden sm:table-cell min-w-[100px]">Created</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[120px]">Assessments</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((caseRecord) => {
                  const assessmentCount = getAssessmentCount(caseRecord.id);
                  const assignedMemberName = getAssignedMemberName(caseRecord.assignedTo);
                  
                  return (
                    <TableRow 
                      key={caseRecord.id}
                      className="cursor-pointer"
                      onClick={() => setLocation(`/cases/${caseRecord.id}`)}
                      data-testid={`row-case-${caseRecord.id}`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span data-testid={`text-case-name-${caseRecord.id}`}>
                            {caseRecord.clientName}
                          </span>
                          {/* Mobile-only info */}
                          <div className="flex flex-wrap gap-2 md:hidden">
                            <Badge variant={caseRecord.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {caseRecord.status.charAt(0).toUpperCase() + caseRecord.status.slice(1)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {assessmentCount} assessment{assessmentCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={caseRecord.status === 'active' ? 'default' : 'secondary'}>
                          {caseRecord.status.charAt(0).toUpperCase() + caseRecord.status.slice(1)}
                        </Badge>
                      </TableCell>
                      {user?.role === "admin" && (
                        <TableCell className="hidden lg:table-cell">
                          {assignedMemberName ? (
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{assignedMemberName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {new Date(caseRecord.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {assessmentCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`button-menu-case-${caseRecord.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/cases/${caseRecord.id}`);
                            }} data-testid={`menu-view-case-${caseRecord.id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {user?.role === "admin" && (
                              <>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssignCase(caseRecord);
                                }} data-testid={`menu-assign-case-${caseRecord.id}`}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  {caseRecord.assignedTo ? "Reassign" : "Assign"}
                                </DropdownMenuItem>
                                {caseRecord.assignedTo && (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnassignCase(caseRecord.id);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                    disabled={unassigningCaseId === caseRecord.id}
                                    data-testid={`menu-unassign-case-${caseRecord.id}`}
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    {unassigningCaseId === caseRecord.id ? "Unassigning..." : "Unassign"}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-destructive focus:text-destructive"
                                      disabled={deletingCaseId === caseRecord.id}
                                      data-testid={`menu-delete-case-${caseRecord.id}`}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      {deletingCaseId === caseRecord.id ? "Deleting..." : "Delete Case"}
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Case</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the case for "{caseRecord.clientName}"? 
                                        This action cannot be undone and will permanently delete the case and all related assessments.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteCase(caseRecord.id);
                                        }}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        data-testid={`button-confirm-delete-case-${caseRecord.id}`}
                                      >
                                        Delete Case
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Dialogs */}
      {showCreateDialog && (
        <CaseCreationDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      {showAssignmentDialog && (
        <CaseAssignmentDialog
          open={showAssignmentDialog}
          onClose={() => setShowAssignmentDialog(false)}
          caseData={selectedCase}
        />
      )}
    </div>
  );
}
