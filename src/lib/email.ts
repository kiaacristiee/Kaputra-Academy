import { transporter } from "@/lib/transporter";
import prisma from "@/lib/db";
import { headers } from "next/headers";

async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  try {
    const headerStore = await headers();
    const host = headerStore.get('x-forwarded-host') || headerStore.get('host');
    const protocol = headerStore.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    if (host) return `${protocol}://${host}`;
  } catch (e) {
    // headers() might throw outside of request context
  }

  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export interface ActivationEmailParams {
  parentEmail: string;
  parentName: string;
  studentName: string;
  studentId: string;
  activationLink: string;
  testCode?: string;
  learningMethod?: string;
}

export async function sendActivationEmail(params: ActivationEmailParams) {
  const baseUrl = await getBaseUrl();
  const placementTestLink = params.testCode
    ? `${baseUrl}/placement-test?studentId=${encodeURIComponent(params.studentId)}&code=${encodeURIComponent(params.testCode)}`
    : null;

  const placementTestSection = params.testCode
    ? `
      <div style="background-color:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;margin:20px 0;">
        <h3 style="margin:0 0 14px 0;color:#CA8E25;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">
          📝 Placement Test Credentials
        </h3>
        <table width="100%" cellspacing="0" cellpadding="6" style="font-size:13px;color:#E2E8F0;">
          <tr>
            <td width="40%" style="color:#94A3B8;">Student ID:</td>
            <td style="font-weight:800;font-family:monospace;color:#FFFFFF;font-size:15px;">${params.studentId}</td>
          </tr>
          <tr>
            <td style="color:#94A3B8;">Test Code:</td>
            <td style="font-weight:800;font-family:monospace;color:#CA8E25;font-size:15px;">${params.testCode}</td>
          </tr>
        </table>
        <div style="margin-top:16px;">
          <a href="${placementTestLink}" style="display:inline-block;background-color:#CA8E25;color:#000;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
            Start Placement Test →
          </a>
        </div>
        <p style="margin:12px 0 0 0;color:#94A3B8;font-size:12px;">
          Or visit <strong>${baseUrl}/placement-test</strong> and enter the credentials above manually.
        </p>
      </div>
    `
    : "";

  const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;background:#0F172A;color:#E2E8F0;border-radius:12px;border:1px solid #1E293B;">
  <h2 style="color:#CA8E25;margin:0 0 5px 0;">Kaputra Academy</h2>
  <p style="color:#94A3B8;margin:0 0 20px 0;font-size:13px;">Student Account Activation</p>
  <hr style="border-color:#1E293B;margin-bottom:20px;"/>

  <p>Dear ${params.parentName},</p>
  <p>Thank you for registering your child at <strong>Kaputra Academy</strong>.</p>

  <div style="background-color:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;margin:20px 0;">
    <h3 style="margin:0 0 14px 0;color:#CA8E25;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">
      👤 Student Information
    </h3>
    <table width="100%" cellspacing="0" cellpadding="6" style="font-size:13px;color:#E2E8F0;">
      <tr>
        <td width="40%" style="color:#94A3B8;">Student Name:</td>
        <td style="font-weight:800;color:#FFFFFF;">${params.studentName}</td>
      </tr>
      <tr>
        <td style="color:#94A3B8;">Student ID:</td>
        <td style="font-weight:800;font-family:monospace;color:#FFFFFF;">${params.studentId}</td>
      </tr>
    </table>
  </div>

  ${placementTestSection}

  <div style="background-color:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;margin:20px 0;">
    <h3 style="margin:0 0 14px 0;color:#CA8E25;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">
      🔑 Account Activation
    </h3>
    <p style="color:#CBD5E1;font-size:13px;margin:0 0 14px 0;">
      Click the button below to activate your child's student account and set their login password:
    </p>
    <a href="${params.activationLink}" style="display:inline-block;background-color:#10B981;color:#FFF;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
      Activate Account
    </a>
  </div>

  <p style="margin-top:25px;color:#94A3B8;font-size:13px;">
    If you have any questions, please reply to this email or contact support at <a href="mailto:support@kaputra.com" style="color:#CA8E25;text-decoration:none;">support@kaputra.com</a>.
  </p>

  <br/>
  <p style="margin:0;">Regards,<br/><strong style="color:#FFF;">Kaputra Academy Team</strong></p>
</div>
`;

  const subject = params.testCode
    ? `Placement Test Credentials - ${params.studentName} | Kaputra Academy`
    : `Activate Your Student's Account - Kaputra Academy`;

  await prisma.emailDraft.create({
    data: {
      type: "ACCOUNT_ACTIVATION",
      recipient: params.parentEmail,
      subject,
      bodyHtml: emailHtml,
      status: "PENDING_APPROVAL",
      metadata: JSON.stringify({ learningMethod: params.learningMethod || "SEMI_PRIVATE" }),
    }
  });

  return { success: true };
}

