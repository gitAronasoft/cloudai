import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Upload, Square, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiUpload, queryClient } from "@/lib/queryClient";

interface RecordingPanelProps {
  caseId: string;
  open: boolean;
  onClose: () => void;
}

export function RecordingPanel({ caseId, open, onClose }: RecordingPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [processingRecordingId, setProcessingRecordingId] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const lastToastStatus = useRef<string | null>(null);
  const { toast } = useToast();

  // Fetch templates to use the active template name
  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
  });

  // Get the first active template or fallback to "General Care Assessments"
  const activeTemplate = (templates as any[])?.find((t: any) => t.status === "active");
  const templateName = activeTemplate?.name || "General Care Assessments";

  const uploadMutation = useMutation({
    mutationFn: async ({ file, template, title }: { file: File; template: string; title: string }) => {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("template", template);
      formData.append("title", title);

      const response = await apiUpload(`/api/cases/${caseId}/upload-audio`, formData);
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Upload completed",
        description: "Audio uploaded successfully. AI processing has begun.",
      });
      // Start tracking the processing status
      setProcessingRecordingId(data.recordingId);
      setProcessingSteps(["Audio uploaded ✓", "Starting transcription..."]);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload audio file.",
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 50MB.",
          variant: "destructive",
        });
        return;
      }
      // Store file for processing later
      setUploadedFile(file);
      toast({
        title: "File ready",
        description: "Audio file loaded. Click Start Process to begin.",
      });
    }
  };

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  // Initialize recording functionality
  useEffect(() => {
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try formats in order of compatibility (iOS-friendly first)
      const options: MediaRecorderOptions = {};
      const preferredFormats = [
        'audio/mp4;codecs=mp4a.40.2', // Safari/iOS specific format
        'audio/mp4',                   // Generic MP4 
        'audio/mpeg',                  // MP3 - widely supported
        'audio/webm;codecs=opus',     // WebM with Opus codec
        'audio/webm',                  // Generic WebM fallback
      ];
      
      for (const format of preferredFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
          options.mimeType = format;
          console.log(`Using audio format: ${format}`);
          break;
        }
      }
      
      // Log if no format was selected
      if (!options.mimeType) {
        console.warn('No preferred format supported, using browser default');
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Use the recorder's mimeType for the blob
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      // Request data every 1 second to ensure we capture all audio on mobile devices
      recorder.start(1000);
      setIsRecording(true);

      // Reset and start duration counter
      setRecordingDuration(0);
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording started",
        description: "Recording audio from your microphone...",
      });
    } catch (error) {
      toast({
        title: "Recording failed",
        description: `Could not access microphone: ${error instanceof Error ? error.message : 'Please check permissions'}`,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);

      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }

      toast({
        title: "Recording stopped",
        description: "Recording saved. You can now upload it.",
      });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Poll for processing status
  const { data: processingStatus } = useQuery({
    queryKey: ['/api/recordings', processingRecordingId, 'status'],
    queryFn: async () => {
      if (!processingRecordingId) return null;
      const response = await fetch(`/api/recordings/${processingRecordingId}`);
      return response.json();
    },
    enabled: !!processingRecordingId,
    refetchInterval: processingRecordingId ? 2000 : false, // Poll every 2 seconds
  });

  // Update processing steps based on the current status
  useEffect(() => {
    if (processingStatus && processingRecordingId) {
      const status = processingStatus.processingStatus;

      if (status === 'transcribing') {
        setProcessingSteps([
          "Audio uploaded ✓",
          "Transcribing audio..."
        ]);
      } else if (status === 'generating_conversation') {
        setProcessingSteps([
          "Audio uploaded ✓",
          "Transcription completed ✓",
          "Generating conversation format..."
        ]);
      } else if (status === 'generating_assessment') {
        setProcessingSteps([
          "Audio uploaded ✓",
          "Transcription completed ✓",
          "Conversation format generated ✓",
          "Processing assessment with AI..."
        ]);
      } else if (status === 'finalizing') {
        setProcessingSteps([
          "Audio uploaded ✓",
          "Transcription completed ✓",
          "Conversation format generated ✓",
          "Assessment processed ✓",
          "Finalizing..."
        ]);
      } else if (status === 'processing') {
        setProcessingSteps([
          "Audio uploaded ✓",
          "Transcribing audio...",
          "Generating conversation format...",
          "Processing assessment with AI..."
        ]);
      } else if (status === 'completed') {
        setProcessingSteps([
          "Audio uploaded ✓",
          "Transcription completed ✓",
          "Conversation format generated ✓",
          "Assessment processed ✓",
          "Processing completed!"
        ]);

        // Only show toast and cleanup if we haven't already shown it for this status
        if (lastToastStatus.current !== 'completed') {
          lastToastStatus.current = 'completed';
          
          // Invalidate queries to refresh the case detail page
          queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "transcripts"] });
          queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });

          toast({
            title: "Processing completed",
            description: "Audio has been processed successfully. View the results in the case details.",
          });

          // Close the sheet and reset state after a short delay
          setTimeout(() => {
            onClose();
            // Reset state after closing
            setTimeout(() => {
              setRecordedBlob(null);
              setUploadedFile(null);
              setRecordingDuration(0);
              setAssessmentTitle("");
              setProcessingRecordingId(null);
              setProcessingSteps([]);
              lastToastStatus.current = null;
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }, 300);
          }, 2000);
        }
      } else if (status === 'failed') {
        setProcessingSteps([
          "Audio uploaded ✓",
          "Processing failed ✗"
        ]);

        // Only show toast if we haven't already shown it for this status
        if (lastToastStatus.current !== 'failed') {
          lastToastStatus.current = 'failed';
          
          toast({
            title: "Processing failed",
            description: "There was an error processing your audio. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  }, [processingStatus, processingRecordingId, caseId, toast, onClose]);

  const startProcessing = () => {
    // Validate title
    if (!assessmentTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for this assessment.",
        variant: "destructive",
      });
      return;
    }

    let fileToProcess: File | null = null;

    if (uploadedFile) {
      fileToProcess = uploadedFile;
    } else if (recordedBlob) {
      // Determine file extension based on mime type
      const mimeType = recordedBlob.type;
      console.log("Recorded blob mime type:", mimeType);
      let extension = 'webm'; // default

      if (mimeType.includes('mp4')) {
        extension = 'm4a';  // MP4 audio uses .m4a extension
      } else if (mimeType.includes('wav')) {
        extension = 'wav';
      } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
        extension = 'mp3';
      } else if (mimeType.includes('ogg')) {
        extension = 'ogg';
      } else if (mimeType.includes('m4a')) {
        extension = 'm4a';
      } else if (mimeType.includes('webm')) {
        extension = 'webm';
      }

      console.log("Using extension:", extension);
      fileToProcess = new File([recordedBlob], `recording-${Date.now()}.${extension}`, {
        type: recordedBlob.type
      });
      console.log("Created file:", fileToProcess.name, fileToProcess.type, fileToProcess.size);
    }

    if (fileToProcess) {
      // Reset toast status tracking for new processing session
      lastToastStatus.current = null;
      
      uploadMutation.mutate({ 
        file: fileToProcess, 
        template: templateName, 
        title: assessmentTitle.trim() 
      });
      // Reset audio states but keep processing states
      setRecordedBlob(null);
      setUploadedFile(null);
      setRecordingDuration(0);
      setAssessmentTitle("");
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };



  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // Don't reset state - allow user to reopen and continue
        onClose();
      }
    }}>
      <SheetContent side="right" className="w-96 sm:w-96">
        <SheetHeader>
          <SheetTitle>New Recording</SheetTitle>
          <SheetClose data-testid="button-close-panel" />
        </SheetHeader>
        <div className="mt-6 space-y-6">

          {/* Assessment Title */}
          <div className="space-y-2">
            <Label htmlFor="assessment-title">Assessment Title</Label>
            <Input
              id="assessment-title"
              placeholder="Enter assessment title (e.g., 'Home Visit Assessment')"
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              data-testid="input-assessment-title"
            />
          </div>

          {/* Recording Controls */}
          <div className="text-center space-y-4">
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className="w-16 h-16 rounded-full"
              onClick={toggleRecording}
              data-testid="button-toggle-recording"
            >
              {isRecording ? (
                <Square className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              {isRecording ? "Click to stop recording" : recordedBlob ? "Recording ready" : "Click to start recording"}
            </p>
          </div>

          {/* Recording Status */}
          {isRecording && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Recording...</span>
                <span className="text-sm text-red-600 dark:text-red-400">{Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
          )}

          {/* Recorded Audio Ready */}
          {recordedBlob && !isRecording && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Recording ready</span>
                <span className="text-sm text-green-600 dark:text-green-400">{Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
          )}

          {/* Uploaded File Ready */}
          {uploadedFile && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">File ready</span>
                <span className="text-sm text-green-600 dark:text-green-400 truncate max-w-[150px]">{uploadedFile.name}</span>
              </div>
            </div>
          )}

          {/* Start Processing Button */}
          {(recordedBlob || uploadedFile) && !uploadMutation.isPending && !isRecording && (
            <Button 
              size="lg"
              className="w-full"
              onClick={startProcessing}
              data-testid="button-start-processing"
            >
              Start Process
            </Button>
          )}

          {/* File Upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Or upload an audio file</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
              data-testid="input-audio-upload"
            />
            <Button
              variant="outline"
              onClick={handleBrowseFiles}
              disabled={uploadMutation.isPending || !!uploadedFile || isRecording}
              data-testid="button-browse-files"
            >
              Browse files
            </Button>
          </div>

          {/* Processing Status */}
          {(uploadMutation.isPending || processingRecordingId) && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {uploadMutation.isPending ? "Uploading audio..." : "Processing with AI..."}
                </span>
              </div>

              {processingSteps.length > 0 && (
                <div className="space-y-2">
                  {processingSteps.map((step, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        step.includes('✓') ? 'bg-green-500' : 
                        step.includes('✗') ? 'bg-red-500' : 
                        'bg-blue-500 animate-pulse'
                      }`}></div>
                      <span className={`text-xs ${
                        step.includes('✓') ? 'text-green-700 dark:text-green-300' :
                        step.includes('✗') ? 'text-red-700 dark:text-red-300' :
                        'text-blue-600 dark:text-blue-400'
                      }`}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {uploadMutation.isPending && (
                <Progress value={uploadProgress} className="h-2 mt-3" />
              )}
            </div>
          )}

        </div>

      </SheetContent>
    </Sheet>
  );
}