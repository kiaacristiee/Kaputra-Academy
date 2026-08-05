"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageEnrollment } from "@/lib/permissions";

async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(session.user.role)) {
    throw new Error("Unauthorized access. Admin role required.");
  }
  return session.user;
}

function extractLearningMethodFromDraft(metadata: string | null): string | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    return parsed.learningMethod || null;
  } catch {
    return null;
  }
}

  export async function getEmailDrafts() {
    try {
      const user = await checkAdminAuth();
      const isSuperAdmin = ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(user.role);

      const allDrafts = await prisma.emailDraft.findMany({
        orderBy: { createdAt: "desc" },
      });

      // Filter out PRIVATE learningMethod drafts for standard Admins
      const drafts = isSuperAdmin 
        ? allDrafts 
        : allDrafts.filter(d => extractLearningMethodFromDraft(d.metadata) !== "PRIVATE");

      return { success: true, drafts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createEmailDraft(data: {
  type: string;
  recipient: string;
  subject: string;
  bodyHtml: string;
  metadata?: string;
}) {
  try {
    const draft = await prisma.emailDraft.create({
      data: {
        type: data.type,
        recipient: data.recipient,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        status: "PENDING_APPROVAL",
        metadata: data.metadata,
      },
    });
    return { success: true, draft };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateEmailDraft(
  id: string,
  data: {
    recipient?: string;
    subject?: string;
    bodyHtml?: string;
    status?: string;
  }
) {
  try {
    const user = await checkAdminAuth();
    const existing = await prisma.emailDraft.findUnique({ where: { id } });
    if (!existing) throw new Error("Draft not found");

    const learningMethod = extractLearningMethodFromDraft(existing.metadata);
    if (!canManageEnrollment(user.role, learningMethod)) {
      throw new Error("This action requires super admin access for Private class enrollments");
    }

    const draft = await prisma.emailDraft.update({
      where: { id },
      data,
    });
    revalidatePath("/admin/emails");
    return { success: true, draft };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteEmailDraft(id: string) {
  try {
    const user = await checkAdminAuth();
    const existing = await prisma.emailDraft.findUnique({ where: { id } });
    if (!existing) throw new Error("Draft not found");

    const learningMethod = extractLearningMethodFromDraft(existing.metadata);
    if (!canManageEnrollment(user.role, learningMethod)) {
      throw new Error("This action requires super admin access for Private class enrollments");
    }

    await prisma.emailDraft.delete({ where: { id } });
    revalidatePath("/admin/emails");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendEmailDraft(id: string) {
  try {
    const user = await checkAdminAuth();
    const draft = await prisma.emailDraft.findUnique({ where: { id } });
    if (!draft) throw new Error("Draft not found");
    
    const learningMethod = extractLearningMethodFromDraft(draft.metadata);
    if (!canManageEnrollment(user.role, learningMethod)) {
      throw new Error("This action requires super admin access for Private class emails");
    }

    // Send the email via Gmail SMTP using Nodemailer
    const { transporter } = await import("@/lib/transporter");
    
    try {
      await transporter.sendMail({
        from: `"Kaputra Academy" <${process.env.EMAIL_USER}>`,
        to: draft.recipient,
        subject: draft.subject,
        html: draft.bodyHtml,
      });

      // Update status to SENT and log activity
      const currentMeta = draft.metadata ? JSON.parse(draft.metadata) : {};
      currentMeta.sentBy = user.email || user.name || "Admin";
      currentMeta.sentAt = new Date().toISOString();
      currentMeta.lastError = undefined; // clear previous errors

      const updated = await prisma.emailDraft.update({
        where: { id },
        data: { 
          status: "SENT",
          metadata: JSON.stringify(currentMeta)
        },
      });
      
      revalidatePath("/admin/emails");
      return { success: true, draft: updated };
      
    } catch (sendError: any) {
      console.error("[EMAIL SEND ERROR]", sendError);
      
      const currentMeta = draft.metadata ? JSON.parse(draft.metadata) : {};
      currentMeta.lastError = sendError.message || sendError.toString();
      currentMeta.failedBy = user.email || user.name || "Admin";
      currentMeta.failedAt = new Date().toISOString();

      const failedDraft = await prisma.emailDraft.update({
        where: { id },
        data: { 
          status: "FAILED",
          metadata: JSON.stringify(currentMeta)
        }
      });
      
      revalidatePath("/admin/emails");
      return { success: false, error: sendError.message || "Failed to send email", draft: failedDraft };
    }
  } catch (error: any) {
    console.error("[EMAIL DRAFT ROUTING ERROR]", error);
    return { success: false, error: error.message };
  }
}