export interface ParentActivationEmailParams {
  parentEmail: string;
  parentName: string;
  studentName: string;
  studentId: string;
  token: string;
}

export async function sendParentActivationEmail(params: ParentActivationEmailParams) {
  const baseUrl = await getBaseUrl();
  const activationLink = `${baseUrl}/activate?token=${params.token}`;

  console.log("[PARENT_ACTIVATION_EMAIL] Sending email to:", params.parentEmail);
  console.log("[PARENT_ACTIVATION_EMAIL] Activation URL:", activationLink);

  const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;background:#0F172A;color:#E2E8F0;border-radius:12px;border:1px solid #1E293B;">
  <div style="text-align:center;margin-bottom:20px;">
    <h2 style="color:#CA8E25;margin:0 0 5px 0;font-size:24px;">KAPUTRA</h2>
    <span style="color:#CA8E25;font-size:12px;letter-spacing:2px;font-weight:bold;">ACADEMY</span>
  </div>
  <p style="color:#94A3B8;margin:0 0 20px 0;font-size:13px;text-align:center;">Parent & Student Account Activation</p>
  <hr style="border-color:#1E293B;margin-bottom:20px;"/>

  <p>Hello ${params.parentName},</p>
  <p>Welcome to <strong>Kaputra Academy</strong>!</p>
  <p>Your parent account has been successfully created along with the student profile for <strong>${params.studentName}</strong> (Student ID: <span style="font-family:monospace;color:#CA8E25;font-weight:bold;">${params.studentId}</span>).</p>

  <div style="background-color:#1E293B;border:1px solid #334155;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
    <h3 style="margin:0 0 14px 0;color:#CA8E25;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">
      🔑 Account Activation
    </h3>
    <p style="color:#CBD5E1;font-size:13px;margin:0 0 18px 0;">
      Please activate your account and set up your login passwords by clicking the button below:
    </p>
    <a href="${activationLink}" style="display:inline-block;background-color:#CA8E25;color:#000;font-weight:800;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;box-shadow:0 4px 12px rgba(202,142,37,0.3);">
      ACTIVATE MY ACCOUNT
    </a>
    <p style="margin:16px 0 0 0;color:#94A3B8;font-size:12px;">
      This link will take you directly to the Kaputra Academy account activation page.
    </p>
  </div>

  <p style="color:#94A3B8;font-size:13px;">
    If you did not create this account, please ignore this email.
  </p>

  <br/>
  <p style="margin:0;color:#94A3B8;font-size:13px;">Regards,<br/><strong style="color:#FFF;">Kaputra Academy Team</strong></p>
</div>
`;

  try {
    const info = await transporter.sendMail({
      from: `"Kaputra Academy" <${process.env.EMAIL_USER}>`,
      to: params.parentEmail,
      subject: "Activate Your Kaputra Academy Account",
      html: emailHtml,
    });

    console.log("[PARENT_ACTIVATION_EMAIL] Delivered. MessageId:", info.messageId);

    try {
      await prisma.emailDraft.create({
        data: {
          type: "ACCOUNT_ACTIVATION",
          recipient: params.parentEmail,
          subject: "Activate Your Kaputra Academy Account",
          bodyHtml: emailHtml,
          status: "SENT",
        },
      });
    } catch (dbErr) {
      console.warn("[PARENT_ACTIVATION_EMAIL] Audit log failed (non-critical):", dbErr);
    }

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[PARENT_ACTIVATION_EMAIL] Failed to send email:", error);

    try {
      await prisma.emailDraft.create({
        data: {
          type: "ACCOUNT_ACTIVATION",
          recipient: params.parentEmail,
          subject: "Activate Your Kaputra Academy Account",
          bodyHtml: emailHtml,
          status: "FAILED",
        },
      });
    } catch (dbErr) {
      // ignore
    }

    return { success: false, error: error.message };
  }
}

export interface NewChildNotificationParams {
  parentEmail: string;
  parentName: string;
  studentName: string;
  studentId: string;
}

export async function sendNewChildNotificationEmail(params: NewChildNotificationParams) {
  const baseUrl = await getBaseUrl();

  const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;background:#0F172A;color:#E2E8F0;border-radius:12px;border:1px solid #1E293B;">
  <div style="text-align:center;margin-bottom:20px;">
    <h2 style="color:#CA8E25;margin:0 0 5px 0;font-size:24px;">KAPUTRA</h2>
    <span style="color:#CA8E25;font-size:12px;letter-spacing:2px;font-weight:bold;">ACADEMY</span>
  </div>
  <p style="color:#94A3B8;margin:0 0 20px 0;font-size:13px;text-align:center;">New Student Profile Linked</p>
  <hr style="border-color:#1E293B;margin-bottom:20px;"/>

  <p>Hello ${params.parentName},</p>
  <p>A new student profile has been successfully added and linked to your Kaputra Academy parent account.</p>

  <div style="background-color:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;margin:20px 0;">
    <p style="margin:0 0 8px 0;color:#94A3B8;font-size:12px;text-transform:uppercase;font-weight:bold;">Student Details:</p>
    <p style="margin:0 0 6px 0;color:#FFF;font-size:15px;font-weight:bold;">Student Name: ${params.studentName}</p>
    <p style="margin:0;color:#CA8E25;font-family:monospace;font-size:15px;font-weight:bold;">Student ID: ${params.studentId}</p>
  </div>

  <p style="color:#CBD5E1;font-size:13px;">
    You can now monitor this child's enrollments, attendance, and academic progress directly from your Parent Dashboard.
  </p>

  <div style="text-align:center;margin-top:24px;">
    <a href="${baseUrl}/parent" style="display:inline-block;background-color:#CA8E25;color:#000;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
      GO TO PARENT DASHBOARD
    </a>
  </div>

  <br/>
  <p style="margin:0;color:#94A3B8;font-size:13px;">Regards,<br/><strong style="color:#FFF;">Kaputra Academy Team</strong></p>
</div>
`;

  try {
    const info = await transporter.sendMail({
      from: `"Kaputra Academy" <${process.env.EMAIL_USER}>`,
      to: params.parentEmail,
      subject: `New Student Linked: ${params.studentName} (${params.studentId})`,
      html: emailHtml,
    });

    console.log("[NEW_CHILD_EMAIL] Delivered. MessageId:", info.messageId);

    try {
      await prisma.emailDraft.create({
        data: {
          type: "GENERAL_ANNOUNCEMENT",
          recipient: params.parentEmail,
          subject: `New Student Linked: ${params.studentName} (${params.studentId})`,
          bodyHtml: emailHtml,
          status: "SENT",
        },
      });
    } catch (dbErr) {
      // ignore
    }

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[NEW_CHILD_EMAIL] Failed to send email:", error);
    return { success: false, error: error.message };
  }
}

