import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyMidtransSignature } from "@/lib/midtrans";
import { fulfillInvoicePayment } from "@/actions/midtransPayment";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      transaction_id,
    } = body;

    if (!order_id || !status_code || !gross_amount) {
      return NextResponse.json(
        { error: "Invalid notification payload" },
        { status: 400 }
      );
    }

    // 1. Verify Midtrans Signature
    if (signature_key) {
      const isValid = verifyMidtransSignature(
        order_id,
        status_code,
        gross_amount,
        signature_key
      );

      if (!isValid) {
        console.warn(`[MIDTRANS WEBHOOK] Signature verification failed for order_id: ${order_id}`);
        return NextResponse.json(
          { error: "Invalid signature hash" },
          { status: 400 }
        );
      }
    }

    console.log(
      `[MIDTRANS WEBHOOK] Notification received: order_id=${order_id}, status=${transaction_status}, fraud=${fraud_status}`
    );

    // 2. Find matching Invoice in database by orderId or parsed invoiceNumber
    let invoice = await prisma.invoice.findFirst({
      where: { orderId: order_id },
    });

    if (!invoice) {
      // Fallback: try parsing order_id prefix if order_id format is INV-YYYYMM-XXXX-BANK-XXXX
      const parts = order_id.split("-");
      if (parts.length >= 3) {
        const invoiceNumber = `${parts[0]}-${parts[1]}-${parts[2]}`;
        invoice = await prisma.invoice.findUnique({
          where: { invoiceNumber },
        });
      }
    }

    if (!invoice) {
      console.error(`[MIDTRANS WEBHOOK] Invoice not found for order_id: ${order_id}`);
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // 3. Process Transaction Statuses
    if (
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept")
    ) {
      // Execute full payment fulfillment & email notification
      await fulfillInvoicePayment(invoice.id);
      console.log(`[MIDTRANS WEBHOOK] Successfully fulfilled payment for invoice: ${invoice.invoiceNumber}`);
    } else if (transaction_status === "expire") {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "EXPIRED" },
      });
      console.log(`[MIDTRANS WEBHOOK] Marked invoice ${invoice.invoiceNumber} as EXPIRED`);
    } else if (transaction_status === "cancel" || transaction_status === "deny") {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "CANCELLED" },
      });
      console.log(`[MIDTRANS WEBHOOK] Marked invoice ${invoice.invoiceNumber} as CANCELLED`);
    } else if (transaction_status === "pending") {
      // Ensure transaction ID and status are updated
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          transactionId: transaction_id || (invoice as any).transactionId,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json({ status: "OK", message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("[MIDTRANS WEBHOOK ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
