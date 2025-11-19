import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  Download
} from "lucide-react";
import { Assessment, Case, User as UserType } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { AudioPlayer } from "@/components/recording/audio-player";
import { InlineEdit } from "@/components/ui/inline-edit";
import { ChatbotAssistant } from "@/components/assessment/chatbot-assistant";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePDFDownload } from "@/hooks/use-pdf-download";
import { useState } from "react";

export default function AssessmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { downloadAssessmentPDF } = usePDFDownload();
  const [currentSection, setCurrentSection] = useState<string>('overview');
  const [focusedContent, setFocusedContent] = useState<string>('');

  // Mutation for updating assessment fields
  const updateAssessmentMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string | string[] }) => {
      console.log('Updating field:', { field, value });
      const response = await apiRequest("PATCH", `/api/assessments/${id}`, {
        [field]: value,
      });
      return response.json();
    },
    onSuccess: async (data) => {
      console.log('Update successful:', data);
      // Immediately refetch the assessment to update UI
      await queryClient.invalidateQueries({ queryKey: ["/api/assessments", id] });
      toast({
        title: "Assessment updated",
        description: "Changes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Update failed:', error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const canEdit = (assessmentRecord: Assessment) => {
    return user && (
      user.role === 'admin' ||
      assessmentRecord.assignedTo === user.id
    ) && assessmentRecord.processingStatus === 'completed';
  };

  const handleFieldUpdate = (field: string, value: string | string[]) => {
    updateAssessmentMutation.mutate({ field, value });
  };

  const handleSectionFocus = (section: string, content: string) => {
    setCurrentSection(section);
    setFocusedContent(content);
  };

  const handleSectionChange = (section: string, content: string) => {
    if (section === currentSection) {
      setFocusedContent(content);
    }
  };

  const handleApplySuggestion = async (section: string, content: string, type: 'replace' | 'append') => {
    if (!assessmentRecord) return;

    // Normalize section name to lowercase without spaces for matching
    const normalizedSection = section.toLowerCase().replace(/\s+/g, '').trim();

    // Check if this section exists in dynamicSections (case-insensitive, space-insensitive match)
    const existingSectionKey = assessmentRecord.dynamicSections
      ? Object.keys(assessmentRecord.dynamicSections).find(
          key => key.toLowerCase().replace(/\s+/g, '').trim() === normalizedSection
        )
      : null;

    // Use existing key if found, otherwise use the original section name from chatbot
    const fieldName = existingSectionKey || section;

    console.log('Applying suggestion:', { 
      originalSection: section, 
      normalizedSection, 
      existingSectionKey, 
      fieldName,
      type 
    });

    // Handle actionItems as an array field
    if (normalizedSection === 'actionitems') {
      const currentItems = assessmentRecord.actionItems || [];
      let newItems: string[];

      if (type === 'append') {
        // Split content by newlines to handle multiple items
        const newItemsToAdd = content.split('\n').map(item => item.trim()).filter(item => item.length > 0);
        newItems = [...currentItems, ...newItemsToAdd];
      } else {
        // Replace: split content into array items
        newItems = content.split('\n').map(item => item.trim()).filter(item => item.length > 0);
      }

      await handleFieldUpdate('actionItems', newItems);
    } else {
      // Handle dynamic section fields - use the exact key from dynamicSections if it exists
      const currentValue = assessmentRecord.dynamicSections?.[fieldName] || '';
      let newValue: string;

      if (type === 'append') {
        newValue = currentValue ? `${currentValue}\n\n${content}` : content;
      } else {
        newValue = content;
      }

      // Update using the correct field name
      await handleFieldUpdate(fieldName, newValue);
    }
  };

  const handleDownloadPDF = async () => {
    const assessmentRecord = assessment as Assessment;
    const caseRecord = caseData as Case;

    try {
      await downloadAssessmentPDF(assessmentRecord, caseRecord);
      toast({
        title: "PDF downloaded",
        description: "The assessment PDF has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { data: assessment, isLoading: assessmentLoading } = useQuery({
    queryKey: ["/api/assessments", id],
  });

  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: ["/api/cases", (assessment as Assessment)?.caseId],
    enabled: !!(assessment as Assessment)?.caseId,
  });

  // Fetch team members to get assigned user name
  const { data: teamMembers } = useQuery({
    queryKey: ["/api/admin/team-members"],
    enabled: !!(assessment as Assessment)?.assignedTo && user?.role === "admin",
  });

  // Fetch transcripts for this assessment
  const { data: transcripts, isLoading: transcriptsLoading } = useQuery({
    queryKey: ["/api/assessments", id, "transcripts"],
    queryFn: () => fetch(`/api/assessments/${id}/transcripts`).then(res => res.json()),
    enabled: !!id,
  });

  // Fetch recordings for this assessment
  const { data: recordings, isLoading: recordingsLoading } = useQuery({
    queryKey: ["/api/assessments", id, "recordings"],
    queryFn: () => fetch(`/api/assessments/${id}/recordings`).then(res => res.json()),
    enabled: !!id,
  });

  if (assessmentLoading || caseLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded w-1/4"></div>
            <div className="h-32 bg-muted animate-pulse rounded"></div>
            <div className="h-48 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const assessmentRecord = assessment as Assessment;
  const caseRecord = caseData as Case;
  const assessmentTranscripts = (transcripts as any[] || []);
  const assessmentRecordings = (recordings as any[] || []);
  
  // Get assigned user information
  const assignedUser = (teamMembers as UserType[] || []).find(
    (member) => member.id === assessmentRecord?.assignedTo
  );
  const assignedMemberName = assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Team Member';

  if (!assessmentRecord) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive mb-2">Assessment Not Found</h2>
            <p className="text-muted-foreground mb-4">The assessment you're looking for doesn't exist or you don't have permission to view it.</p>
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
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Top Row: Back button and Actions */}
          <div className="flex items-center justify-between gap-2">
            <Link href={`/cases/${assessmentRecord.caseId}`}>
              <Button variant="ghost" size="sm" data-testid="button-back-to-case" className="min-h-[44px] sm:min-h-[36px]">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="text-sm">Back to Case</span>
              </Button>
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {assessmentRecord.processingStatus === 'completed' && (
                <Button
                  onClick={handleDownloadPDF}
                  variant="outline"
                  size="sm"
                  data-testid="button-download-pdf"
                  className="min-h-[44px] sm:min-h-[36px]"
                >
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline text-sm">Download PDF</span>
                </Button>
              )}
              <Badge
                variant={
                  assessmentRecord.processingStatus === 'completed' ? 'default' :
                  assessmentRecord.processingStatus === 'processing' ? 'secondary' :
                  assessmentRecord.processingStatus === 'failed' ? 'destructive' : 'outline'
                }
                data-testid="badge-assessment-status"
                className="text-xs px-2.5 py-1"
              >
                {assessmentRecord.processingStatus.charAt(0).toUpperCase() + assessmentRecord.processingStatus.slice(1)}
              </Badge>
            </div>
          </div>
          
          {/* Title and Subtitle */}
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground break-words" data-testid="text-assessment-title">
              {assessmentRecord.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Assessment Details
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-6">
        <div className="mb-2 sm:mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Client: {caseRecord?.clientName || 'Unknown'}</p>
        </div>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
            <TabsTrigger value="summary" data-testid="tab-summary" className="text-sm py-3 sm:py-2 min-h-[44px] sm:min-h-[36px]">
              <FileText className="h-4 w-4 mr-2" />
              <span>Summary</span>
            </TabsTrigger>
            <TabsTrigger value="recording" data-testid="tab-recording" className="text-sm py-3 sm:py-2 min-h-[44px] sm:min-h-[36px]">
              <Play className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Recording & Transcript</span>
              <span className="sm:hidden">Recording</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-2 sm:space-y-4 md:space-y-6">
            {/* Assessment Information */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  Assessment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 sm:mt-0 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">Created Date</p>
                      <p className="font-medium text-sm sm:text-base break-words" data-testid="text-created-date">
                        {new Date(assessmentRecord.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 sm:mt-0 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">Template</p>
                      <p className="font-medium text-sm sm:text-base break-words" data-testid="text-template">
                        {assessmentRecord.template}
                      </p>
                    </div>
                  </div>

                  {assessmentRecord.assignedTo && (
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5 sm:mt-0 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Assigned To</p>
                        <p className="font-medium text-sm sm:text-base break-words" data-testid="text-assigned-user">
                          {assignedMemberName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Overall Assessment Overview */}
            {assessmentRecord.processingStatus === 'completed' && assessmentRecord.dynamicSections?.overview && (
              <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
                <CardHeader className="pb-2 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                    <span className="break-words">Overall Assessment Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                    <p className="text-sm sm:text-base leading-relaxed text-foreground/90 break-words">
                      {assessmentRecord.dynamicSections.overview}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assessment Summary - ALL DYNAMIC SECTIONS */}
            {assessmentRecord.processingStatus === 'completed' && (
              <Card>
                <CardHeader className="pb-2 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="text-base sm:text-lg md:text-xl">Detailed Assessment Sections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">

                  {/* Render all dynamic sections in template order */}
                  {assessmentRecord.dynamicSections && (() => {
                    // Define template section order
                    const templateOrder = [
                      "overview", "hygiene", "homeenvironment", "actionitems", "medicalhistory",
                      "behaviour", "personalcare", "background", "whoandwhatisimportanttome",
                      "interestsandhobbies", "communication", "eatinganddrinking",
                      "endoflifeconsiderationsandmylastwishes", "allergies", "keysafe",
                      "medicationsupport", "religionpracticing", "skinintegrity", "breathing",
                      "emotional", "nutrition"
                    ];

                    // Map display names (preserving original casing and spaces)
                    const displayNames: Record<string, string> = {
                      "overview": "Overview",
                      "hygiene": "Hygiene",
                      "homeenvironment": "Home Environment",
                      "actionitems": "Action Items",
                      "medicalhistory": "Medical History",
                      "behaviour": "Behaviour",
                      "personalcare": "Personal Care",
                      "background": "Background",
                      "whoandwhatisimportanttome": "Who and what is important to me",
                      "interestsandhobbies": "Interests and Hobbies",
                      "communication": "Communication",
                      "eatinganddrinking": "Eating and Drinking",
                      "endoflifeconsiderationsandmylastwishes": "End of life considerations and my last wishes",
                      "allergies": "ALLERGIES",
                      "keysafe": "Key Safe",
                      "medicationsupport": "Medication Support",
                      "religionpracticing": "Religion (Practicing)",
                      "skinintegrity": "Skin integrity",
                      "breathing": "Breathing",
                      "emotional": "Emotional",
                      "nutrition": "Nutrition"
                    };

                    // Sort sections by template order
                    const sortedSections = Object.entries(assessmentRecord.dynamicSections)
                      .sort(([keyA], [keyB]) => {
                        const indexA = templateOrder.indexOf(keyA.toLowerCase());
                        const indexB = templateOrder.indexOf(keyB.toLowerCase());
                        // If not found in template order, put at end
                        if (indexA === -1) return 1;
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                      });

                    return sortedSections.map(([key, content], index) => {
                      const sectionTitle = displayNames[key.toLowerCase()] || key;
                      // Skip overview as it's shown separately
                      if (key.toLowerCase() === 'overview') return null;

                      return (
                        <div key={key} className="space-y-1 sm:space-y-3">
                          {index > 0 && <Separator className="my-2 sm:my-4 md:my-6" />}
                          <div className="group">
                            <div className="flex items-center gap-2 mb-1 sm:mb-3">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                              <h4 className="font-semibold text-sm sm:text-base md:text-lg text-foreground group-hover:text-primary transition-colors break-words">{sectionTitle}</h4>
                            </div>
                            <div className="ml-2 sm:ml-3.5 pl-2 sm:pl-3 border-l-2 border-muted">
                              <InlineEdit
                                value={content || ''}
                                onSave={(value) => handleFieldUpdate(key, value)}
                                onFocus={() => handleSectionFocus(key, content || '')}
                                onChange={(value) => handleSectionChange(key, value)}
                                placeholder={`Click to add ${sectionTitle.toLowerCase()} assessment...`}
                                multiline
                                disabled={!canEdit(assessmentRecord)}
                                data-testid={`text-${key}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {assessmentRecord.actionItems && assessmentRecord.actionItems.length > 0 && (
                    <>
                      <Separator className="my-2 sm:my-4" />
                      <div>
                        <h4 className="font-semibold text-sm sm:text-base md:text-lg text-foreground mb-1 sm:mb-3">Action Items</h4>
                        <ul className="space-y-1 sm:space-y-3" data-testid="list-action-items">
                          {assessmentRecord.actionItems.map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-xs sm:text-sm text-muted-foreground break-words">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Processing Status for incomplete assessments on Summary tab */}
            {assessmentRecord.processingStatus === 'processing' && (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Processing Assessment</h3>
                  <p className="text-muted-foreground">
                    AI is analyzing the transcript and generating the assessment. This may take a few minutes.
                  </p>
                </CardContent>
              </Card>
            )}

            {assessmentRecord.processingStatus === 'failed' && (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-lg font-medium text-destructive mb-2">Processing Failed</h3>
                  <p className="text-muted-foreground">
                    There was an error processing this assessment. Please try uploading the audio again.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recording" className="space-y-2 sm:space-y-4 md:space-y-6">
            {/* Transcript Section */}
            {assessmentTranscripts.length > 0 ? (
              <div className="space-y-2 sm:space-y-4">
                {assessmentTranscripts.map((transcript) => {
                  const relatedRecording = assessmentRecordings.find(r => r.id === transcript.recordingId);
                  const audioUrl = relatedRecording ? `/api/recordings/${relatedRecording.id}/audio` : undefined;

                  return (
                    <div key={transcript.id} className="space-y-2 sm:space-y-4">
                      {(transcript.processingStatus === 'completed' || transcript.processingStatus === 'transcription_complete') ? (
                        <AudioPlayer
                          audioUrl={audioUrl || ''}
                          transcript={transcript.rawTranscript}
                          enhancedTranscript={transcript.enhancedTranscript}
                        />
                      ) : transcript.processingStatus === 'processing' ? (
                        <div className="text-center py-6 sm:py-8">
                          <Clock className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-blue-500 animate-spin mb-3 sm:mb-4" />
                          <p className="text-sm sm:text-base text-muted-foreground">Transcription in progress...</p>
                        </div>
                      ) : transcript.processingStatus === 'failed' ? (
                        <div className="text-center py-6 sm:py-8">
                          <AlertCircle className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-destructive mb-3 sm:mb-4" />
                          <p className="text-sm sm:text-base text-destructive">Transcription failed</p>
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8">
                          <Clock className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mb-3 sm:mb-4" />
                          <p className="text-sm sm:text-base text-muted-foreground">Waiting for transcription...</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8 sm:py-12 px-4 sm:px-6">
                  <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No Recordings Available</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    No audio recordings or transcripts have been uploaded for this assessment yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Processing Status for incomplete assessments */}
        {assessmentRecord.processingStatus === 'processing' && (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Processing Assessment</h3>
              <p className="text-muted-foreground">
                AI is analyzing the transcript and generating the assessment. This may take a few minutes.
              </p>
            </CardContent>
          </Card>
        )}

        {assessmentRecord.processingStatus === 'failed' && (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium text-destructive mb-2">Processing Failed</h3>
              <p className="text-muted-foreground">
                There was an error processing this assessment. Please try uploading the audio again.
              </p>
            </CardContent>
          </Card>
        )}

      </main>

      {/* AI Chatbot Assistant */}
      {assessmentRecord && (
        <ChatbotAssistant
          assessment={assessmentRecord}
          currentSection={currentSection}
          currentContent={focusedContent}
          onApplySuggestion={handleApplySuggestion}
        />
      )}
    </div>
  );
}