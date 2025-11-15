import nodemailer from "nodemailer";

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Configure Gmail SMTP for developer0945@gmail.com
    if (!process.env.GMAIL_APP_PASSWORD) {
      console.warn("⚠️ Gmail App Password not configured - using demo mode");
      console.log("📧 To send real emails with erdeveloper43@gmail.com:");
      console.log("   1. Go to https://myaccount.google.com/security");
      console.log("   2. Enable 2-Step Verification");
      console.log("   3. Generate an App Password for Mail");
      console.log("   4. Set GMAIL_APP_PASSWORD environment variable");
      this.transporter = null;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: "gmail", // Use Gmail service
        auth: {
          user: "erdeveloper43@gmail.com",
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      console.log("✅ Gmail SMTP configured for erdeveloper43@gmail.com");
    } catch (error) {
      console.error("❌ Gmail SMTP failed:", error);
      console.warn("⚠️ Falling back to demo mode");
      this.transporter = null;
    }
  }

  async sendCaseAssignmentEmail(
    email: string,
    assignerName: string,
    teamMemberName: string,
    caseName: string,
    caseDetails?: string,
    dueDate?: Date,
    assignmentNotes?: string,
  ): Promise<boolean> {
    const baseUrl = "https://noteai.aronasoft.com";
    const caseUrl = `${baseUrl}/cases`; // Team members will see their assigned cases

    const emailTemplate: EmailTemplate = {
      to: email,
      subject: `New Case Assignment: ${caseName}`,
      html: this.generateCaseAssignmentHTML(teamMemberName, assignerName, caseName, caseDetails, dueDate, assignmentNotes, caseUrl),
      text: this.generateCaseAssignmentText(teamMemberName, assignerName, caseName, caseDetails, dueDate, assignmentNotes, caseUrl),
    };

    if (!this.transporter) {
      // For demo purposes, log the case assignment details
      console.log('\n📧 CASE ASSIGNMENT EMAIL (Demo Mode):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`To: ${emailTemplate.to}`);
      console.log(`Subject: ${emailTemplate.subject}`);
      console.log('\nContent:');
      console.log(emailTemplate.text);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Return true to indicate "email sent" for demo purposes
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: "erdeveloper43@gmail.com", // Must match the authenticated Gmail account
        ...emailTemplate,
      });

      console.log(`✅ Case assignment email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send case assignment email to ${email}:`, error);
      return false;
    }
  }

  async sendInvitationEmail(
    email: string,
    inviterName: string,
    invitationToken: string,
    firstName?: string,
  ): Promise<boolean> {
    const baseUrl = "https://noteai.aronasoft.com";
    const invitationUrl = `${baseUrl}/accept-invitation?token=${invitationToken}`;

    const emailTemplate: EmailTemplate = {
      to: email,
      subject: "You've been invited to join CloudnotesAI",
      html: this.generateInvitationHTML(firstName, inviterName, invitationUrl),
      text: this.generateInvitationText(firstName, inviterName, invitationUrl),
    };

    if (!this.transporter) {
      // For demo purposes, log the invitation details
      console.log('\n📧 INVITATION EMAIL (Demo Mode):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`To: ${emailTemplate.to}`);
      console.log(`Subject: ${emailTemplate.subject}`);
      console.log('\nContent:');
      console.log(emailTemplate.text);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Return true to indicate "email sent" for demo purposes
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: "erdeveloper43@gmail.com", // Must match the authenticated Gmail account
        ...emailTemplate,
      });

      console.log(`✅ Invitation email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send invitation email to ${email}:`, error);
      return false;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string | undefined,
    resetToken: string,
  ): Promise<boolean> {
    const baseUrl = "https://noteai.aronasoft.com";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const emailTemplate: EmailTemplate = {
      to: email,
      subject: "Reset your CloudnotesAI password",
      html: this.generatePasswordResetHTML(firstName, resetUrl),
      text: this.generatePasswordResetText(firstName, resetUrl),
    };

    if (!this.transporter) {
      // For demo purposes, log the password reset details
      console.log('\n📧 PASSWORD RESET EMAIL (Demo Mode):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`To: ${emailTemplate.to}`);
      console.log(`Subject: ${emailTemplate.subject}`);
      console.log('\nContent:');
      console.log(emailTemplate.text);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Return true to indicate "email sent" for demo purposes
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: "erdeveloper43@gmail.com", // Must match the authenticated Gmail account
        ...emailTemplate,
      });

      console.log(`✅ Password reset email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send password reset email to ${email}:`, error);
      return false;
    }
  }

  private generateInvitationHTML(
    firstName: string | undefined,
    inviterName: string,
    invitationUrl: string,
  ): string {
    const greeting = firstName ? `Hi ${firstName},` : "Hello,";

    return `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">CloudnotesAI</h1>
          <p style="color: #6b7280; margin: 5px 0;">AI-powered care assessment platform</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">You've been invited to join our team!</h2>
          
          <p style="color: #475569; line-height: 1.6; margin: 16px 0;">
            ${greeting}
          </p>
          
          <p style="color: #475569; line-height: 1.6; margin: 16px 0;">
            ${inviterName} has invited you to join their team on CloudnotesAI, a platform designed for healthcare professionals and social workers to streamline care assessments through AI-powered transcription and analysis.
          </p>
          
          <p style="color: #475569; line-height: 1.6; margin: 16px 0;">
            <strong>What you'll be able to do:</strong>
          </p>
          <ul style="color: #475569; line-height: 1.6; margin: 16px 0; padding-left: 20px;">
            <li>Access assigned care assessments</li>
            <li>Review AI-generated transcriptions and reports</li>
            <li>Collaborate with team members on case management</li>
            <li>Track assessment progress and completion</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
            If the button doesn't work, you can copy and paste this link into your browser:<br>
            <span style="word-break: break-all;">${invitationUrl}</span>
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This invitation was sent by ${inviterName} through CloudnotesAI.
          </p>
        </div>
      </div>
    `;
  }

  private generateInvitationText(
    firstName: string | undefined,
    inviterName: string,
    invitationUrl: string,
  ): string {
    const greeting = firstName ? `Hi ${firstName},` : "Hello,";

    return `
CloudnotesAI - Team Invitation

${greeting}

${inviterName} has invited you to join their team on CloudnotesAI, a platform designed for healthcare professionals and social workers to streamline care assessments through AI-powered transcription and analysis.

What you'll be able to do:
• Access assigned care assessments
• Review AI-generated transcriptions and reports  
• Collaborate with team members on case management
• Track assessment progress and completion

To accept this invitation and set up your account, click the link below:
${invitationUrl}

If you have any questions, please contact ${inviterName} or your system administrator.

This invitation was sent by ${inviterName} through CloudnotesAI.
    `.trim();
  }

  private generateCaseAssignmentHTML(
    teamMemberName: string,
    assignerName: string,
    caseName: string,
    caseDetails?: string,
    dueDate?: Date,
    assignmentNotes?: string,
    caseUrl?: string,
  ): string {
    const greeting = teamMemberName ? `Hi ${teamMemberName},` : "Hello,";
    const dueDateStr = dueDate ? dueDate.toLocaleDateString() : "Not specified";

    return `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">CloudnotesAI</h1>
          <p style="color: #6b7280; margin: 5px 0;">AI-powered care assessment platform</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; border-left: 4px solid #10b981;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">New Case Assignment</h2>
          
          <p style="color: #475569; line-height: 1.6; margin: 16px 0;">
            ${greeting}
          </p>
          
          <p style="color: #475569; line-height: 1.6; margin: 16px 0;">
            ${assignerName} has assigned you a new case: <strong>${caseName}</strong>
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Case Details:</h3>
            ${caseDetails ? `<p style="color: #475569; margin: 10px 0;">${caseDetails}</p>` : '<p style="color: #6b7280; font-style: italic;">No additional details provided</p>'}
            
            <p style="color: #475569; margin: 10px 0;"><strong>Due Date:</strong> ${dueDateStr}</p>
            
            ${assignmentNotes ? `<p style="color: #475569; margin: 10px 0;"><strong>Notes:</strong> ${assignmentNotes}</p>` : ''}
          </div>
          
          ${caseUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${caseUrl}" 
               style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Your Cases
            </a>
          </div>
          ` : ''}
          
          <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
            Please log in to CloudnotesAI to access your assigned cases and begin working on this case.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This case was assigned by ${assignerName} through CloudnotesAI.
          </p>
        </div>
      </div>
    `;
  }

  private generateCaseAssignmentText(
    teamMemberName: string,
    assignerName: string,
    caseName: string,
    caseDetails?: string,
    dueDate?: Date,
    assignmentNotes?: string,
    caseUrl?: string,
  ): string {
    const greeting = teamMemberName ? `Hi ${teamMemberName},` : "Hello,";
    const dueDateStr = dueDate ? dueDate.toLocaleDateString() : "Not specified";

    return `
