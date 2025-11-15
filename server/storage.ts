import { users, cases, assessments, recordings, transcripts, templates, type User, type InsertUser, type InviteUser, type CreateLocalUser, type AcceptInvitation, type AssignAssessment, type Case, type InsertCase, type Assessment, type InsertAssessment, type Recording, type InsertRecording, type Transcript, type InsertTranscript, type Template, type InsertTemplate, type UpdateTemplate, type EnhancedTranscript } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, or, sql, not, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByIdentifier(identifier: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Invitation methods
  createUserInvitation(inviteData: InviteUser, invitedBy: string): Promise<User>;
  getUserByInvitationToken(token: string): Promise<User | undefined>;
  acceptInvitation(acceptData: AcceptInvitation): Promise<User | undefined>;
  
  // Local user creation (no email/invitation required)
  createLocalUser(localUserData: CreateLocalUser, createdBy: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  revokeUserAccess(id: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getTeamMembers(): Promise<User[]>;
  
  // Password reset methods
  setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: string): Promise<User | undefined>;
  
  // Assignment methods
  assignAssessment(assignmentData: AssignAssessment, assignedBy: string): Promise<Assessment | undefined>;
  getAssignmentsByUser(userId: string): Promise<Assessment[]>;
  getUnassignedAssessments(): Promise<Assessment[]>;
  updateAssignmentStatus(assessmentId: string, status: string): Promise<Assessment | undefined>;
  
  // Enhanced assignment management methods
  getAssignedAssessments(filters?: { assigneeId?: string; status?: string; search?: string }): Promise<any[]>;
  reassignAssessment(assessmentId: string, newAssigneeId: string, reassignedBy: string): Promise<Assessment | undefined>;
  unassignAssessment(assessmentId: string, unassignedBy: string): Promise<Assessment | undefined>;
  getAssignmentStatsPerMember(): Promise<any[]>;

  // Case methods
  getAllCases(): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  getCaseByClientName(clientName: string): Promise<Case | undefined>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, updates: Partial<Case>): Promise<Case | undefined>;
  unassignCase(caseId: string): Promise<Case | undefined>;
  deleteCase(id: string): Promise<boolean>;

  // Assessment methods
  getAssessmentsByCase(caseId: string): Promise<Assessment[]>;
  getAssessment(id: string): Promise<Assessment | undefined>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment | undefined>;
  getAllAssessments(): Promise<Assessment[]>;

  // Recording methods
  getRecordingsByAssessment(assessmentId: string): Promise<Recording[]>;
  getRecordingsByCase(caseId: string): Promise<Recording[]>;
  getRecording(id: string): Promise<Recording | undefined>;
  getRecordingByFilename(filename: string): Promise<Recording | undefined>;
  createRecording(recording: InsertRecording): Promise<Recording>;
  updateRecording(id: string, updates: Partial<Recording>): Promise<Recording | undefined>;
  
  // Transcript methods
  getTranscriptsByCase(caseId: string): Promise<Transcript[]>;
  getTranscriptsByAssessment(assessmentId: string): Promise<Transcript[]>;
  getTranscript(id: string): Promise<Transcript | undefined>;
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;
  updateTranscript(id: string, updates: Partial<Transcript>): Promise<Transcript | undefined>;
  deleteTranscript(id: string): Promise<boolean>;

  // Template methods
  getAllTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  getTemplateByName(name: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate, createdBy: string): Promise<Template>;
  updateTemplate(id: string, updates: UpdateTemplate): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  // New method to support both email and username authentication
  async getUserByIdentifier(identifier: string): Promise<User | undefined> {
    // Check if identifier looks like an email
    const isEmail = identifier.includes('@');
    
    if (isEmail) {
      return this.getUserByEmail(identifier);
    } else {
      return this.getUserByUsername(identifier);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Invitation methods
  async createUserInvitation(inviteData: InviteUser, invitedBy: string): Promise<User> {
    const invitationToken = randomUUID();
    const now = new Date();
    
    const [user] = await db
      .insert(users)
      .values({
        username: inviteData.email || "temp", // Temporary username, will be set when invitation is accepted
        email: inviteData.email || null,
        password: null, // Will be set when invitation is accepted
        role: inviteData.role || "team_member",
        invitationToken,
        invitationStatus: "pending",
        invitedAt: now,
        invitedBy,
        firstName: inviteData.firstName || null,
        lastName: inviteData.lastName || null,
        isActive: 1,
      })
      .returning();
    
    return user;
  }

  async getUserByInvitationToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.invitationToken, token), eq(users.invitationStatus, "pending")));
    return user || undefined;
  }

  async acceptInvitation(acceptData: AcceptInvitation): Promise<User | undefined> {
    const user = await this.getUserByInvitationToken(acceptData.token);
    if (!user) return undefined;
    
    const [updatedUser] = await db
      .update(users)
      .set({
        username: user.email || user.username || "user", // Use email as username
        password: acceptData.password,
        invitationStatus: "accepted",
        invitationToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();
    
    return updatedUser;
  }

  // New method for creating local team members (no email/invitation required)
  async createLocalUser(localUserData: CreateLocalUser, createdBy: string): Promise<User> {
    const now = new Date();
    
    // Check if username already exists
    const existingUser = await this.getUserByUsername(localUserData.username);
    if (existingUser) {
      throw new Error("Username already exists");
    }
    
    const [user] = await db
      .insert(users)
      .values({
        username: localUserData.username,
        email: null, // Local users don't have email
        password: localUserData.password, // Password is already hashed
        role: localUserData.role || "team_member",
        firstName: localUserData.firstName || null,
        lastName: localUserData.lastName || null,
        invitationStatus: "accepted", // Local users are immediately active
        invitationToken: null,
        invitedBy: createdBy,
        invitedAt: now,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async revokeUserAccess(id: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        isActive: 0, 
        invitationStatus: "revoked",
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async restoreUserAccess(id: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        isActive: 1, 
        invitationStatus: "accepted",
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Use a transaction to ensure all-or-nothing deletion
    try {
      // First, nullify all foreign key references to this user
      
      // Update cases where user is assigned
      await db
        .update(cases)
        .set({ assignedTo: null })
        .where(eq(cases.assignedTo, id));
      
      // Update cases created by this user
      await db
        .update(cases)
        .set({ createdBy: null })
        .where(eq(cases.createdBy, id));
      
      // Update assessments where this user is the assignee
      await db
        .update(assessments)
        .set({ assignedTo: null })
        .where(eq(assessments.assignedTo, id));
      
      // Update assessments where this user is the assigner
      await db
        .update(assessments)
        .set({ assignedBy: null })
        .where(eq(assessments.assignedBy, id));
      
      // Update templates created by this user
      await db
        .update(templates)
        .set({ createdBy: null })
        .where(eq(templates.createdBy, id));
      
      // Now delete the user
      const result = await db
        .delete(users)
        .where(eq(users.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async getTeamMembers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.role, "team_member"), eq(users.isActive, 1)))
      .orderBy(desc(users.createdAt));
  }

  // Password reset methods
  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expires,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();
    return updatedUser || undefined;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async clearPasswordResetToken(userId: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  // Case methods
  async getAllCases(): Promise<Case[]> {
    return await db
      .select()
      .from(cases)
      .orderBy(desc(cases.createdAt));
  }

  async getCase(id: string): Promise<Case | undefined> {
    const [case_] = await db.select().from(cases).where(eq(cases.id, id));
    return case_ || undefined;
  }

  async getCaseByClientName(clientName: string): Promise<Case | undefined> {
    const [case_] = await db
      .select()
      .from(cases)
      .where(eq(cases.clientName, clientName));
    return case_ || undefined;
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const [case_] = await db
      .insert(cases)
      .values(caseData)
      .returning();
    return case_;
  }

  async unassignCase(caseId: string): Promise<Case | undefined> {
    const [updated] = await db
      .update(cases)
      .set({
        assignedTo: null,
        assignedAt: null,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(cases.id, caseId))
      .returning();
    return updated || undefined;
  }

  async updateCase(id: string, updates: Partial<Case>): Promise<Case | undefined> {
    const [updatedCase] = await db
      .update(cases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return updatedCase || undefined;
  }

  // Assessment methods
  async getAssessmentsByCase(caseId: string): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(eq(assessments.caseId, caseId))
      .orderBy(desc(assessments.createdAt));
  }

  async getAssessment(id: string): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment || undefined;
  }

  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    const [created] = await db
      .insert(assessments)
      .values(assessment)
      .returning();
    return created;
  }

  async updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment | undefined> {
    const [updatedAssessment] = await db
      .update(assessments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assessments.id, id))
      .returning();
    return updatedAssessment || undefined;
  }

  async deleteAssessment(id: string): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        // 1. Clear transcriptId from the assessment first (legacy field)
        await tx
          .update(assessments)
          .set({ transcriptId: null })
          .where(eq(assessments.id, id));
        
        // 2. Delete transcripts related to this assessment
        await tx
          .delete(transcripts)
          .where(eq(transcripts.assessmentId, id));
        
        // 5. Delete recordings related to this assessment
        await tx
          .delete(recordings)
          .where(eq(recordings.assessmentId, id));
        
        // 6. Finally, delete the assessment itself
        const result = await tx
          .delete(assessments)
          .where(eq(assessments.id, id));
        
        return result.rowCount ? result.rowCount > 0 : false;
      });
    } catch (error) {
      console.error("Assessment deletion error:", error);
      return false;
    }
  }

  async getAllAssessments(): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .orderBy(desc(assessments.createdAt));
  }

  // Recording methods
  async getRecordingsByAssessment(assessmentId: string): Promise<Recording[]> {
    return await db
      .select()
      .from(recordings)
      .where(eq(recordings.assessmentId, assessmentId))
      .orderBy(desc(recordings.createdAt));
  }

  async getRecording(id: string): Promise<Recording | undefined> {
    const [recording] = await db.select().from(recordings).where(eq(recordings.id, id));
    return recording || undefined;
  }

  async getRecordingByFilename(filename: string): Promise<Recording | undefined> {
    const [recording] = await db.select().from(recordings).where(eq(recordings.fileName, filename));
    return recording || undefined;
  }

  async createRecording(recording: InsertRecording): Promise<Recording> {
    const [created] = await db
      .insert(recordings)
      .values([recording])
      .returning();
    return created;
  }

  async updateRecording(id: string, updates: Partial<Recording>): Promise<Recording | undefined> {
    const [updatedRecording] = await db
      .update(recordings)
      .set(updates)
      .where(eq(recordings.id, id))
      .returning();
    return updatedRecording || undefined;
  }

  // Assignment methods
  async assignAssessment(assignmentData: AssignAssessment, assignedBy: string): Promise<Assessment | undefined> {
    const [updated] = await db
      .update(assessments)
      .set({
        assignedTo: assignmentData.assignedTo,
        assignmentStatus: "assigned",
        assignedAt: new Date(),
        assignedBy,
        dueDate: null, // Will be handled by case assignment
        assignmentNotes: null, // Will be handled by case assignment
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assignmentData.assessmentId))
      .returning();
    return updated || undefined;
  }

  async getAssignmentsByUser(userId: string): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(eq(assessments.assignedTo, userId))
      .orderBy(desc(assessments.createdAt));
  }

  async getUnassignedAssessments(): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(and(
        eq(assessments.assignmentStatus, "unassigned"),
        or(
          isNull(assessments.assignedTo),
          eq(assessments.assignedTo, "")
        )
      ))
      .orderBy(desc(assessments.createdAt));
  }

  async updateAssignmentStatus(assessmentId: string, status: string): Promise<Assessment | undefined> {
    const updates: any = {
      assignmentStatus: status,
      updatedAt: new Date(),
    };
    
    if (status === "completed") {
      updates.completedAt = new Date();
    }
    
    const [updated] = await db
      .update(assessments)
      .set(updates)
      .where(eq(assessments.id, assessmentId))
      .returning();
    return updated || undefined;
  }

  // Enhanced assignment management methods
  async getAssignedAssessments(filters?: { assigneeId?: string; status?: string; search?: string }): Promise<any[]> {
    // Build where conditions - get all assessments that have been assigned
    const whereConditions = [
      not(isNull(assessments.assignedTo)),
      not(eq(assessments.assignedTo, ""))
    ];

    // Apply filters
    if (filters?.assigneeId) {
      whereConditions.push(eq(assessments.assignedTo, filters.assigneeId));
    }
    
    // Allow filtering by any assignment status (assigned, in_progress, completed, etc.)
    if (filters?.status) {
      whereConditions.push(eq(assessments.assignmentStatus, filters.status));
    } else {
      // Default to showing only assigned and in_progress if no status filter provided
      const statusCondition = or(
        eq(assessments.assignmentStatus, "assigned"),
        eq(assessments.assignmentStatus, "in_progress")
      );
      if (statusCondition) {
        whereConditions.push(statusCondition);
      }
    }

    const results = await db
      .select({
        id: assessments.id,
        title: assessments.title,
        assignmentStatus: assessments.assignmentStatus,
        assignedAt: assessments.assignedAt,
        dueDate: assessments.dueDate,
        assignmentNotes: assessments.assignmentNotes,
        processingStatus: assessments.processingStatus,
        createdAt: assessments.createdAt,
        assigneeName: users.firstName,
        assigneeLastName: users.lastName,
        assigneeEmail: users.email,
        assigneeId: users.id,
        caseName: cases.clientName,
        caseId: cases.id,
      })
      .from(assessments)
      .leftJoin(users, eq(assessments.assignedTo, users.id))
      .leftJoin(cases, eq(assessments.caseId, cases.id))
      .where(and(...whereConditions))
      .orderBy(desc(assessments.assignedAt));
    
    // Apply search filter in memory for simplicity
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      return results.filter(item => 
        item.title?.toLowerCase().includes(searchTerm) ||
        item.caseName?.toLowerCase().includes(searchTerm) ||
        item.assigneeName?.toLowerCase().includes(searchTerm) ||
        item.assigneeLastName?.toLowerCase().includes(searchTerm)
      );
    }

    return results;
  }

  async reassignAssessment(assessmentId: string, newAssigneeId: string, reassignedBy: string): Promise<Assessment | undefined> {
    const [updated] = await db
      .update(assessments)
      .set({
        assignedTo: newAssigneeId,
        assignedBy: reassignedBy,
        assignedAt: new Date(),
        assignmentStatus: "assigned", // Ensure status is set to assigned
        completedAt: null, // Clear completion date if reassigning
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessmentId))
      .returning();
    return updated || undefined;
  }

  async unassignAssessment(assessmentId: string, unassignedBy: string): Promise<Assessment | undefined> {
    const [updated] = await db
      .update(assessments)
      .set({
        assignedTo: null,
        assignmentStatus: "unassigned",
        assignedBy: unassignedBy,
        assignedAt: null,
        dueDate: null,
        assignmentNotes: null,
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessmentId))
      .returning();
    return updated || undefined;
  }

  async getAssignmentStatsPerMember(): Promise<any[]> {
    const stats = await db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        totalAssigned: sql<number>`COUNT(${assessments.id})`.as('total_assigned'),
        pending: sql<number>`SUM(CASE WHEN ${assessments.assignmentStatus} = 'assigned' THEN 1 ELSE 0 END)`.as('pending'),
        inProgress: sql<number>`SUM(CASE WHEN ${assessments.assignmentStatus} = 'in_progress' THEN 1 ELSE 0 END)`.as('in_progress'),
        completed: sql<number>`SUM(CASE WHEN ${assessments.assignmentStatus} = 'completed' THEN 1 ELSE 0 END)`.as('completed'),
      })
      .from(users)
      .leftJoin(assessments, eq(users.id, assessments.assignedTo))
      .where(eq(users.role, 'team_member'))
      .groupBy(users.id, users.firstName, users.lastName, users.email);

    return stats;
  }

  // Transcript methods
  async getTranscriptsByCase(caseId: string): Promise<Transcript[]> {
    // Get all assessments for the case, then get their transcripts
    const caseAssessments = await db
      .select({ id: assessments.id })
      .from(assessments)
      .where(eq(assessments.caseId, caseId));
    
    if (caseAssessments.length === 0) return [];
    
    const assessmentIds = caseAssessments.map(a => a.id);
    return await db
      .select()
      .from(transcripts)
      .where(inArray(transcripts.assessmentId, assessmentIds))
      .orderBy(desc(transcripts.createdAt));
  }

  async getTranscriptsByAssessment(assessmentId: string): Promise<Transcript[]> {
    return await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.assessmentId, assessmentId))
      .orderBy(desc(transcripts.createdAt));
  }

  async getTranscript(id: string): Promise<Transcript | undefined> {
    const [transcript] = await db.select().from(transcripts).where(eq(transcripts.id, id));
    return transcript || undefined;
  }

  async createTranscript(transcript: InsertTranscript): Promise<Transcript> {
    const [created] = await db
      .insert(transcripts)
      .values(transcript)
      .returning();
    return created;
  }

  async updateTranscript(id: string, updates: Partial<Transcript>): Promise<Transcript | undefined> {
    const [updated] = await db
      .update(transcripts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(transcripts.id, id))
      .returning();
    return updated || undefined;
  }

  // Additional missing methods for complete CRUD
  async deleteCase(id: string): Promise<boolean> {
    try {
      // Start a transaction to ensure all related data is deleted consistently
      return await db.transaction(async (tx) => {
        // First, get all assessments for this case
        const caseAssessments = await tx
          .select({ id: assessments.id })
          .from(assessments)
          .where(eq(assessments.caseId, id));
        
        const assessmentIds = caseAssessments.map(a => a.id);
        
        // Delete in correct order to avoid foreign key violations
        
        // 1. Clear transcriptId from assessments first (legacy field that references transcripts)
        if (assessmentIds.length > 0) {
          await tx
            .update(assessments)
            .set({ transcriptId: null })
            .where(inArray(assessments.id, assessmentIds));
        }
        
        // 2. Delete transcripts (they reference recordings)
        await tx
          .delete(transcripts)
          .where(
            assessmentIds.length > 0 
              ? or(inArray(transcripts.assessmentId, assessmentIds), eq(transcripts.caseId, id))
              : eq(transcripts.caseId, id)
          );
        
        // 5. Delete recordings (no more references)
        if (assessmentIds.length > 0) {
          await tx
            .delete(recordings)
            .where(inArray(recordings.assessmentId, assessmentIds));
        }
        
        // 6. Delete assessments
        await tx
          .delete(assessments)
          .where(eq(assessments.caseId, id));
        
        // 6. Finally, delete the case itself
        const result = await tx
          .delete(cases)
          .where(eq(cases.id, id));
        
        return result.rowCount ? result.rowCount > 0 : false;
      });
    } catch (error) {
      console.error("Error deleting case:", error);
      return false;
    }
  }

  async getRecordingsByCase(caseId: string): Promise<Recording[]> {
    // Get all assessments for the case, then get their recordings
    const caseAssessments = await db
      .select({ id: assessments.id })
      .from(assessments)
      .where(eq(assessments.caseId, caseId));
    
    if (caseAssessments.length === 0) return [];
    
    const assessmentIds = caseAssessments.map(a => a.id);
    return await db
      .select()
      .from(recordings)
      .where(inArray(recordings.assessmentId, assessmentIds))
      .orderBy(desc(recordings.createdAt));
  }

  async deleteTranscript(id: string): Promise<boolean> {
    const result = await db
      .delete(transcripts)
      .where(eq(transcripts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Template methods
  async getAllTemplates(): Promise<Template[]> {
    return await db.select().from(templates).orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async getTemplateByName(name: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.name, name));
    return template || undefined;
  }

  async createTemplate(template: InsertTemplate, createdBy: string): Promise<Template> {
    const [created] = await db
      .insert(templates)
      .values([{
        name: template.name,
        description: template.description,
        sections: template.sections,
        status: template.status || "active",
        priority: template.priority || "standard",
        createdBy,
      }])
      .returning();
    return created;
  }

  async updateTemplate(id: string, updates: UpdateTemplate): Promise<Template | undefined> {
    const [updated] = await db
      .update(templates)
      .set({
        name: updates.name,
        description: updates.description,
        sections: updates.sections,
        status: updates.status,
        priority: updates.priority,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await db
      .delete(templates)
      .where(eq(templates.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();