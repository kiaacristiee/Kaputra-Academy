"use server";

import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function uploadReceipt(formData: FormData) {
  const paymentId = formData.get("paymentId") as string;
  const receiptFile = formData.get("receiptFile") as File;

  if (!paymentId || !receiptFile || receiptFile.size === 0) {
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

  // Update payment status
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      receiptUrl,
      status: "VERIFYING",
      paymentMethod: "Manual Bank Transfer", // mock
    },
  });

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { registrationId: true },
  });

  if (payment) {
    const reg = await prisma.registration.findUnique({
      where: { id: payment.registrationId },
    });

    if (reg) {
      let nextStatus = "VERIFYING";
      if (reg.status === "PENDING_PT_PAYMENT") {
        nextStatus = "VERIFYING_PT_PAYMENT";
      } else if (reg.status === "PENDING_ENROLLMENT_PAYMENT") {
        nextStatus = "VERIFYING_ENROLLMENT_PAYMENT";
      }
      await prisma.registration.update({
        where: { id: payment.registrationId },
        data: { status: nextStatus },
      });
    }
  }

  // Redirect to success page
  redirect(`/payment/${paymentId}/success`);
}