CloudnotesAI - New Case Assignment

${greeting}

${assignerName} has assigned you a new case: ${caseName}

Case Details:
${caseDetails || 'No additional details provided'}

Due Date: ${dueDateStr}

${assignmentNotes ? `Assignment Notes:
${assignmentNotes}

` : ''}Please log in to CloudnotesAI to access your assigned cases and begin working on this case.

${caseUrl ? `Access your cases: ${caseUrl}

` : ''}This case was assigned by ${assignerName} through CloudnotesAI.
    `.trim();
  }

  private generatePasswordResetHTML(
    firstName: string | undefined,
    resetUrl: string,
  ): string {
    const greeting = firstName ? `Hi ${firstName},` : "Hello,";

    return `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">CloudnotesAI</h1>
          <p style="color: #6b7280; margin: 5px 0;">AI-powered care assessment platform</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Reset your password</h2>
          
          <p style="color: #475569; line-height: 1.6; margin: 16px 0;">
            ${greeting}
          </p>
          
          <p style="color: #475569; line-height: 1.6; margin: 16px 0;">
            We received a request to reset your password for your CloudnotesAI account. Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #475569; line-height: 1.6; margin: 16px 0;">
            This password reset link will expire in 1 hour for security reasons.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
            If the button doesn't work, you can copy and paste this link into your browser:<br>
            <span style="word-break: break-all;">${resetUrl}</span>
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This email was sent from CloudnotesAI.
          </p>
        </div>
      </div>
    `;
  }

  private generatePasswordResetText(
    firstName: string | undefined,
    resetUrl: string,
  ): string {
    const greeting = firstName ? `Hi ${firstName},` : "Hello,";

    return `
CloudnotesAI - Reset Your Password

${greeting}

We received a request to reset your password for your CloudnotesAI account. Click the link below to create a new password:

${resetUrl}

This password reset link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

This email was sent from CloudnotesAI.
    `.trim();
  }
}

export const emailService = new EmailService();