export interface TestResultEmailParams {
  parentEmail: string;
  parentName?: string;
  studentName: string;
  score: number;
  qualificationStatus: "QUALIFIED" | "NOT_QUALIFIED";
}

export function getPerformanceScale(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Improvement";
}

export async function sendPlacementTestResultEmail(
  params: TestResultEmailParams
) {
  const performanceScale = getPerformanceScale(params.score);

  const recommendation =
    params.qualificationStatus === "QUALIFIED"
      ? "Competition Class"
      : "Regular Class";

  const message =
    params.qualificationStatus === "QUALIFIED"
      ? `
        <p style="color:#10B981;font-weight:bold;">
          Congratulations! Your child has met the requirements for the
          <strong>Competition Class</strong>.
        </p>
      `
      : `
        <p style="color:#D97706;font-weight:bold;">
          Your child is recommended to join the
          <strong>Regular Class</strong> to strengthen their academic
          foundation before progressing further.
        </p>
      `;

  const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;background:#0F172A;color:#E2E8F0;border-radius:12px;border:1px solid #1E293B">
  <h2 style="color:#CA8E25;margin:0 0 5px 0">Kaputra Academy</h2>
  <p style="color:#94A3B8;margin:0 0 20px 0;font-size:13px">Placement Test Result</p>
  <hr style="border-color:#1E293B;margin-bottom:20px"/>

  <p>Dear ${params.parentName ?? "Parent"},</p>
  <p>Your child has completed the Placement Test. Below are the results:</p>

  <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#1E293B;border-radius:8px">
    <tr>
      <td style="padding:12px;border-bottom:1px solid #334155;color:#94A3B8">Student</td>
      <td style="padding:12px;border-bottom:1px solid #334155;font-weight:bold;color:#FFF">${params.studentName}</td>
    </tr>
    <tr>
      <td style="padding:12px;border-bottom:1px solid #334155;color:#94A3B8">Performance Scale</td>
      <td style="padding:12px;border-bottom:1px solid #334155;font-weight:bold;color:#CA8E25">${performanceScale} (${params.score}/100)</td>
    </tr>
    <tr>
      <td style="padding:12px;color:#94A3B8">Recommendation</td>
      <td style="padding:12px;font-weight:bold;color:#FFF">${recommendation}</td>
    </tr>
  </table>

  ${message}

  <p style="margin-top:25px;color:#94A3B8;font-size:13px">
    Please log in to the Kaputra Academy portal to continue the enrollment process.
  </p>

  <br/>
  <p style="margin:0">Regards,<br/><strong style="color:#FFF">Kaputra Academy Team</strong></p>
</div>
`;

  await prisma.emailDraft.create({
    data: {
      type: "PLACEMENT_TEST_RESULT",
      recipient: params.parentEmail,
      subject: `Placement Test Result - ${params.studentName}`,
      bodyHtml: emailHtml,
      status: "PENDING_APPROVAL",
    }
  });

  return { success: true };
}

export interface DetailedEnrollmentEmailParams {
  parentEmail: string;
  parentName?: string;
  studentName: string;

  // Invoice Details
  invoiceNumber?: string;
  paymentDate?: Date | string;
  paymentStatus?: string;
  paymentMethod?: string;
  totalPaid?: number;

  // Program Information
  programType: "Class" | "Camp Program" | "Placement Test";
  programName: string;
  category?: string;

  // Schedule & Location Information
  startDate?: string;
  endDate?: string;
  duration?: string;
  scheduleDetails?: string;
  location?: string;
}

const DEFAULT_NOT_ASSIGNED = "Schedule will be provided by the academy soon.";

function buildProfessionalEmailTemplate(params: DetailedEnrollmentEmailParams): string {
  const invoiceNum = params.invoiceNumber || "INV-OFFICIAL";
  const payDateStr = params.paymentDate
    ? new Date(params.paymentDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    : new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const payMethod = params.paymentMethod || "Virtual Account Payment";
  const formattedPaid = params.totalPaid ? `Rp ${params.totalPaid.toLocaleString("id-ID")}` : "Paid";
  const parentNameStr = params.parentName || "Parent / Guardian";
  const categoryStr = params.category || (params.programType === "Camp Program" ? "Camp Program" : "Regular Class");

  const startDateText = params.startDate || DEFAULT_NOT_ASSIGNED;
  const endDateText = params.endDate || DEFAULT_NOT_ASSIGNED;
  const durationText = params.duration || DEFAULT_NOT_ASSIGNED;
  const scheduleText = params.scheduleDetails || DEFAULT_NOT_ASSIGNED;
  const locationText = params.location || "Kaputra Academy Online Campus (Zoom)";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enrollment Confirmation - Kaputra Academy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F19; font-family: 'Segoe UI', Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B0F19; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 650px; background-color: #0F172A; border: 1px solid #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #020617; padding: 25px 30px; border-bottom: 2px solid #CA8E25;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 900; tracking-wide: 1px;">KAPUTRA ACADEMY</h1>
                    <p style="margin: 4px 0 0 0; color: #CA8E25; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Official Enrollment Receipt</p>
                  </td>
                  <td align="right">
                    <span style="background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10B981; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; display: inline-block;">
                      ✓ PAID
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Confirmation Banner & Friendly Message -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <h2 style="margin: 0 0 12px 0; color: #FFFFFF; font-size: 20px; font-weight: 800;">Enrollment Confirmed! 🎉</h2>
              <p style="margin: 0 0 14px 0; color: #CBD5E1; font-size: 14px; line-height: 1.6;">
                Dear <strong>${parentNameStr}</strong>,
              </p>
              <p style="margin: 0 0 16px 0; color: #CBD5E1; font-size: 14px; line-height: 1.6;">
                Thank you for registering with <strong>Kaputra Academy</strong>! Your payment has been successfully received and your enrollment has been confirmed.
              </p>
              <div style="background-color: rgba(202, 142, 37, 0.08); border-left: 4px solid #CA8E25; padding: 14px 18px; border-radius: 6px;">
                <p style="margin: 0; color: #F1F5F9; font-size: 13px; line-height: 1.6;">
                  We are excited to welcome <strong>${params.studentName}</strong> to Kaputra Academy. If your class schedule has not yet been assigned, our academic coordinator will contact you shortly with further details.
                </p>
              </div>
            </td>
          </tr>

          <!-- Section 1: Invoice & Payment Information -->
          <tr>
            <td style="padding: 10px 30px 15px 30px;">
              <div style="background-color: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px;">
                <h3 style="margin: 0 0 14px 0; color: #CA8E25; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                  💳 Invoice & Payment Summary
                </h3>
                <table width="100%" cellspacing="0" cellpadding="6" style="font-size: 13px; color: #E2E8F0;">
                  <tr>
                    <td width="40%" style="color: #94A3B8;">Invoice Number:</td>
                    <td style="font-weight: 800; font-family: monospace; color: #FFFFFF;">${invoiceNum}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">Payment Date:</td>
                    <td style="font-weight: 600;">${payDateStr}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">Payment Status:</td>
                    <td style="color: #10B981; font-weight: 800;">PAID</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">Payment Method:</td>
                    <td style="font-weight: 600;">${payMethod}</td>
                  </tr>
                  <tr style="border-top: 1px solid #334155;">
                    <td style="color: #94A3B8; padding-top: 10px;">Total Paid:</td>
                    <td style="font-size: 16px; font-weight: 900; color: #CA8E25; padding-top: 10px;">${formattedPaid}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Section 2: Student & Parent Information -->
          <tr>
            <td style="padding: 5px 30px 15px 30px;">
              <div style="background-color: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px;">
                <h3 style="margin: 0 0 14px 0; color: #CA8E25; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                  👤 Student & Parent Information
                </h3>
                <table width="100%" cellspacing="0" cellpadding="6" style="font-size: 13px; color: #E2E8F0;">
                  <tr>
                    <td width="40%" style="color: #94A3B8;">Student Name:</td>
                    <td style="font-weight: 800; color: #FFFFFF;">${params.studentName}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">Parent / Guardian:</td>
                    <td style="font-weight: 600;">${parentNameStr}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">Parent Email:</td>
                    <td style="font-weight: 600; color: #60A5FA;">${params.parentEmail}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Section 3: Program Information -->
          <tr>
            <td style="padding: 5px 30px 15px 30px;">
              <div style="background-color: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px;">
                <h3 style="margin: 0 0 14px 0; color: #CA8E25; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                  📚 Program Information
                </h3>
                <table width="100%" cellspacing="0" cellpadding="6" style="font-size: 13px; color: #E2E8F0;">
                  <tr>
                    <td width="40%" style="color: #94A3B8;">Program Type:</td>
                    <td style="font-weight: 700; color: #FFFFFF;">${params.programType}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">Program Name:</td>
                    <td style="font-weight: 800; color: #CA8E25; font-size: 14px;">${params.programName}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">Category:</td>
                    <td style="font-weight: 600;">${categoryStr}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Section 4: Schedule Information -->
          <tr>
            <td style="padding: 5px 30px 25px 30px;">
              <div style="background-color: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px;">
                <h3 style="margin: 0 0 14px 0; color: #CA8E25; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                  📅 Schedule & Location Information
                </h3>
                <table width="100%" cellspacing="0" cellpadding="6" style="font-size: 13px; color: #E2E8F0;">
                  <tr>
                    <td width="40%" style="color: #94A3B8;">Start Date:</td>
                    <td style="font-weight: 600; color: ${startDateText === DEFAULT_NOT_ASSIGNED ? "#94A3B8" : "#FFFFFF"};">${startDateText}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">End Date:</td>
                    <td style="font-weight: 600; color: ${endDateText === DEFAULT_NOT_ASSIGNED ? "#94A3B8" : "#FFFFFF"};">${endDateText}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">Duration:</td>
                    <td style="font-weight: 600; color: ${durationText === DEFAULT_NOT_ASSIGNED ? "#94A3B8" : "#FFFFFF"};">${durationText}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">Class Schedule:</td>
                    <td style="font-weight: 600; color: ${scheduleText === DEFAULT_NOT_ASSIGNED ? "#94A3B8" : "#FFFFFF"};">${scheduleText}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">Location / Platform:</td>
                    <td style="font-weight: 600; color: #FFFFFF;">${locationText}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #020617; padding: 25px 30px; border-top: 1px solid #1E293B; text-align: center; color: #64748B; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 8px 0; color: #94A3B8; font-weight: 700;">Kaputra Academy Learning Portal</p>
              <p style="margin: 0 0 12px 0;">You can log in to your dashboard at any time to view your class materials and updates.</p>
              <p style="margin: 0;">Need assistance? Reply directly to this email or contact support at <a href="mailto:support@kaputra.com" style="color: #CA8E25; text-decoration: none;">support@kaputra.com</a>.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export type EnrollmentConfirmationEmailParams = (DetailedEnrollmentEmailParams & { learningMethod?: string }) | {
  parentEmail: string;
  studentName: string;
  courseTitle: string;
  learningMethod?: string;
};

export async function sendEnrollmentConfirmationEmail(
  params: EnrollmentConfirmationEmailParams
) {
  let fullParams: DetailedEnrollmentEmailParams;

  if ("programName" in params) {
    fullParams = params;
  } else {
    fullParams = {
      parentEmail: params.parentEmail,
      studentName: params.studentName,
      programType: "Class",
      programName: params.courseTitle,
      category: "Regular Class",
    };
  }

  const emailHtml = buildProfessionalEmailTemplate(fullParams);

  await prisma.emailDraft.create({
    data: {
      type: "ENROLLMENT_CONFIRMATION",
      recipient: fullParams.parentEmail,
      subject: `Enrollment Confirmed - ${fullParams.programName}`,
      bodyHtml: emailHtml,
      status: "PENDING_APPROVAL",
      metadata: JSON.stringify({ learningMethod: params.learningMethod || "SEMI_PRIVATE" }),
    }
  });

  return { success: true };
}

export type CampEnrollmentConfirmationEmailParams = DetailedEnrollmentEmailParams | {
  parentEmail: string;
  studentName: string;
  campName: string;
};

export async function sendCampEnrollmentConfirmationEmail(
  params: CampEnrollmentConfirmationEmailParams
) {
  let fullParams: DetailedEnrollmentEmailParams;

  if ("programName" in params) {
    fullParams = params;
  } else {
    fullParams = {
      parentEmail: params.parentEmail,
      studentName: params.studentName,
      programType: "Camp Program",
      programName: params.campName,
      category: "Camp Program",
    };
  }

  const emailHtml = buildProfessionalEmailTemplate(fullParams);

  await prisma.emailDraft.create({
    data: {
      type: "CAMP_ENROLLMENT_CONFIRMATION",
      recipient: fullParams.parentEmail,
      subject: `Camp Registration Confirmed - ${fullParams.programName}`,
      bodyHtml: emailHtml,
      status: "PENDING_APPROVAL",
    }
  });

  return { success: true };
}

export async function sendAdminActivationEmail(email: string, name: string, token: string) {
  const baseUrl = await getBaseUrl();
  const activationLink = `${baseUrl}/activate-admin?token=${token}`;

  console.log("[ADMIN_EMAIL] baseUrl resolved to:", baseUrl);
  console.log("[ADMIN_EMAIL] Full activation link:", activationLink);
  console.log("[ADMIN_EMAIL] Token in email:", token);

  const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;background:#0F172A;color:#E2E8F0;border-radius:12px;border:1px solid #1E293B;">
  <h2 style="color:#CA8E25;margin:0 0 5px 0;">Kaputra Academy</h2>
  <p style="color:#94A3B8;margin:0 0 20px 0;font-size:13px;">Admin Account Activation</p>
  <hr style="border-color:#1E293B;margin-bottom:20px;"/>

  <p>Dear ${name},</p>
  <p>You have been invited to join the <strong>Kaputra Academy</strong> administrative team.</p>

  <div style="background-color:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;margin:20px 0;">
    <h3 style="margin:0 0 14px 0;color:#CA8E25;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">
      🔑 Account Activation
    </h3>
    <p style="color:#CBD5E1;font-size:13px;margin:0 0 14px 0;">
      Click the button below to set your password and activate your admin account. This link expires in 24 hours.
    </p>
    <a href="${activationLink}" style="display:inline-block;background-color:#10B981;color:#FFF;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
      Activate Admin Account
    </a>
  </div>

  <p style="margin-top:25px;color:#94A3B8;font-size:13px;">
    If you did not expect this invitation, please ignore this email.
  </p>
</div>
`;

  try {
    const info = await transporter.sendMail({
      from: `"Kaputra Academy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Action Required: Activate Your Kaputra Admin Account",
      html: emailHtml,
    });

    await prisma.emailDraft.create({
      data: {
        type: "ACCOUNT_ACTIVATION",
        recipient: email,
        subject: "Action Required: Activate Your Kaputra Admin Account",
        bodyHtml: emailHtml,
        status: "SENT",
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Failed to directly send Admin Activation Email:", error);

    // Fallback to draft if sending fails directly
    await prisma.emailDraft.create({
      data: {
        type: "ACCOUNT_ACTIVATION",
        recipient: email,
        subject: "Action Required: Activate Your Kaputra Admin Account",
        bodyHtml: emailHtml,
        status: "FAILED",
      },
    });

    return { success: false, error: error.message };
  }
}

export async function sendAdminPasswordResetEmail(email: string, name: string, token: string) {
  const baseUrl = await getBaseUrl();
  const resetLink = `${baseUrl}/activate-admin?token=${token}`; // Utilizing the same page for password setup

  const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;background:#0F172A;color:#E2E8F0;border-radius:12px;border:1px solid #1E293B;">
  <h2 style="color:#CA8E25;margin:0 0 5px 0;">Kaputra Academy</h2>
  <p style="color:#94A3B8;margin:0 0 20px 0;font-size:13px;">Admin Password Reset</p>
  <hr style="border-color:#1E293B;margin-bottom:20px;"/>

  <p>Dear ${name},</p>
  <p>A password reset was requested for your <strong>Kaputra Academy</strong> administrative account.</p>

  <div style="background-color:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;margin:20px 0;">
    <h3 style="margin:0 0 14px 0;color:#CA8E25;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">
      🔑 Reset Password
    </h3>
    <p style="color:#CBD5E1;font-size:13px;margin:0 0 14px 0;">
      Click the button below to set a new password. This link expires in 24 hours.
    </p>
    <a href="${resetLink}" style="display:inline-block;background-color:#CA8E25;color:#000;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
      Reset Password
    </a>
  </div>

  <p style="margin-top:25px;color:#94A3B8;font-size:13px;">
    If you did not request this, please contact the Super Admin immediately.
  </p>
</div>
`;

  try {
    const info = await transporter.sendMail({
      from: `"Kaputra Academy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Admin Password Reset - Kaputra Academy",
      html: emailHtml,
    });

    await prisma.emailDraft.create({
      data: {
        type: "ACCOUNT_ACTIVATION",
        recipient: email,
        subject: "Admin Password Reset - Kaputra Academy",
        bodyHtml: emailHtml,
        status: "SENT",
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Failed to directly send Admin Password Reset Email:", error);

    // Fallback
    await prisma.emailDraft.create({
      data: {
        type: "ACCOUNT_ACTIVATION",
        recipient: email,
        subject: "Admin Password Reset - Kaputra Academy",
        bodyHtml: emailHtml,
        status: "FAILED",
      },
    });

    return { success: false, error: error.message };
  }
}

export async function sendUserPasswordResetEmail(email: string, name: string, token: string) {
  const baseUrl = await getBaseUrl();
  const resetLink = `${baseUrl}/reset-password?token=${token}`; 

  const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;background:#0F172A;color:#E2E8F0;border-radius:12px;border:1px solid #1E293B;">
  <div style="text-align:center;margin-bottom:20px;">
    <h2 style="color:#CA8E25;margin:0 0 5px 0;font-size:24px;">KAPUTRA</h2>
    <span style="color:#CA8E25;font-size:12px;letter-spacing:2px;font-weight:bold;">ACADEMY</span>
  </div>
  <p style="color:#94A3B8;margin:0 0 20px 0;font-size:13px;text-align:center;">Password Reset Request</p>
  <hr style="border-color:#1E293B;margin-bottom:20px;"/>

  <p>Dear ${name},</p>
  <p>We received a request to reset your Kaputra Academy password.</p>

  <div style="background-color:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
    <p style="color:#CBD5E1;font-size:13px;margin:0 0 14px 0;">
      Click the button below to securely reset your password.
    </p>
    <a href="${resetLink}" style="display:inline-block;background-color:#CA8E25;color:#000;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
      Reset Password
    </a>
    <p style="margin:14px 0 0 0;color:#ef4444;font-size:11px;font-weight:bold;">
      This link expires in 1 hour.
    </p>
  </div>

  <p style="margin-top:25px;color:#94A3B8;font-size:13px;">
    If you did not request this password reset, please safely ignore this email. Your password will remain unchanged.
  </p>
</div>
`;

  try {
    const info = await transporter.sendMail({
      from: `"Kaputra Academy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password - Kaputra Academy",
      html: emailHtml,
    });

    await prisma.emailDraft.create({
      data: {
        type: "PASSWORD_RESET",
        recipient: email,
        subject: "Reset Your Password - Kaputra Academy",
        bodyHtml: emailHtml,
        status: "SENT",
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Failed to send User Password Reset Email:", error);
    return { success: false, error: error.message };
  }
}

export interface StudentPasswordResetEmailParams {
  parentEmail: string;
  parentName: string;
  studentName: string;
  studentIdStr: string;
  token: string;
}

export async function sendStudentPasswordResetEmail(params: StudentPasswordResetEmailParams) {
  const baseUrl = await getBaseUrl();
  const resetLink = `${baseUrl}/reset-password?token=${params.token}`;

  const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;background:#0F172A;color:#E2E8F0;border-radius:12px;border:1px solid #1E293B;">
  <div style="text-align:center;margin-bottom:20px;">
    <h2 style="color:#CA8E25;margin:0 0 5px 0;font-size:24px;">KAPUTRA</h2>
    <span style="color:#CA8E25;font-size:12px;letter-spacing:2px;font-weight:bold;">ACADEMY</span>
  </div>
  <p style="color:#94A3B8;margin:0 0 20px 0;font-size:13px;text-align:center;">Student Password Reset Request</p>
  <hr style="border-color:#1E293B;margin-bottom:20px;"/>

  <p>Hello ${params.parentName},</p>
  <p>A password reset was requested for the student account:</p>

  <div style="background-color:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;margin:20px 0;">
    <p style="margin:0 0 8px 0;"><strong>Student Name:</strong> <span style="color:#FFF;">${params.studentName}</span></p>
    <p style="margin:0 0 16px 0;"><strong>Student ID:</strong> <span style="color:#FFF;font-family:monospace;">${params.studentIdStr}</span></p>
    
    <p style="color:#CBD5E1;font-size:13px;margin:0 0 14px 0;">
      Click the button below to reset the student's password:
    </p>
    <div style="text-align:center;">
      <a href="${resetLink}" style="display:inline-block;background-color:#CA8E25;color:#000;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
        RESET STUDENT PASSWORD
      </a>
    </div>
    <p style="margin:14px 0 0 0;color:#ef4444;font-size:11px;font-weight:bold;text-align:center;">
      This link will expire after 1 hour.
    </p>
  </div>

  <p style="margin-top:25px;color:#94A3B8;font-size:13px;">
    If you did not request this password reset, you can safely ignore this email.
  </p>
</div>
`;

  try {
    const info = await transporter.sendMail({
      from: `"Kaputra Academy" <${process.env.EMAIL_USER}>`,
      to: params.parentEmail,
      subject: "Reset Password - Kaputra Academy",
      html: emailHtml,
    });

    await prisma.emailDraft.create({
      data: {
        type: "PASSWORD_RESET",
        recipient: params.parentEmail,
        subject: "Reset Password - Kaputra Academy",
        bodyHtml: emailHtml,
        status: "SENT",
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Failed to send Student Password Reset Email:", error);
    return { success: false, error: error.message };
  }
}

