import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedAdminUser() {
  try {
    // Check if admin already exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@audionotesai.com"))
      .limit(1);

    if (existingAdmin) {
      console.log("📋 Admin user already exists");
      return existingAdmin;
    }

    // Create static admin user
    const hashedPassword = await hashPassword("admin123"); // Change this password in production!
    
    const [adminUser] = await db
      .insert(users)
      .values({
        username: "admin@audionotesai.com",
        email: "admin@audionotesai.com",
        password: hashedPassword,
        role: "admin",
        firstName: "System",
        lastName: "Administrator",
        isActive: 1,
        invitationStatus: "accepted", // Static user is pre-accepted
      })
      .returning();

    console.log("✅ Static admin user created:", {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });
    
    return adminUser;
  } catch (error) {
    console.error("❌ Failed to seed admin user:", error);
    throw error;
  }
}

// Auto-seed on import in development
if (process.env.NODE_ENV === "development") {
  seedAdminUser().catch(console.error);
}