"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function approveDraftInvoice(invoiceId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
    throw new Error("Unauthorized");
  }

  const virtualAccountNumber = "7000686799";
  
  // Set due date 24h from now
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + 24);

  const res = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      approvalStatus: "APPROVED",
      status: "PENDING",
      virtualAccountNumber,
      dueDate
    }
  });
  return { success: true, invoice: res };
}

export async function createInvoice(data: {
  itemId: string;
  itemType: string;
  amount: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const studentId = session.user.id as string;

  // Generate unique invoice number
  const count = await prisma.invoice.count();
  const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;

  const virtualAccountNumber = "7000686799";

  // Due date: 24 hours from now
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + 24);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      studentId,
      itemId: data.itemId,
      itemType: data.itemType,
      amount: data.amount,
      virtualAccountNumber,
      dueDate,
    },
  });

  try {
    const { createOrUpdateInvoiceEmailDraft } = await import("@/lib/invoiceDraft");
    await createOrUpdateInvoiceEmailDraft(invoice.id);
  } catch (draftErr) {
    console.error("Failed to auto-generate invoice draft:", draftErr);
  }

  return { success: true, invoiceId: invoice.id };
}

export async function uploadReceipt(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const invoiceId = formData.get("invoiceId") as string;
  const receiptFile = formData.get("receiptFile") as File;

  if (!invoiceId || !receiptFile || receiptFile.size === 0) {
    throw new Error("Missing required fields or empty file");
  }

  // Ensure it's an image or PDF
  if (!receiptFile.type.startsWith("image/") && receiptFile.type !== "application/pdf") {
    throw new Error("Please upload a valid image or PDF file");
  }

  const bytes = await receiptFile.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Save as Base64 Data URL so receipts are permanently stored in database (essential for serverless/cloud hosting)
  const base64Data = buffer.toString("base64");
  const receiptUrl = `data:${receiptFile.type};base64,${base64Data}`;

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      receiptUrl,
      status: "WAITING_VERIFICATION",
    },
  });

  // Sync state with Registration
  if (invoice.itemType === "CAMP") {
    const campReg = await prisma.campRegistration.findFirst({
      where: {
        studentId: invoice.studentId,
        campProgramId: invoice.itemId,
      },
    });

    if (campReg) {
      await prisma.campRegistration.update({
        where: { id: campReg.id },
        data: { status: "VERIFYING_PAYMENT" },
      });
    }
  } else {
    const reg = await prisma.registration.findFirst({
      where: {
        studentId: invoice.studentId,
        courseId: invoice.itemId,
      },
    });

    if (reg) {
      let nextStatus = reg.status;
      if (invoice.itemType === "PLACEMENT_TEST") {
        nextStatus = "VERIFYING_PT_PAYMENT";
      } else if (invoice.itemType === "CLASS") {
        nextStatus = "VERIFYING_ENROLLMENT_PAYMENT";
      }
      await prisma.registration.update({
        where: { id: reg.id },
        data: { status: nextStatus },
      });
    }
  }

  return { success: true, invoice };
}
