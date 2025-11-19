import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, randomUUID } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, inviteUserSchema, acceptInvitationSchema, createLocalUserSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { emailService } from "./email-service";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Ensure secure session secret in production
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret || "dev-secret-change-in-production", 
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true,
      sameSite: "strict", // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "identifier", // Accept both email and username
      },
      async (identifier, password, done) => {
        try {
          const user = await storage.getUserByIdentifier(identifier);
          if (!user || !user.password || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email/username or password" });
          }
          
          if (user.invitationStatus === "pending") {
            return done(null, false, { message: "Please accept your invitation first" });
          }
          
          if (!user.isActive) {
            return done(null, false, { message: "Account is deactivated" });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  // Note: Registration removed - use static admin + invitation flow only

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: SelectUser | false, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      // Prevent session fixation by regenerating session ID on login
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ message: "Session regeneration failed" });
        }
        
        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ message: "Login failed" });
          }
          res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          });
        });
      });
    })(req, res, next);
  });

  // Logout route with session destruction for security
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      // Destroy session for complete logout
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("connect.sid"); // Clear session cookie
        res.sendStatus(200);
      });
    });
  });

  // Get current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  });

  // User profile update endpoint
  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { firstName, lastName, email } = req.body;
      
      // Validate input
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if email is already taken by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        email,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Password change endpoint
  app.patch("/api/user/password", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      
      // Get current user with password
      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update password
      const updatedUser = await storage.updateUser(userId, {
        password: hashedNewPassword,
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Admin-only: Send invitation
  app.post("/api/admin/invite", requireAdmin, async (req, res) => {
    try {
      const inviteData = inviteUserSchema.parse(req.body);
      const invitedBy = req.user!.id;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(inviteData.email || "");
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const invitation = await storage.createUserInvitation(inviteData, invitedBy);
      
      // Get inviter's name for the email
      const inviter = await storage.getUser(invitedBy);
      const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email || "Administrator" : "Administrator";
      
      // Send invitation email
      const emailSent = await emailService.sendInvitationEmail(
        invitation.email!,
        inviterName,
        invitation.invitationToken || "",
        invitation.firstName || undefined
      );
      
      if (emailSent) {
        res.json({
          message: "Invitation email sent successfully",
          email: invitation.email,
        });
      } else {
        // If email failed but invitation was created, provide fallback URL
        // Generate dynamic base URL for fallback
        const baseUrl = process.env.FRONTEND_URL;
        res.json({
          message: "Invitation created. Email sending failed - please share the invitation URL manually.",
          invitationUrl: `${baseUrl}/accept-invitation?token=${invitation.invitationToken || ""}`,
          email: invitation.email,
        });
      }
    } catch (error) {
      res.status(400).json({ message: "Failed to send invitation" });
    }
  });

  // Admin-only: Create local team member (no email/invitation required)
  app.post("/api/admin/create-local-team", requireAdmin, async (req, res) => {
    try {
      const localUserData = createLocalUserSchema.parse(req.body);
      const createdBy = req.user!.id;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(localUserData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password before storing
      const hashedPassword = await hashPassword(localUserData.password);
      
      const newUser = await storage.createLocalUser({
        ...localUserData,
        password: hashedPassword,
      }, createdBy);
      
      res.status(201).json({
        message: "Local team member created successfully",
        user: {
          id: newUser.id,
          username: newUser.username,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
        },
      });
    } catch (error: any) {
      console.error("Local team creation error:", error);
      res.status(400).json({ 
        message: error.message || "Failed to create local team member" 
      });
    }
  });

  // Accept invitation
  app.post("/api/accept-invitation", async (req, res) => {
    try {
      const acceptData = acceptInvitationSchema.parse(req.body);
      
      const invitation = await storage.getUserByInvitationToken(acceptData.token);
      if (!invitation) {
        return res.status(400).json({ message: "Invalid or expired invitation" });
      }
      
      const hashedPassword = await hashPassword(acceptData.password);
      
      // Pass the required data to storage
      const acceptedData = {
        token: acceptData.token,
        password: hashedPassword,
        confirmPassword: hashedPassword, // Not used in storage but required by type
      };
      
      const user = await storage.acceptInvitation(acceptedData);
      if (!user) {
        return res.status(400).json({ message: "Failed to accept invitation" });
      }
      
      res.json({ message: "Invitation accepted successfully" });
    } catch (error) {
      console.error("Accept invitation error:", error);
      res.status(400).json({ message: "Failed to accept invitation" });
    }
  });

  // Get invitation details (for invitation acceptance page)
  app.get("/api/invitation/:token", async (req, res) => {
    try {
      const invitation = await storage.getUserByInvitationToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found or expired" });
      }
      
      res.json({
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get invitation details" });
    }
  });

  // Password reset: Request password reset
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return res.json({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      // Generate reset token and expiration (1 hour from now)
      const resetToken = randomUUID();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token in database
      await storage.setPasswordResetToken(email, resetToken, expires);

      // Send password reset email
      const emailSent = await emailService.sendPasswordResetEmail(
        email,
        user.firstName || undefined,
        resetToken
      );

      if (emailSent) {
        res.json({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to send password reset email. Please try again." 
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Password reset: Validate token and get user email
  app.get("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.passwordResetExpires) {
        return res.status(404).json({ message: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (new Date() > user.passwordResetExpires) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      res.json({
        email: user.email,
        firstName: user.firstName,
      });
    } catch (error) {
      console.error("Validate reset token error:", error);
      res.status(500).json({ message: "Failed to validate reset token" });
    }
  });

  // Password reset: Reset password with token
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.passwordResetExpires) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (new Date() > user.passwordResetExpires) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update password
      await storage.updateUser(user.id, {
        password: hashedPassword,
      });

      // Clear reset token
      await storage.clearPasswordResetToken(user.id);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(400).json({ message: "Failed to reset password" });
    }
  });

  // Admin-only: Get all users
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        invitationStatus: user.invitationStatus,
        createdAt: user.createdAt,
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
}

// Middleware to require authentication
export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

// Middleware to require admin role
export function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
}