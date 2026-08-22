import prisma from "@/lib/db";
import { generateInvoicePDF, InvoicePdfData, InvoicePdfItem, formatRupiah } from "@/lib/invoicePdf";

export async function createOrUpdateInvoiceEmailDraft(invoiceId: string) {
  try {
    // 1. Fetch Invoice with relations
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!invoice) {
      console.error(`Invoice not found for ID: ${invoiceId}`);
      return { success: false, error: "Invoice not found." };
    }

    const student = invoice.student;
    if (!student) {
      return { success: false, error: "Student associated with invoice not found." };
    }

    const parent = student.parent;
    const parentEmail = parent?.email || "";
    const parentName = parent?.name || "Parent / Guardian";
    const studentName = student.name;
    const studentIdStr = student.studentIdStr || student.id.slice(-8).toUpperCase();

    // 2. Fetch Program / Item details
    let programName = "Kaputra Academy Class";
    let itemDescription = "Academic Class Tuition";
    let categoryName = invoice.itemCategory || "Regular Class";

    if (invoice.itemType === "CAMP") {
      const camp = await prisma.campProgram.findUnique({
        where: { id: invoice.itemId },
      });
      const campReg = await prisma.campRegistration.findFirst({
        where: { studentId: invoice.studentId, campProgramId: invoice.itemId },
        orderBy: { createdAt: "desc" },
      });
      if (camp) {
        programName = camp.name;
        const freqStr = campReg?.sessionFrequency === "2x_WEEK" ? "2x/week (8 Sessions)" : "1x/week (4 Sessions)";
        itemDescription = `Camp Program Enrollment - ${camp.name} [${freqStr}]`;
        categoryName = "Camp Program";
      }
    } else {
      const course = await prisma.course.findUnique({
        where: { id: invoice.itemId },
      });
      if (course) {
        programName = course.title;
        categoryName = course.type === "COMPETITION" ? "Competition Class" : "Regular Class";

        const methodStr = invoice.learningMethod === "PRIVATE" ? "Private" : "Semi-Private";
        const freqStr = invoice.sessionsPerWeek ? `${invoice.sessionsPerWeek}x/week` : "1x/week";

        if (invoice.itemType === "PLACEMENT_TEST") {
          itemDescription = `Placement Test Fee (${course.title})`;
        } else {
          itemDescription = `${categoryName} (${methodStr} - ${freqStr}) - ${course.title}`;
        }
      }
    }

    // Date formatting (en-GB format: 18 August 2026)
    const invoiceDateStr = new Date(invoice.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const dueDateStr = new Date(invoice.dueDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    // Construct itemized rows
    const items: InvoicePdfItem[] = [
      {
        no: 1,
        date: invoiceDateStr,
        description: itemDescription,
        unitPrice: invoice.amount,
        amount: invoice.amount,
      },
    ];

    // Build Invoice PDF Data structure
    const invoicePdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoiceDateStr,
      dueDate: dueDateStr,
      studentName: studentName,
      studentIdStr: studentIdStr,
      parentName: parentName,
      parentEmail: parentEmail,
      programName: programName,
      learningMethod: invoice.learningMethod || "SEMI_PRIVATE",
      sessionsPerWeek: invoice.sessionsPerWeek || 1,
      items: items,
      subtotal: invoice.amount,
      total: invoice.amount,
      bankName: "BCA (Bank Central Asia)",
      bankAccountNo: invoice.virtualAccountNumber || "7000686799",
      bankAccountHolder: "ANDI JULIO KAPUTRA",
    };

    // Generate PDF
    const { base64: pdfBase64 } = generateInvoicePDF(invoicePdfData);

    const pdfFilename = `Invoice-${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "_")}-${studentIdStr}.pdf`;

    // Email Body Template
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - Kaputra Academy</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0F19;font-family:'Segoe UI',Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B0F19;padding:30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:650px;background-color:#0F172A;border:1px solid #1E293B;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color:#020617;padding:25px 30px;border-bottom:2px solid #CA8E25;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:900;">KAPUTRA ACADEMY</h1>
                    <p style="margin:4px 0 0 0;color:#CA8E25;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Student Invoice Notification</p>
                  </td>
                  <td align="right">
                    <span style="background-color:rgba(202,142,37,0.15);border:1px solid rgba(202,142,37,0.3);color:#CA8E25;font-size:12px;font-weight:800;padding:6px 14px;border-radius:20px;text-transform:uppercase;display:inline-block;">
                      OFFICIAL INVOICE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Friendly Greeting -->
          <tr>
            <td style="padding:30px 30px 20px 30px;">
              <h2 style="margin:0 0 12px 0;color:#FFFFFF;font-size:20px;font-weight:800;">Invoice Ready for Payment 📄</h2>
              <p style="margin:0 0 14px 0;color:#CBD5E1;font-size:14px;line-height:1.6;">
                Dear <strong>${parentName}</strong>,
              </p>
              <p style="margin:0 0 16px 0;color:#CBD5E1;font-size:14px;line-height:1.6;">
                Please find attached the official tuition invoice for <strong>${studentName}</strong> (Student ID: <strong style="color:#CA8E25;font-family:monospace;">${studentIdStr}</strong>) at Kaputra Academy.
              </p>
            </td>
          </tr>

          <!-- Invoice Summary Card -->
          <tr>
            <td style="padding:0 30px 20px 30px;">
              <div style="background-color:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;">
                <h3 style="margin:0 0 14px 0;color:#CA8E25;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">
                  📋 Invoice Summary
                </h3>
                <table width="100%" cellspacing="0" cellpadding="6" style="font-size:13px;color:#E2E8F0;">
                  <tr>
                    <td width="40%" style="color:#94A3B8;">Invoice Number:</td>
                    <td style="font-weight:800;font-family:monospace;color:#FFFFFF;">${invoice.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="color:#94A3B8;">Student Name:</td>
                    <td style="font-weight:700;color:#FFFFFF;">${studentName}</td>
                  </tr>
                  <tr>
                    <td style="color:#94A3B8;">Student ID:</td>
                    <td style="font-weight:800;font-family:monospace;color:#CA8E25;">${studentIdStr}</td>
                  </tr>
                  <tr>
                    <td style="color:#94A3B8;">Program:</td>
                    <td style="font-weight:700;color:#FFFFFF;">${programName}</td>
                  </tr>
                  <tr>
                    <td style="color:#94A3B8;">Invoice Date:</td>
                    <td style="font-weight:600;">${invoiceDateStr}</td>
                  </tr>
                  <tr>
                    <td style="color:#94A3B8;">Due Date:</td>
                    <td style="font-weight:600;color:#F59E0B;">${dueDateStr}</td>
                  </tr>
                  <tr style="border-top:1px solid #334155;">
                    <td style="color:#94A3B8;padding-top:10px;">Total Amount:</td>
                    <td style="font-size:16px;font-weight:900;color:#CA8E25;padding-top:10px;">${formatRupiah(invoice.amount)}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Payment Info -->
          <tr>
            <td style="padding:0 30px 25px 30px;">
              <div style="background-color:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;">
                <h3 style="margin:0 0 14px 0;color:#CA8E25;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">
                  💳 Payment Instructions
                </h3>
                <table width="100%" cellspacing="0" cellpadding="6" style="font-size:13px;color:#E2E8F0;">
                  <tr>
                    <td width="40%" style="color:#94A3B8;">Bank Name:</td>
                    <td style="font-weight:700;color:#FFFFFF;">BCA (Bank Central Asia)</td>
                  </tr>
                  <tr>
                    <td style="color:#94A3B8;">Virtual Account / No. Rek:</td>
                    <td style="font-weight:800;font-family:monospace;color:#60A5FA;font-size:14px;">${invoice.virtualAccountNumber || "7000686799"}</td>
                  </tr>
                  <tr>
                    <td style="color:#94A3B8;">Account Holder:</td>
                    <td style="font-weight:700;color:#FFFFFF;">ANDI JULIO KAPUTRA</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#020617;padding:25px 30px;border-top:1px solid #1E293B;text-align:center;color:#64748B;font-size:12px;line-height:1.5;">
              <p style="margin:0 0 8px 0;color:#94A3B8;font-weight:700;">Kaputra Academy Finance Department</p>
              <p style="margin:0 0 12px 0;">Please see the attached PDF document for the complete itemized breakdown and official receipt details.</p>
              <p style="margin:0;">Questions? Reply to this email or contact support at <a href="mailto:support@kaputra.com" style="color:#CA8E25;text-decoration:none;">support@kaputra.com</a>.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const metadataPayload = JSON.stringify({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentId: student.id,
      studentIdStr: studentIdStr,
      parentEmail: parentEmail,
      pdfFilename: pdfFilename,
      pdfBase64: pdfBase64,
      learningMethod: invoice.learningMethod || "SEMI_PRIVATE",
      invoiceData: invoicePdfData,
    });

    const subject = `Invoice - Kaputra Academy - ${studentName}`;

    // 6. Check for existing EmailDraft for this invoice (Idempotency)
    const existingDrafts = await prisma.emailDraft.findMany({
      where: {
        type: "INVOICE",
      },
    });

    const existingDraft = existingDrafts.find((d) => {
      if (!d.metadata) return false;
      try {
        const meta = JSON.parse(d.metadata);
        return meta.invoiceId === invoice.id;
      } catch {
        return false;
      }
    });

    let draft;
    if (existingDraft) {
      // Update existing draft if in draft state
      draft = await prisma.emailDraft.update({
        where: { id: existingDraft.id },
        data: {
          recipient: parentEmail || "parent@kaputra.com",
          subject: subject,
          bodyHtml: emailHtml,
          metadata: metadataPayload,
        },
      });
    } else {
      // Create new draft in PENDING_APPROVAL status
      draft = await prisma.emailDraft.create({
        data: {
          type: "INVOICE",
          recipient: parentEmail || "parent@kaputra.com",
          subject: subject,
          bodyHtml: emailHtml,
          status: "PENDING_APPROVAL",
          metadata: metadataPayload,
        },
      });
    }

    return { success: true, draft };
  } catch (error: any) {
    console.error("Error generating invoice draft:", error);
    return { success: false, error: error.message };
  }
}

export async function generateMonthlyRenewalInvoices() {
  try {
    const activeEnrollments = await prisma.enrollment.findMany({
      where: { status: "ACTIVE" },
      include: {
        student: {
          include: { parent: true }
        }
      }
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let createdCount = 0;

    for (const enrollment of activeEnrollments) {
      // Check if an invoice already exists for this student and item for the current month
      const existingInvoices = await prisma.invoice.findMany({
        where: {
          studentId: enrollment.studentId,
          itemId: enrollment.itemId,
        }
      });

      const hasCurrentMonthInvoice = existingInvoices.some(inv => {
        const invDate = new Date(inv.createdAt);
        return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
      });

      if (!hasCurrentMonthInvoice) {
        // Generate new monthly invoice
        const count = await prisma.invoice.count();
        const invoiceNumber = `INV-${currentYear}${(currentMonth + 1).toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;
        const virtualAccountNumber = `8800${Math.floor(10000000 + Math.random() * 90000000)}`;
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + 24);

        let amount = 1500000; // default monthly tuition
        if (enrollment.itemType === "CLASS") {
          const course = await prisma.course.findUnique({ where: { id: enrollment.itemId } });
          if (course) {
            amount = course.priceSemiPrivateOnce || course.pricePrivateOnce || 1500000;
          }
        }

        const newInvoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            studentId: enrollment.studentId,
            itemId: enrollment.itemId,
            itemType: enrollment.itemType || "CLASS",
            amount,
            virtualAccountNumber,
            dueDate,
          }
        });

        await createOrUpdateInvoiceEmailDraft(newInvoice.id);
        createdCount++;
      }
    }

    return { success: true, createdCount };
  } catch (error: any) {
    console.error("Error generating monthly renewal invoices:", error);
    return { success: false, error: error.message };
  }
}

