import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto"; // Assuming crypto is available in the environment

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password"),
  role: text("role").notNull().default("team_member"), // admin, team_member
  invitationToken: text("invitation_token"),
  invitationStatus: text("invitation_status").default("pending"), // pending, accepted, expired
  invitedAt: timestamp("invited_at"),
  invitedBy: varchar("invited_by"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isActive: integer("is_active").default(1),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientName: text("client_name").notNull(), // Keep existing column name for now
  address: text("address"), // Will be added
  caseDetails: text("case_details"), // Optional details
  assignedTo: varchar("assigned_to").references(() => users.id), // Will be added
  assignedAt: timestamp("assigned_at"),
  createdBy: varchar("created_by").references(() => users.id), // Will be added - Admin who created the case
  status: text("status").notNull().default("active"), // active, completed, archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enhanced transcript types
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  speakerRole?: string; // Role information for proper icon display
}

export interface EnhancedTranscript {
  text: string;
  segments: TranscriptSegment[];
  speakers: string[];
  speakerRoles: { [speaker: string]: string }; // Map speaker names to their roles
  conversationFormat?: string; // Generated conversation format for better readability
}

// Assessments table - moved up to avoid circular references
export const assessments = pgTable("assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  title: text("title").notNull(),
  template: text("template").notNull().default("General Care Assessments"),
  actionItems: jsonb("action_items").$type<string[]>(),
  dynamicSections: jsonb("dynamic_sections").$type<Record<string, string>>(), // ALL assessment content stored here as JSON
  processingStatus: text("processing_status").default("pending"), // pending, processing, completed, failed
  assignedTo: varchar("assigned_to").references(() => users.id), // Team member assigned to this assessment
  assignedAt: timestamp("assigned_at"),
  assignedBy: varchar("assigned_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Legacy fields for migration - will be deprecated
  transcriptId: varchar("transcript_id"), // Legacy - will be removed
  transcriptText: text("transcript_text"),
  enhancedTranscript: jsonb("enhanced_transcript").$type<EnhancedTranscript>(),
  audioFileName: text("audio_file_name"),
  audioFilePath: text("audio_file_path"),
  assignmentStatus: text("assignment_status").default("assigned"),
  assignmentNotes: text("assignment_notes"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
});

// Recordings table - now linked to assessments as primary relationship
export const recordings = pgTable("recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").references(() => assessments.id).notNull(), // Primary relationship to assessment
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  duration: integer("duration"), // in seconds
  processingStatus: text("processing_status").default("pending"), // pending, transcribing, generating_conversation, generating_assessment, processing, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transcripts = pgTable("transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(), // Required for database constraint
  assessmentId: varchar("assessment_id").references(() => assessments.id), // Assessment relationship
  recordingId: varchar("recording_id").references(() => recordings.id),
  rawTranscript: text("raw_transcript").notNull(), // Raw OpenAI transcript
  enhancedTranscript: jsonb("enhanced_transcript").$type<EnhancedTranscript>(), // Conversation format
  processingStatus: text("processing_status").default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Templates table for assessment template management
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sections: jsonb("sections").$type<string[]>().notNull(),
  status: text("status").notNull().default("active"), // active, draft, archived
  priority: text("priority").notNull().default("standard"), // standard, high, low
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// assessments table moved up above recordings

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  role: true,
  firstName: true,
  lastName: true,
});

// Schema for user invitations
export const inviteUserSchema = createInsertSchema(users).pick({
  email: true,
  role: true,
  firstName: true,
  lastName: true,
});

// Schema for creating local team members (no email/invitation required)
export const createLocalUserSchema = createInsertSchema(users).pick({
  username: true,
  firstName: true,
  lastName: true,
  role: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Schema for accepting invitations
export const acceptInvitationSchema = z.object({
  token: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Updated login schema to support email OR username
export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertCaseSchema = createInsertSchema(cases).pick({
  clientName: true,
  address: true,
  caseDetails: true,
  assignedTo: true,
  status: true,
});

export const insertAssessmentSchema = createInsertSchema(assessments).pick({
  caseId: true,
  title: true,
  template: true,
  actionItems: true,
  dynamicSections: true,
  processingStatus: true,
  assignedTo: true,
  assignedBy: true,
  assignmentNotes: true,
  dueDate: true,
});

// Schema for creating assessment with audio recording
export const createAssessmentSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  title: z.string().min(1, "Assessment title is required"),
  template: z.string().default("General Care Assessments"),
  assignmentNotes: z.string().optional(),
});

// Schema for case assignment operations
export const assignCaseSchema = z.object({
  caseId: z.string(),
  assignedTo: z.string(),
});

export const reassignCaseSchema = z.object({
  newAssigneeId: z.string(),
});

export const caseFiltersSchema = z.object({
  assigneeId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

// Case creation with assignment
export const createCaseSchema = z.object({
  caseName: z.string().min(1, "Case name is required"),
  address: z.string().min(1, "Address is required"),
  caseDetails: z.string().optional(),
  assignedTo: z.string().min(1, "Team member assignment is required"),
});

export const insertRecordingSchema = createInsertSchema(recordings).pick({
  assessmentId: true, // Primary relationship to assessment
  fileName: true,
  filePath: true,
  duration: true,
  processingStatus: true,
});

export const insertTranscriptSchema = createInsertSchema(transcripts).pick({
  caseId: true, // Required for database constraint
  assessmentId: true, // Primary relationship to assessment
  recordingId: true,
  rawTranscript: true,
  enhancedTranscript: true,
  processingStatus: true,
});

export const insertTemplateSchema = createInsertSchema(templates).pick({
  name: true,
  description: true,
  sections: true,
  status: true,
  priority: true,
});

export const updateTemplateSchema = createInsertSchema(templates).pick({
  name: true,
  description: true,
  sections: true,
  status: true,
  priority: true,
}).partial();

// Profile update schema
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
});

// Password change schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InviteUser = z.infer<typeof inviteUserSchema>;
export type CreateLocalUser = z.infer<typeof createLocalUserSchema>;
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>;
export type LoginForm = z.infer<typeof loginSchema>;

export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;
export type CreateCase = z.infer<typeof createCaseSchema>;
export type AssignCase = z.infer<typeof assignCaseSchema>;
export type ReassignCase = z.infer<typeof reassignCaseSchema>;
export type CaseFilters = z.infer<typeof caseFiltersSchema>;

export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type Transcript = typeof transcripts.$inferSelect;

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;
export type UpdateTemplate = z.infer<typeof updateTemplateSchema>;

export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessments.$inferSelect;
export type CreateAssessment = z.infer<typeof createAssessmentSchema>;

export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordings.$inferSelect;

export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;

// Legacy types for migration
export type AssignAssessment = { assessmentId: string; assignedTo: string; };
export type ReassignAssessment = { newAssigneeId: string; };
export type AssignmentFilters = { assigneeId?: string; status?: string; search?: string; };