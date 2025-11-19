import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./email-service";
import { setupAuth, requireAuth, requireAdmin } from "./auth";
import { insertCaseSchema, insertAssessmentSchema, insertTemplateSchema, updateTemplateSchema, type Assessment, type AssignAssessment, type ReassignAssessment, type AssignmentFilters, type Template, type InsertTemplate, type UpdateTemplate } from "@shared/schema";
import { ZodError } from "zod";
import { transcribeAudio, generateCareAssessment, generateCaseFromTranscript } from "./services/openai";
import { getChatbotResponse, getContentSuggestions, ChatbotRequest } from "./services/chatbot";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      // Get file extension from mimetype or original filename
      let extension = '.tmp';
      if (file.mimetype.includes('webm')) {
        extension = '.webm';
      } else if (file.mimetype.includes('wav')) {
        extension = '.wav';
      } else if (file.mimetype.includes('mp3') || file.mimetype.includes('mpeg')) {
        extension = '.mp3';
      } else if (file.mimetype.includes('m4a')) {
        extension = '.m4a';
      } else if (file.mimetype.includes('ogg')) {
        extension = '.ogg';
      } else if (file.mimetype.includes('flac')) {
        extension = '.flac';
      } else if (file.originalname) {
        const originalExt = path.extname(file.originalname);
        if (originalExt) {
          extension = originalExt;
        }
      }
      
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + extension);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mp3', 
      'audio/mpeg', 
      'audio/wav', 
      'audio/m4a', 
      'audio/ogg', 
      'audio/webm',
      'audio/mp4',
      'audio/flac'
    ];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/webm')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up authentication routes: /api/register, /api/login, /api/logout, /api/user
  // and admin routes: /api/admin/invite, /api/accept-invitation, etc.
  setupAuth(app);
  
  // Serve uploaded audio files with security measures (SECURED - requires authentication)
  app.get("/uploads/:filename", requireAuth, async (req, res) => {
    try {
      const filename = req.params.filename;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Security: Sanitize filename to prevent directory traversal
      if (!filename || 
          filename.includes('..') || 
          filename.includes('/') || 
          filename.includes('\\') ||
          filename.startsWith('.') ||
          filename.length > 255) {
        return res.status(400).json({ message: "Invalid filename" });
      }
      
      // Authorization: Find the file owner through Recording or Assessment
      let assessment = null;
      
      // First try to find via Recording (new system)
      const recording = await storage.getRecordingByFilename(filename);
      if (recording && recording.assessmentId) {
        assessment = await storage.getAssessment(recording.assessmentId);
      } else {
        // Fallback: find via Assessment.audioFilePath (existing system)
        const allAssessments = await storage.getAllAssessments();
        assessment = allAssessments.find(a => 
          a.audioFilePath && a.audioFilePath.includes(filename)
        );
      }
      
      if (!assessment) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Users can only access files for assessments assigned to them, admins can access all
      if (userRole !== "admin" && assessment.assignedTo !== userId) {
        console.log(`[UPLOAD] Access denied: User ${userId} tried to access file for assessment assigned to ${assessment.assignedTo}`);
        return res.status(404).json({ message: "File not found" }); // Return 404 instead of 403 to prevent enumeration
      }
      
      // Security: Resolve paths and verify the file is within uploads directory
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const requestedPath = path.resolve(uploadsDir, filename);
      
      // Security hardening: Check for symlinks and ensure real path is within uploads
      let stats;
      try {
        // Use lstat to not follow symlinks - reject symlinks for security
        stats = fs.lstatSync(requestedPath);
        if (stats.isSymbolicLink()) {
          console.log(`[UPLOAD] Security: Symlink blocked for: ${filename}`);
          return res.status(404).json({ message: "File not found" });
        }
        
        // Verify real path is within uploads directory
        const realPath = fs.realpathSync(requestedPath);
        if (!realPath.startsWith(uploadsDir + path.sep) && realPath !== uploadsDir) {
          console.log(`[UPLOAD] Security: Path traversal attempt blocked for: ${filename}`);
          return res.status(404).json({ message: "File not found" });
        }
        
        // Ensure it's actually a file
        if (!stats.isFile()) {
          return res.status(404).json({ message: "File not found" });
        }
      } catch (err) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Determine content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      switch (ext) {
        case '.mp3':
          contentType = 'audio/mpeg';
          break;
        case '.wav':
          contentType = 'audio/wav';
          break;
        case '.m4a':
          contentType = 'audio/mp4';
          break;
        case '.ogg':
          contentType = 'audio/ogg';
          break;
        case '.flac':
          contentType = 'audio/flac';
          break;
        case '.webm':
          contentType = 'audio/webm';
          break;
        default:
          contentType = 'audio/mpeg'; // Default fallback for audio files
      }
      
      // Set basic headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'private, max-age=3600'); // Private cache for security
      res.setHeader('X-Content-Type-Options', 'nosniff'); // Additional security header
      
      // Handle Range requests for audio scrubbing
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        
        // Security: Validate range values to prevent NaN-based DoS
        if (isNaN(start) || start < 0) {
          return res.status(416).json({ message: "Invalid range" });
        }
        let end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        
        // Security: Validate end value and handle NaN
        if (parts[1] && isNaN(end)) {
          return res.status(416).json({ message: "Invalid range" });
        }
        if (end >= stats.size) {
          end = stats.size - 1;
        }
        
        // Validate range
        if (start >= stats.size || start > end || end < 0) {
          res.setHeader('Content-Range', `bytes */${stats.size}`);
          return res.status(416).json({ message: "Range not satisfiable" });
        }
        
        const chunksize = (end - start) + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
        res.setHeader('Content-Length', chunksize);
        
        // Create stream for the specific range
        const fileStream = fs.createReadStream(requestedPath, { start, end });
        fileStream.on('error', (err) => {
          console.error('Range stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({ message: "File read error" });
          }
        });
        fileStream.pipe(res);
      } else {
        // Stream entire file
        res.setHeader('Content-Length', stats.size);
        const fileStream = fs.createReadStream(requestedPath);
        fileStream.on('error', (err) => {
          console.error('File stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({ message: "File read error" });
          }
        });
        fileStream.pipe(res);
      }
      
    } catch (error) {
      console.error('File serving error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cases routes with role-based access control
  app.get("/api/cases", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      let cases;
      
      if (user.role === 'admin') {
        // Admins can see all cases
        cases = await storage.getAllCases();
      } else {
        // Team members can only see cases assigned to them
        const allCases = await storage.getAllCases();
        cases = allCases.filter(caseRecord => caseRecord.assignedTo === user.id);
      }
      
      res.json(cases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.get("/api/cases/assigned", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      // Get cases assigned to current user
      const allCases = await storage.getAllCases();
      const assignedCases = allCases.filter(caseRecord => caseRecord.assignedTo === user.id);
      
      res.json(assignedCases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assigned cases" });
    }
  });

  app.get("/api/cases/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const caseRecord = await storage.getCase(req.params.id);
      
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Role-based access control
      if (user.role !== 'admin' && caseRecord.assignedTo !== user.id) {
        return res.status(403).json({ message: "Not authorized to view this case" });
      }
      
      res.json(caseRecord);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  app.post("/api/admin/cases", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertCaseSchema.parse(req.body);
      
      // Create the case first - add createdBy separately since it's not in insertCaseSchema
      const caseData = {
        clientName: validatedData.clientName,
        address: validatedData.address,
        caseDetails: validatedData.caseDetails,
        status: validatedData.status || "active",
        createdBy: req.user!.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const newCase = await storage.createCase(caseData);
      
      // Handle assignment if assignedTo is provided
      if (validatedData.assignedTo) {
        try {
          // Get the assigned team member for email notification
          const teamMember = await storage.getUser(validatedData.assignedTo);
          if (teamMember) {
            // Update case with assignment details
            const assignedCase = await storage.updateCase(newCase.id, {
              assignedTo: validatedData.assignedTo,
              assignedAt: new Date(),
              status: "assigned"
            });
            
            // Send email notification to assigned team member
            let emailSent = false;
            try {
              if (teamMember.email) {
                const assignerName = req.user?.firstName || req.user?.email || "Admin";
                const teamMemberName = teamMember.firstName || teamMember.email || "Team Member";
                
                emailSent = await emailService.sendCaseAssignmentEmail(
                  teamMember.email,
                  assignerName,
                  teamMemberName,
                  newCase.clientName,
                  newCase.caseDetails || undefined,
                  undefined, // No dueDate in case schema
                  undefined  // No assignmentNotes in case schema
                );
                
                if (emailSent) {
                  console.log(`✅ Case assignment email sent to ${teamMember.email}`);
                }
              } else {
                console.warn(`⚠️ Team member ${teamMember.id} has no email address - skipping notification`);
              }
            } catch (error) {
              console.error(`❌ Failed to send case assignment email:`, error);
              // Don't fail the request if email fails
            }
            
            res.status(201).json({
              ...assignedCase,
              emailSent,
              message: `Case created and assigned to ${teamMember.firstName || teamMember.email || 'team member'}${emailSent ? ' (email sent)' : ' (email notification failed)'}`
            });
          } else {
            // Team member not found, but case was created
            res.status(201).json({
              ...newCase,
              warning: "Case created but assigned team member not found"
            });
          }
        } catch (assignmentError) {
          console.error("Assignment error during case creation:", assignmentError);
          // Case was created successfully, but assignment failed
          res.status(201).json({
            ...newCase,
            warning: "Case created but assignment failed"
          });
        }
      } else {
        // No assignment requested
        res.status(201).json(newCase);
      }
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Team member case creation with auto-assignment
  app.post("/api/cases", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const validatedData = insertCaseSchema.omit({ assignedTo: true }).parse(req.body);
      
      // Create the case and auto-assign to the creating user - add required fields separately
      const caseData = {
        clientName: validatedData.clientName,
        address: validatedData.address,
        caseDetails: validatedData.caseDetails,
        status: "assigned",
        createdBy: user.id,
        assignedTo: user.id,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const newCase = await storage.createCase(caseData);
      
      // Send confirmation email to the user
      let emailSent = false;
      try {
        if (user.email) {
          const teamMemberName = user.firstName || user.email || "Team Member";
          
          emailSent = await emailService.sendCaseAssignmentEmail(
            user.email,
            "System", // Since it's self-assigned
            teamMemberName,
            newCase.clientName,
            newCase.caseDetails || undefined,
            undefined, // No dueDate in case schema
            "You created and were automatically assigned to this case." // assignmentNotes
          );
          
          if (emailSent) {
            console.log(`✅ Case creation confirmation email sent to ${user.email}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to send case creation confirmation email:`, error);
        // Don't fail the request if email fails
      }
      
      res.status(201).json({
        ...newCase,
        emailSent,
        message: `Case created and assigned to you${emailSent ? ' (confirmation email sent)' : ''}`
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.patch("/api/cases/:id", requireAdmin, async (req, res) => {
    try {
      const caseId = req.params.id;
      
      // Check if case exists
      const existingCase = await storage.getCase(caseId);
      if (!existingCase) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      const updatedCase = await storage.updateCase(caseId, req.body);
      if (!updatedCase) {
        return res.status(500).json({ message: "Failed to update case" });
      }
      
      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ message: "Failed to update case" });
    }
  });

  app.delete("/api/cases/:id", requireAdmin, async (req, res) => {
    try {
      const caseId = req.params.id;
      
      // Check if case exists
      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      const deleted = await storage.deleteCase(caseId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete case" });
      }
      
      res.json({ message: "Case deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete case" });
    }
  });

  app.post("/api/cases/:id/assign", requireAdmin, async (req, res) => {
    try {
      const caseId = req.params.id;
      const { assignedTo, sendEmail = false } = req.body;
      
      // Validate case exists
      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Validate team member exists
      const teamMember = await storage.getUser(assignedTo);
      if (!teamMember) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      // Update case with assignment
      const updatedCase = await storage.updateCase(caseId, {
        assignedTo,
        assignedAt: new Date(),
        status: "assigned"
      });
      
      if (!updatedCase) {
        return res.status(500).json({ message: "Failed to assign case" });
      }
      
      // Send email notification only if sendEmail is true
      let emailSent = false;
      if (sendEmail) {
        try {
          if (teamMember.email) {
            const assignerName = req.user?.firstName || req.user?.email || "Admin";
            const teamMemberName = teamMember.firstName || teamMember.email || "Team Member";
            
            emailSent = await emailService.sendCaseAssignmentEmail(
              teamMember.email,
              assignerName,
              teamMemberName,
              updatedCase.clientName, // Using clientName as case title
              updatedCase.caseDetails || undefined,
              undefined, // No dueDate in case schema
              undefined  // No assignmentNotes in case schema
            );
            
            if (emailSent) {
              console.log(`✅ Case assignment email sent to ${teamMember.email}`);
            }
          } else {
            console.warn(`⚠️ Team member ${teamMember.id} has no email address - skipping notification`);
          }
        } catch (error) {
          console.error(`❌ Failed to send case assignment email:`, error);
          // Don't fail the request if email fails
        }
      } else {
        console.log(`ℹ️ Email notification skipped for case assignment to ${teamMember.email || teamMember.id}`);
      }
      
      res.json({
        message: "Case assigned successfully",
        case: updatedCase,
        emailSent
      });
    } catch (error) {
      console.error("Case assignment error:", error);
      res.status(500).json({ message: "Failed to assign case" });
    }
  });

  app.patch("/api/cases/:id/unassign", requireAdmin, async (req, res) => {
    try {
      const caseId = req.params.id;
      
      // Validate case exists
      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Check if case is assigned
      if (!caseRecord.assignedTo) {
        return res.status(400).json({ message: "Case is not assigned" });
      }
      
      // Unassign the case
      const updatedCase = await storage.unassignCase(caseId);
      
      if (!updatedCase) {
        return res.status(500).json({ message: "Failed to unassign case" });
      }
      
      res.json({
        message: "Case unassigned successfully",
        case: updatedCase
      });
    } catch (error) {
      console.error("Case unassignment error:", error);
      res.status(500).json({ message: "Failed to unassign case" });
    }
  });

  // Assessment-based transcript and recording routes  
  app.get("/api/assessments/:id/transcripts", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const assessmentId = req.params.id;
      
      // Check if user can access this assessment
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      const caseRecord = await storage.getCase(assessment.caseId);
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      if (user.role !== 'admin' && caseRecord.assignedTo !== user.id) {
        return res.status(403).json({ message: "Not authorized to view this assessment" });
      }
      
      const transcripts = await storage.getTranscriptsByAssessment(assessmentId);
      res.json(transcripts);
    } catch (error) {
      console.error('Error fetching transcripts by assessment:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/assessments/:id/recordings", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const assessmentId = req.params.id;
      
      // Check if user can access this assessment
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      const caseRecord = await storage.getCase(assessment.caseId);
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      if (user.role !== 'admin' && caseRecord.assignedTo !== user.id) {
        return res.status(403).json({ message: "Not authorized to view this assessment" });
      }
      
      const recordings = await storage.getRecordingsByAssessment(assessmentId);
      res.json(recordings);
    } catch (error) {
      console.error('Error fetching recordings by assessment:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Transcript routes
  app.get("/api/cases/:caseId/transcripts", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const caseId = req.params.caseId;
      
      // Check if user can access this case
      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      if (user.role !== 'admin' && caseRecord.assignedTo !== user.id) {
        return res.status(403).json({ message: "Not authorized to view this case" });
      }
      
      const transcripts = await storage.getTranscriptsByCase(caseId);
      res.json(transcripts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transcripts" });
    }
  });

  app.get("/api/transcripts/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const transcript = await storage.getTranscript(req.params.id);
      
      if (!transcript) {
        return res.status(404).json({ message: "Transcript not found" });
      }
      
      // Check if user can access the case this transcript belongs to
      if (!transcript.assessmentId) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      const assessment = await storage.getAssessment(transcript.assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      const caseRecord = await storage.getCase(assessment.caseId);
      if (!caseRecord || (user.role !== 'admin' && caseRecord.assignedTo !== user.id)) {
        return res.status(403).json({ message: "Not authorized to view this transcript" });
      }
      
      res.json(transcript);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transcript" });
    }
  });

  // Recording routes (case-based)
  app.get("/api/cases/:caseId/recordings", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const caseId = req.params.caseId;
      
      // Check if user can access this case
      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      if (user.role !== 'admin' && caseRecord.assignedTo !== user.id) {
        return res.status(403).json({ message: "Not authorized to view this case" });
      }
      
      const recordings = await storage.getRecordingsByCase(caseId);
      res.json(recordings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recordings" });
    }
  });

  app.get("/api/recordings/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const recording = await storage.getRecording(req.params.id);
      
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }
      
      // Check if user can access the case this recording belongs to
      let caseRecord;
      if (recording.assessmentId) {
        const assessment = await storage.getAssessment(recording.assessmentId);
        if (!assessment) {
          return res.status(404).json({ message: "Recording not found" });
        }
        caseRecord = await storage.getCase(assessment.caseId);
      } else {
        // Fallback for legacy recordings without assessmentId (though should not happen after migration)
        return res.status(404).json({ message: "Recording not found" });
      }
      
      if (!caseRecord || (user.role !== 'admin' && caseRecord.assignedTo !== user.id)) {
        return res.status(403).json({ message: "Not authorized to view this recording" });
      }
      
      res.json(recording);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recording" });
    }
  });

  // Get audio file for a recording
  app.get("/api/recordings/:id/audio", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const recordingId = req.params.id;
      
      // Get the recording
      const recording = await storage.getRecording(recordingId);
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }
      
      // Authorization: Only admin or case assigned user can access
      let caseRecord;
      if (recording.assessmentId) {
        const assessment = await storage.getAssessment(recording.assessmentId);
        if (!assessment) {
          return res.status(404).json({ message: "Recording not found" });
        }
        caseRecord = await storage.getCase(assessment.caseId);
      } else {
        // Fallback for legacy recordings without assessmentId (though should not happen after migration)
        return res.status(404).json({ message: "Recording not found" });
      }
      
      if (!caseRecord || (user.role !== "admin" && caseRecord.assignedTo !== user.id)) {
        return res.status(404).json({ message: "Recording not found" });
      }
      
      // Security: Sanitize and validate file path
      const filePath = recording.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Audio file not found" });
      }
      
      // Security: Ensure file is within uploads directory
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const requestedPath = path.resolve(filePath);
      
      try {
        const stats = fs.lstatSync(requestedPath);
        if (stats.isSymbolicLink()) {
          console.log(`[AUDIO] Security: Symlink blocked for: ${filePath}`);
          return res.status(404).json({ message: "Audio file not found" });
        }
        
        const realPath = fs.realpathSync(requestedPath);
        if (!realPath.startsWith(uploadsDir + path.sep) && realPath !== uploadsDir) {
          console.log(`[AUDIO] Security: Path traversal blocked for: ${filePath}`);
          return res.status(404).json({ message: "Audio file not found" });
        }
      } catch (error) {
        return res.status(404).json({ message: "Audio file not found" });
      }
      
      // Get file stats for content length and range support
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      
      // Set appropriate content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes: { [key: string]: string } = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.ogg': 'audio/ogg'
      };
      const contentType = contentTypes[ext] || 'application/octet-stream';
      
      // Handle range requests for audio scrubbing
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        
        res.status(206);
        res.set({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
        });
        
        const stream = fs.createReadStream(filePath, { start, end });
        stream.pipe(res);
      } else {
        // Regular file serving
        res.set({
          'Content-Length': fileSize.toString(),
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes'
        });
        
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
      }
      
    } catch (error) {
      console.error("Error serving audio:", error);
      res.status(500).json({ message: "Failed to serve audio file" });
    }
  });

  // Assessments routes
  app.get("/api/assessments", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      let assessments;
      
      if (user.role === 'admin') {
        // Admins can see all assessments
        assessments = await storage.getAllAssessments();
      } else {
        // Team members can only see assessments assigned to them
        assessments = await storage.getAssignmentsByUser(user.id);
      }
      
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  app.get("/api/cases/:caseId/assessments", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const allCaseAssessments = await storage.getAssessmentsByCase(req.params.caseId);
      
      let assessments;
      if (user.role === 'admin') {
        // Admins can see all assessments for the case
        assessments = allCaseAssessments;
      } else {
        // Team members can only see assessments assigned to them in this case
        assessments = allCaseAssessments.filter(assessment => assessment.assignedTo === user.id);
      }
      
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  app.get("/api/assessments/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const assessment = await storage.getAssessment(req.params.id);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Role-based access control
      if (user.role !== 'admin' && assessment.assignedTo !== user.id) {
        return res.status(403).json({ message: "Not authorized to view this assessment" });
      }
      
      res.json(assessment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assessment" });
    }
  });

  app.patch("/api/assessments/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const assessmentId = req.params.id;
      
      // DEBUG: Log the incoming request body
      console.log(`[PATCH] Assessment ${assessmentId} update request:`, JSON.stringify(req.body, null, 2));
      
      // Validate that the assessment exists
      const existingAssessment = await storage.getAssessment(assessmentId);
      if (!existingAssessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Role-based access control for updates
      if (user.role !== 'admin' && existingAssessment.assignedTo !== user.id) {
        return res.status(403).json({ message: "Not authorized to update this assessment" });
      }

      // ALL sections are now dynamic (except actionItems and system fields)
      const systemFields = ['actionItems', 'audioFilePath', 'processingStatus', 'template', 'caseId', 'assignedTo', 'title'];
      const updates: Partial<Assessment> = {};
      const dynamicSectionUpdates: Record<string, string> = {};
      
      // Process each field in request body
      for (const [field, value] of Object.entries(req.body)) {
        if (systemFields.includes(field)) {
          // System fields go directly to updates
          console.log(`[PATCH] Found system field '${field}' with value:`, value);
          (updates as any)[field] = value;
        } else {
          // Everything else is a dynamic section
          console.log(`[PATCH] Found dynamic section '${field}' with value:`, value);
          dynamicSectionUpdates[field] = value as string;
        }
      }
      
      // If we have dynamic section updates, merge with existing dynamic sections
      if (Object.keys(dynamicSectionUpdates).length > 0) {
        const existingDynamicSections = existingAssessment.dynamicSections || {};
        updates.dynamicSections = { ...existingDynamicSections, ...dynamicSectionUpdates };
        console.log(`[PATCH] Merged dynamic sections:`, updates.dynamicSections);
      }

      console.log(`[PATCH] Final updates object:`, JSON.stringify(updates, null, 2));

      if (Object.keys(updates).length === 0) {
        console.log(`[PATCH] No valid fields found in request body:`, Object.keys(req.body));
        console.log(`[PATCH] Valid system fields:`, systemFields);
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updatedAssessment = await storage.updateAssessment(assessmentId, updates);
      if (!updatedAssessment) {
        return res.status(500).json({ message: "Failed to update assessment" });
      }

      res.json(updatedAssessment);
    } catch (error) {
      console.error("Assessment update error:", error);
      res.status(500).json({ message: "Failed to update assessment" });
    }
  });

  app.post("/api/assessments", requireAuth, async (req, res) => {
    try {
      const validatedData = insertAssessmentSchema.parse(req.body);
      const assessment = await storage.createAssessment(validatedData);
      res.status(201).json(assessment);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Delete assessment (admin only)
  app.delete("/api/assessments/:id", requireAdmin, async (req, res) => {
    try {
      const assessmentId = req.params.id;
      
      // Check if assessment exists
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Delete the assessment
      const deleted = await storage.deleteAssessment(assessmentId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete assessment" });
      }
      
      res.json({ message: "Assessment deleted successfully" });
    } catch (error) {
      console.error("Assessment deletion error:", error);
      res.status(500).json({ message: "Failed to delete assessment" });
    }
  });

  // Chatbot routes for document editing assistance
  app.post("/api/chatbot/assist", requireAuth, async (req, res) => {
    try {
      const chatbotRequest: ChatbotRequest = req.body;
      
      // Validate request structure
      if (!chatbotRequest.message || !chatbotRequest.context) {
        return res.status(400).json({ message: "Message and context are required" });
      }

      const response = await getChatbotResponse(chatbotRequest);
      res.json(response);
    } catch (error) {
      console.error("Chatbot assist error:", error);
      res.status(500).json({ message: "Failed to get chatbot assistance" });
    }
  });

  app.post("/api/chatbot/suggestions", requireAuth, async (req, res) => {
    try {
      const { section, content } = req.body;
      
      if (!section || content === undefined) {
        return res.status(400).json({ message: "Section and content are required" });
      }

      const suggestions = await getContentSuggestions(section, content);
      res.json({ suggestions });
    } catch (error) {
      console.error("Content suggestions error:", error);
      res.status(500).json({ message: "Failed to get content suggestions" });
    }
  });

  // Deprecated routes - these have been replaced by case-based routes
  // Use /api/cases/:id/upload-audio for audio uploads
  // Use /api/cases/:id to check case and assessment status

  // New case-based audio upload route
  app.post("/api/cases/:id/upload-audio", requireAuth, upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const user = req.user!;
      const caseId = req.params.id;
      const caseRecord = await storage.getCase(caseId);
      
      if (!caseRecord) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Role-based access control - only assigned team member or admin can upload
      if (user.role !== 'admin' && caseRecord.assignedTo !== user.id) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: "Not authorized to upload audio for this case" });
      }

      const template = req.body.template || "General Care Assessments";
      const title = req.body.title || `Audio Recording - ${new Date().toLocaleDateString()}`;
      
      // This route is deprecated - case-based uploads should not create recordings without assessments
      // For now, create a temporary assessment to maintain backward compatibility
      const assessment = await storage.createAssessment({
        caseId: caseId,
        title: title.trim(),
        template: template,
        processingStatus: "processing",
        assignedTo: user.id,
        assignedBy: user.id,
      });
      
      // Create recording record linked to the assessment
      const recording = await storage.createRecording({
        assessmentId: assessment.id,
        fileName: req.file.originalname,
        filePath: req.file.path,
        processingStatus: "processing"
      });

      // Start async assessment-based processing using the new pipeline
      setTimeout(async () => {
        try {
          const { processAssessmentBasedWorkflow } = await import("./services/openai");
          await processAssessmentBasedWorkflow(assessment.id, recording.id, req.file!.path, template);
          await storage.updateRecording(recording.id, {
            processingStatus: "completed"
          });
        } catch (error) {
          console.error(`Assessment-based processing failed for assessment ${assessment.id}:`, error);
          await storage.updateRecording(recording.id, {
            processingStatus: "failed"
          });
        }
      }, 0);

      res.json({ 
        message: "Audio file uploaded successfully. Case-based processing started.",
        recordingId: recording.id,
        caseId: caseId
      });

    } catch (error) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: `Failed to upload audio: ${(error as Error).message}` });
    }
  });

  const httpServer = createServer(app);

  // Team management routes
  
  // Admin: Get team members (all users)
  app.get("/api/admin/team-members", requireAdmin, async (req, res) => {
    try {
      const teamMembers = await storage.getAllUsers();
      res.json(teamMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Admin: Get only team members (excluding admins)
  app.get("/api/admin/team-members-only", requireAdmin, async (req, res) => {
    try {
      const teamMembers = await storage.getTeamMembers();
      res.json(teamMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Admin: Update team member
  app.patch("/api/admin/team-member/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, role } = req.body;
      
      // Prevent updating own role to avoid locking out
      if (id === req.user!.id && role && role !== req.user!.role) {
        return res.status(400).json({ message: "Cannot change your own role" });
      }
      
      const updatedUser = await storage.updateUser(id, {
        firstName,
        lastName,
        email,
        role,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Team member updated successfully", user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  // Admin: Revoke team member access
  app.patch("/api/admin/revoke-access/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent revoking own access
      if (id === req.user!.id) {
        return res.status(400).json({ message: "Cannot revoke your own access" });
      }
      
      const revokedUser = await storage.revokeUserAccess(id);
      
      if (!revokedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User access revoked successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to revoke user access" });
    }
  });

  // Admin: Restore team member access
  app.patch("/api/admin/restore-access/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const restoredUser = await storage.restoreUserAccess(id);
      
      if (!restoredUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User access restored successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to restore user access" });
    }
  });

  // Admin: Delete team member
  app.delete("/api/admin/team-member/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting own account
      if (id === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Team member deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  // Assignment management routes
  
  // Admin: Assign assessment to team member
  app.post("/api/admin/assign-assessment", requireAdmin, async (req, res) => {
    try {
      console.log("[ASSIGN] Assignment request:", req.body);
      const assignmentData = req.body as AssignAssessment;
      const assignedBy = req.user!.id;
      
      console.log("[ASSIGN] Parsed assignment data:", { assignmentData, assignedBy });
      const assignment = await storage.assignAssessment(assignmentData, assignedBy);
      if (!assignment) {
        console.log("[ASSIGN] Assignment failed - assessment not found");
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      console.log("[ASSIGN] Assignment successful:", assignment.id, "assigned to", assignment.assignedTo);
      res.json({ message: "Assessment assigned successfully", assignment });
    } catch (error) {
      console.error("[ASSIGN] Assignment error:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Team member: Get my assigned assessments
  app.get("/api/my-assessments", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const assignments = await storage.getAssignmentsByUser(userId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Admin: Get unassigned assessments
  app.get("/api/admin/unassigned-assessments", requireAdmin, async (req, res) => {
    try {
      const unassignedAssessments = await storage.getUnassignedAssessments();
      console.log("[UNASSIGNED] Found", unassignedAssessments.length, "unassigned assessments");
      res.json(unassignedAssessments);
    } catch (error) {
      console.error("[UNASSIGNED] Error fetching unassigned assessments:", error);
      res.status(500).json({ message: "Failed to fetch unassigned assessments" });
    }
  });

  // Team member: Update assignment status  
  app.patch("/api/assignment/:id/status", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;
      
      console.log("[STATUS] Status update request:", { id, status, userId });
      
      // Check if this assessment is assigned to the current user or user is admin
      const assessment = await storage.getAssessment(id);
      if (!assessment) {
        console.log("[STATUS] Assessment not found:", id);
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      if (assessment.assignedTo !== userId && req.user!.role !== "admin") {
        console.log("[STATUS] Unauthorized update attempt:", { assignedTo: assessment.assignedTo, requesterId: userId, role: req.user!.role });
        return res.status(403).json({ message: "Not authorized to update this assessment" });
      }
      
      const updatedAssessment = await storage.updateAssignmentStatus(id, status);
      if (!updatedAssessment) {
        console.log("[STATUS] Failed to update assignment status in storage");
        return res.status(500).json({ message: "Failed to update assignment status" });
      }
      
      console.log("[STATUS] Status updated successfully:", updatedAssessment.id, "status:", updatedAssessment.assignmentStatus);
      res.json({ message: "Assignment status updated", assessment: updatedAssessment });
    } catch (error) {
      console.error("[STATUS] Status update error:", error);
      res.status(500).json({ message: "Failed to update assignment status" });
    }
  });

  // Enhanced Assignment Management APIs
  
  // Admin: Get all assigned assessments with filters
  app.get("/api/admin/assignments", requireAdmin, async (req, res) => {
    try {
      const filters = req.query as AssignmentFilters;
      const assignments = await storage.getAssignedAssessments(filters);
      res.json(assignments);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.message });
      }
      console.error("[ASSIGNMENTS] Error fetching assigned assessments:", error);
      res.status(500).json({ message: "Failed to fetch assigned assessments" });
    }
  });

  // Admin: Reassign assessment to different team member
  app.patch("/api/admin/assignment/:id/reassign", requireAdmin, async (req, res) => {
    try {
      const assessmentId = req.params.id;
      const { newAssigneeId } = req.body as ReassignAssessment;
      const reassignedBy = req.user!.id;

      console.log("[REASSIGN] Reassignment request:", { assessmentId, newAssigneeId, reassignedBy });

      // Verify assessment exists
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Verify new assignee exists and is an active team member
      const newAssignee = await storage.getUser(newAssigneeId);
      if (!newAssignee || newAssignee.role !== 'team_member' || !newAssignee.isActive) {
        return res.status(400).json({ message: "Invalid assignee - must be an active team member" });
      }

      const updatedAssessment = await storage.reassignAssessment(assessmentId, newAssigneeId, reassignedBy);
      if (!updatedAssessment) {
        return res.status(500).json({ message: "Failed to reassign assessment" });
      }

      console.log("[REASSIGN] Assessment reassigned successfully:", assessmentId, "to", newAssigneeId);
      res.json({ message: "Assessment reassigned successfully", assessment: updatedAssessment });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request body", errors: error.message });
      }
      console.error("[REASSIGN] Reassignment error:", error);
      res.status(500).json({ message: "Failed to reassign assessment" });
    }
  });

  // Admin: Unassign assessment (make it unassigned)
  app.patch("/api/admin/assignment/:id/unassign", requireAdmin, async (req, res) => {
    try {
      const assessmentId = req.params.id;
      const unassignedBy = req.user!.id;

      console.log("[UNASSIGN] Unassignment request:", { assessmentId, unassignedBy });

      // Verify assessment exists
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const updatedAssessment = await storage.unassignAssessment(assessmentId, unassignedBy);
      if (!updatedAssessment) {
        return res.status(500).json({ message: "Failed to unassign assessment" });
      }

      console.log("[UNASSIGN] Assessment unassigned successfully:", assessmentId);
      res.json({ message: "Assessment unassigned successfully", assessment: updatedAssessment });
    } catch (error) {
      console.error("[UNASSIGN] Unassignment error:", error);
      res.status(500).json({ message: "Failed to unassign assessment" });
    }
  });

  // Admin: Get assignment statistics per team member
  app.get("/api/admin/assignment-stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAssignmentStatsPerMember();
      res.json(stats);
    } catch (error) {
      console.error("[STATS] Error fetching assignment statistics:", error);
      res.status(500).json({ message: "Failed to fetch assignment statistics" });
    }
  });

  // Template routes
  app.get("/api/templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", requireAdmin, async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(validatedData, req.user!.id);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid template data" });
      }
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/templates/:id", requireAdmin, async (req, res) => {
    try {
      const validatedData = updateTemplateSchema.parse(req.body);
      const template = await storage.updateTemplate(req.params.id, validatedData);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid template data" });
      }
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Report generation routes
  app.get("/api/reports/overview", requireAuth, async (req, res) => {
    try {
      const timeRange = req.query.timeRange as string || "30";
      const days = parseInt(timeRange);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get all assessments and cases
      const assessments = await storage.getAllAssessments();
      const cases = await storage.getAllCases();
      const users = await storage.getAllUsers();
      
      // Filter assessments by time range
      const filteredAssessments = assessments.filter(a => 
        new Date(a.createdAt) >= startDate
      );
      
      // Calculate statistics
      const totalAssessments = filteredAssessments.length;
      const completedAssessments = filteredAssessments.filter(a => a.processingStatus === 'completed').length;
      const pendingAssessments = filteredAssessments.filter(a => a.processingStatus === 'pending').length;
      const processingAssessments = filteredAssessments.filter(a => a.processingStatus === 'processing').length;
      const failedAssessments = filteredAssessments.filter(a => a.processingStatus === 'failed').length;
      
      const completionRate = totalAssessments > 0 ? Math.round((completedAssessments / totalAssessments) * 100) : 0;
      
      // Calculate trends (weekly breakdown for charts)
      const weeklyCounts = [];
      for (let i = 0; i < Math.min(days / 7, 4); i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        
        const weeklyAssessments = filteredAssessments.filter(a => {
          const date = new Date(a.createdAt);
          return date >= weekStart && date < weekEnd;
        }).length;
        
        weeklyCounts.push({
          week: `Week ${i + 1}`,
          count: weeklyAssessments
        });
      }
      
      // Performance by user
      const userPerformance = users.map(user => {
        const userAssessments = filteredAssessments.filter(a => a.assignedTo === user.id);
        const userCompleted = userAssessments.filter(a => a.processingStatus === 'completed').length;
        
        return {
          name: `${user.firstName} ${user.lastName}`,
          total: userAssessments.length,
          completed: userCompleted,
          completionRate: userAssessments.length > 0 ? Math.round((userCompleted / userAssessments.length) * 100) : 0
        };
      }).filter(u => u.total > 0);
      
      // Average processing time (for completed assessments)
      const completedWithTimes = filteredAssessments.filter(a => 
        a.processingStatus === 'completed' && a.completedAt && a.createdAt
      );
      
      const avgProcessingHours = completedWithTimes.length > 0 ? 
        completedWithTimes.reduce((sum, a) => {
          const hours = (new Date(a.completedAt!).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / completedWithTimes.length : 0;
      
      const report = {
        title: "Assessment Overview Report",
        timeRange: `Last ${days} days`,
        generatedAt: new Date().toISOString(),
        summary: {
          totalAssessments,
          completedAssessments,
          pendingAssessments,
          processingAssessments,
          failedAssessments,
          completionRate,
          averageProcessingTime: Math.round(avgProcessingHours * 10) / 10 // round to 1 decimal
        },
        trends: {
          weeklyActivity: weeklyCounts.reverse(), // Most recent first
          statusBreakdown: [
            { status: "Completed", count: completedAssessments, percentage: totalAssessments > 0 ? Math.round((completedAssessments / totalAssessments) * 100) : 0 },
            { status: "Pending", count: pendingAssessments, percentage: totalAssessments > 0 ? Math.round((pendingAssessments / totalAssessments) * 100) : 0 },
            { status: "Processing", count: processingAssessments, percentage: totalAssessments > 0 ? Math.round((processingAssessments / totalAssessments) * 100) : 0 },
            { status: "Failed", count: failedAssessments, percentage: totalAssessments > 0 ? Math.round((failedAssessments / totalAssessments) * 100) : 0 }
          ]
        },
        performance: {
          userPerformance: userPerformance.sort((a, b) => b.completionRate - a.completionRate),
          topPerformers: userPerformance.sort((a, b) => b.completed - a.completed).slice(0, 3)
        }
      };
      
      res.json(report);
    } catch (error) {
      console.error("Error generating overview report:", error);
      res.status(500).json({ message: "Failed to generate overview report" });
    }
  });

  app.get("/api/reports/cases", requireAuth, async (req, res) => {
    try {
      const timeRange = req.query.timeRange as string || "30";
      const days = parseInt(timeRange);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get all cases, assessments, and users
      const cases = await storage.getAllCases();
      const assessments = await storage.getAllAssessments();
      const users = await storage.getAllUsers();
      
      // Filter cases by time range
      const filteredCases = cases.filter(c => 
        new Date(c.createdAt) >= startDate
      );
      
      // Calculate case statistics
      const totalCases = filteredCases.length;
      const activeCases = filteredCases.filter(c => c.status === 'active').length;
      const completedCases = filteredCases.filter(c => c.status === 'completed').length;
      const archivedCases = filteredCases.filter(c => c.status === 'archived').length;
      
      // Cases with multiple assessments
      const casesWithMultipleAssessments = filteredCases.filter(c => {
        const caseAssessments = assessments.filter(a => a.caseId === c.id);
        return caseAssessments.length > 1;
      }).length;
      
      // Average assessments per case
      const totalAssessmentsForCases = filteredCases.reduce((sum, c) => {
        const caseAssessments = assessments.filter(a => a.caseId === c.id);
        return sum + caseAssessments.length;
      }, 0);
      
      const avgAssessmentsPerCase = totalCases > 0 ? Math.round((totalAssessmentsForCases / totalCases) * 10) / 10 : 0;
      
      // Case assignment breakdown
      const assignmentBreakdown = users.map(user => {
        const userCases = filteredCases.filter(c => c.assignedTo === user.id);
        const userActiveCases = userCases.filter(c => c.status === 'active').length;
        
        return {
          name: `${user.firstName} ${user.lastName}`,
          totalCases: userCases.length,
          activeCases: userActiveCases,
          completedCases: userCases.filter(c => c.status === 'completed').length
        };
      }).filter(u => u.totalCases > 0);
      
      // Case status trends
      const statusBreakdown = [
        { status: "Active", count: activeCases, percentage: totalCases > 0 ? Math.round((activeCases / totalCases) * 100) : 0 },
        { status: "Completed", count: completedCases, percentage: totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0 },
        { status: "Archived", count: archivedCases, percentage: totalCases > 0 ? Math.round((archivedCases / totalCases) * 100) : 0 }
      ];
      
      // Cases by creation date (daily for last week, weekly for longer periods)
      const dateGroups = [];
      if (days <= 7) {
        // Daily breakdown for last week
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
          
          const dailyCases = filteredCases.filter(c => {
            const caseDate = new Date(c.createdAt);
            return caseDate >= dayStart && caseDate < dayEnd;
          }).length;
          
          dateGroups.push({
            period: dayStart.toLocaleDateString(),
            count: dailyCases
          });
        }
      } else {
        // Weekly breakdown for longer periods
        for (let i = 0; i < Math.min(days / 7, 4); i++) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
          const weekEnd = new Date();
          weekEnd.setDate(weekEnd.getDate() - i * 7);
          
          const weeklyCases = filteredCases.filter(c => {
            const date = new Date(c.createdAt);
            return date >= weekStart && date < weekEnd;
          }).length;
          
          dateGroups.push({
            period: `Week ${i + 1}`,
            count: weeklyCases
          });
        }
      }
      
      const report = {
        title: "Case Management Report",
        timeRange: `Last ${days} days`,
        generatedAt: new Date().toISOString(),
        summary: {
          totalCases,
          activeCases,
          completedCases,
          archivedCases,
          casesWithMultipleAssessments,
          avgAssessmentsPerCase
        },
        breakdown: {
          statusDistribution: statusBreakdown,
          assignmentBreakdown: assignmentBreakdown.sort((a, b) => b.totalCases - a.totalCases),
          activityTrends: dateGroups.reverse() // Most recent first
        },
        insights: {
          mostActiveCaseWorker: assignmentBreakdown.sort((a, b) => b.activeCases - a.activeCases)[0] || null,
          mostProductiveCaseWorker: assignmentBreakdown.sort((a, b) => b.completedCases - a.completedCases)[0] || null
        }
      };
      
      res.json(report);
    } catch (error) {
      console.error("Error generating case management report:", error);
      res.status(500).json({ message: "Failed to generate case management report" });
    }
  });

  // Initialize default templates
  await initializeDefaultTemplates();

  // Protect existing routes that should require authentication
  app.use("/api/cases", requireAuth);

  return httpServer;
}

// Initialize default templates
async function initializeDefaultTemplates() {
  try {
    const existingTemplates = await storage.getAllTemplates();
    
    // If no templates exist, create the default General Care Assessment template
    if (existingTemplates.length === 0) {
      // Get the first admin user to use as creator
      const adminUsers = await storage.getAllUsers();
      const adminUser = adminUsers.find(user => user.role === 'admin');
      
      if (adminUser) {
        await storage.createTemplate({
          name: "General Care Assessment",
          description: "Standard care assessment covering all basic areas",
          sections: ["Overview", "Nutrition", "Hygiene", "Home Environment", "Action Items"],
          status: "active",
          priority: "standard"
        }, adminUser.id);
        
        console.log("✅ Default template created");
      } else {
        console.log("⚠️ No admin user found, skipping template creation");
      }
    }
  } catch (error) {
    console.error("❌ Error initializing default templates:", error);
  }
}
