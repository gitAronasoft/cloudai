import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  MapPin, 
  User, 
  Mic,
  UserCheck,
  Clock,
  MoreHorizontal,
  Trash2
} from "lucide-react";
import { Case, Assessment, User as UserType } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { CaseAssignmentDialog } from "@/components/case/case-assignment-dialog";
import { RecordingPanel } from "@/components/recording/recording-panel";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showRecordingPanel, setShowRecordingPanel] = useState(false);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null);

  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: ["/api/cases", id],
  });

  // Fetch assessments for this case with smart refresh
  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ["/api/cases", id, "assessments"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/cases/${id}/assessments`);
      return response.json();
    },
    refetchInterval: (data) => {
      // Check if any assessment is processing
      const hasProcessing = Array.isArray(data) && data.some((a: any) => a.processingStatus === 'processing');
      // Only poll if there's active processing, otherwise stop
      return hasProcessing ? 5000 : false; // 5 seconds instead of 2
    },
  });

  // Fetch recordings for this case with conditional refresh
  const { data: recordings } = useQuery({
    queryKey: ["/api/cases", id, "recordings"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/cases/${id}/recordings`);
      return response.json();
    },
    refetchInterval: (data) => {
      // Only poll if there are recordings being processed
      const hasProcessing = Array.isArray(data) && data.some((r: any) => 
        r.processingStatus === 'processing' || 
        r.processingStatus === 'transcribing' ||
        r.processingStatus === 'generating_conversation' ||
        r.processingStatus === 'generating_assessment'
      );
      return hasProcessing ? 5000 : false;
    },
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["/api/admin/team-members"],
    enabled: !!(caseData as Case)?.assignedTo && user?.role === "admin",
  });

  const assignedUser = (teamMembers as UserType[] || []).find(
    (member) => member.id === (caseData as Case)?.assignedTo
  );

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const endpoint = user?.role === "admin" ? 
        `/api/admin/cases/${id}` : 
        `/api/cases/${id}`;
      const response = await apiRequest("PUT", endpoint, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cases"] });
      toast({
        title: "Case status updated",
        description: `Case has been marked as ${updateStatusMutation.variables}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAssessmentMutation = useMutation({
    mutationFn: async (assessmentId: string) => {
      const response = await apiRequest("DELETE", `/api/assessments/${assessmentId}`, {});
      if (response.status === 204) {
        return null;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({
        title: "Assessment deleted successfully",
        description: "The assessment has been permanently deleted.",
      });
      setDeletingAssessmentId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete assessment",
        description: error.message,
        variant: "destructive",
      });
      setDeletingAssessmentId(null);
    },
  });

  const handleDeleteAssessment = (assessmentId: string) => {
    setDeletingAssessmentId(assessmentId);
    deleteAssessmentMutation.mutate(assessmentId);
  };

  if (caseLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded w-1/4"></div>
            <div className="h-32 bg-muted animate-pulse rounded"></div>
            <div className="h-48 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const caseRecord = caseData as Case;
  const caseAssessments = (assessments as Assessment[] || []);
  const hasProcessingAssessments = caseAssessments.some((a: Assessment) => a.processingStatus === 'processing');
  const assignedMember = assignedUser;
  const assignedMemberName = assignedMember ? `${assignedMember.firstName} ${assignedMember.lastName}` : '';

  if (!caseRecord) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive mb-2">Case Not Found</h2>
            <p className="text-muted-foreground mb-4">The case you're looking for doesn't exist or you don't have permission to view it.</p>
            <Link href="/cases">
              <Button>Back to Cases</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 md:pl-16 py-4">
        {/* Small devices layout */}
        <div className="flex lg:hidden items-start justify-between gap-3">
          {/* Left side - Back button and case info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/cases")}
              data-testid="button-back"
              className="shrink-0 h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-foreground break-words" data-testid="text-case-title">
                {caseRecord.clientName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Case Details
              </p>
            </div>
          </div>

          {/* Right side - buttons stacked */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Admin controls */}
            {user?.role === "admin" && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAssignmentDialog(true)}
                  data-testid="button-assign-case"
                  className="h-9 px-3 text-sm"
                  size="sm"
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  <span>{caseRecord.assignedTo ? "Reassign" : "Assign"}</span>
                </Button>

                {caseRecord.status === 'active' && (
                  <Button 
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate("completed")}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-complete-case"
                    className="h-9 px-3 text-sm whitespace-nowrap"
                    size="sm"
                  >
                    Mark Complete
                  </Button>
                )}
              </>
            )}

            {/* Team member controls */}
            {(user?.role !== "admin" && caseRecord.assignedTo === user?.id) && (
              <Button 
                onClick={() => setShowRecordingPanel(true)}
                data-testid="button-record-audio"
                className="h-9 px-3 text-sm"
                size="sm"
              >
                <Mic className="h-4 w-4 mr-1" />
                Record Audio
              </Button>
            )}
          </div>
        </div>

        {/* Large devices layout */}
        <div className="hidden lg:flex lg:items-center lg:justify-between gap-4">
          {/* Left side - Back button and case info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/cases")}
              data-testid="button-back"
              className="shrink-0 mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <h1 className="text-2xl font-semibold text-foreground break-words" data-testid="text-case-title">
                {caseRecord.clientName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Case Details
              </p>
            </div>
          </div>

          {/* Right side - buttons horizontal */}
          <div className="flex gap-2 shrink-0">
            {/* Admin controls */}
            {user?.role === "admin" && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAssignmentDialog(true)}
                  data-testid="button-assign-case"
                  size="sm"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  <span>{caseRecord.assignedTo ? "Reassign" : "Assign"}</span>
                </Button>

                {caseRecord.status === 'active' && (
                  <Button 
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate("completed")}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-complete-case"
                    size="sm"
                  >
                    Mark Complete
                  </Button>
                )}
              </>
            )}

            {/* Team member controls */}
            {(user?.role !== "admin" && caseRecord.assignedTo === user?.id) && (
              <Button 
                onClick={() => setShowRecordingPanel(true)}
                data-testid="button-record-audio"
                size="sm"
              >
                <Mic className="h-4 w-4 mr-2" />
                Record Audio
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 space-y-6">

        {/* Case Information */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl md:text-2xl">
              <User className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>Case Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Created Date</p>
                  <p className="text-sm sm:text-base font-semibold break-words" data-testid="text-created-date">
                    {new Date(caseRecord.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Address</p>
                  <p className="text-sm sm:text-base font-semibold break-words" data-testid="text-address">
                    {caseRecord.address}
                  </p>
                </div>
              </div>

              {assignedMember && (
                <div className="flex items-start gap-3">
                  <UserCheck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Assigned To</p>
                    <p className="text-sm sm:text-base font-semibold break-words" data-testid="text-assigned-to">
                      {assignedMember.firstName} {assignedMember.lastName}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">{assignedMember.email}</p>
                  </div>
                </div>
              )}

              {caseRecord.assignedAt && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Assignment Date</p>
                    <p className="text-sm sm:text-base font-semibold break-words" data-testid="text-assigned-date">
                      {new Date(caseRecord.assignedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {caseRecord.caseDetails && (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
                <h4 className="text-sm sm:text-base font-semibold mb-2">Case Details</h4>
                <p className="text-xs sm:text-sm text-muted-foreground break-words leading-relaxed" data-testid="text-case-details">
                  {caseRecord.caseDetails}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assessments Section */}
        <Card className={hasProcessingAssessments ? "relative" : ""}>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl md:text-2xl">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span>Assessments ({caseAssessments.length})</span>
              </CardTitle>
              {hasProcessingAssessments && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {assessmentsLoading ? (
              <div className="space-y-2">
                <div className="h-32 bg-muted animate-pulse rounded"></div>
              </div>
            ) : caseAssessments.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {caseAssessments.map((assessment) => (
                  <Card key={assessment.id} className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]" onClick={() => setLocation(`/assessments/${assessment.id}`)} data-testid={`card-assessment-${assessment.id}`}>
                    <CardHeader className="p-3 sm:p-4 md:p-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm sm:text-base md:text-lg font-semibold break-words flex-1 leading-snug">{assessment.title}</CardTitle>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={
                              assessment.processingStatus === 'completed' ? 'default' :
                              assessment.processingStatus === 'processing' ? 'secondary' :
                              assessment.processingStatus === 'failed' ? 'destructive' : 'outline'
                            } data-testid={`badge-status-${assessment.id}`} className="text-xs">
                              {assessment.processingStatus.charAt(0).toUpperCase() + assessment.processingStatus.slice(1)}
                            </Badge>
                            {user?.role === 'admin' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`button-delete-assessment-${assessment.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Assessment?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{assessment.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAssessment(assessment.id);
                                      }}
                                      className="bg-destructive hover:bg-destructive/90"
                                      disabled={deleteAssessmentMutation.isPending && deletingAssessmentId === assessment.id}
                                      data-testid={`button-confirm-delete-${assessment.id}`}
                                    >
                                      {deleteAssessmentMutation.isPending && deletingAssessmentId === assessment.id ? 'Deleting...' : 'Delete'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {new Date(assessment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                      <div className="space-y-2">
                        {/* Show overview from dynamic sections or legacy overview field */}
                        {(assessment.dynamicSections?.overview || assessment.overview) && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {assessment.dynamicSections?.overview || assessment.overview}
                          </p>
                        )}

                        {/* Show badges for available sections */}
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {assessment.dynamicSections && Object.keys(assessment.dynamicSections).length > 0 && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              {Object.keys(assessment.dynamicSections).length} Sections
                            </Badge>
                          )}
                          {assessment.actionItems && assessment.actionItems.length > 0 && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">{assessment.actionItems.length} Action Items</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 px-4">
                <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No Assessments Yet</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
                  No assessments have been created for this case yet.
                </p>
                {/* Show recording button for assigned team members */}
                {(user?.role !== "admin" && caseRecord.assignedTo === user?.id) && (
                  <Button 
                    onClick={() => setShowRecordingPanel(true)}
                    data-testid="button-record-audio-assessments"
                    className="min-h-[44px] text-sm"
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Record Audio
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      {showAssignmentDialog && (
        <CaseAssignmentDialog
          open={showAssignmentDialog}
          onClose={() => setShowAssignmentDialog(false)}
          caseData={caseRecord}
        />
      )}

      {id && (
        <RecordingPanel 
          caseId={id}
          open={showRecordingPanel}
          onClose={() => setShowRecordingPanel(false)} 
        />
      )}
    </div>
  );
}