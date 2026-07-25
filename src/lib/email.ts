import { transporter } from "@/lib/transporter";

export interface ActivationEmailParams {
  parentEmail: string;
  parentName: string;
  studentName: string;
  studentId: string;
  activationLink: string;
}

export async function sendActivationEmail(params: ActivationEmailParams) {
  // Activation is currently handled on the website.
  // Keeping this function for future use if you decide to switch back to email activation.

  const emailHtml = `
    ============================================================
    TO: ${params.parentEmail}
    SUBJECT: Activate Your Student's Account - Kaputra Academy
    ============================================================
    Dear ${params.parentName},

    Thank you for registering your child at Kaputra Academy.

    Student Name: ${params.studentName}
    Student ID: ${params.studentId}

    Activation Link:
    ${params.activationLink}

    ============================================================
  `;

  console.log("SIMULATED EMAIL SENT (Activation):\n", emailHtml);

  return { success: true };
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
        <p style="color:green;">
          Congratulations! Your child has met the requirements for the
          <strong>Competition Class</strong>.
        </p>
      `
      : `
        <p style="color:#d97706;">
          Your child is recommended to join the
          <strong>Regular Class</strong> to strengthen their academic
          foundation before progressing further.
        </p>
      `;

  const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;border:1px solid #ddd;border-radius:10px">

<h2 style="color:#1E40AF;margin-bottom:0">
Kaputra Academy
</h2>

<p style="color:#666;margin-top:5px">
Placement Test Result
</p>

<hr/>

<p>
Dear ${params.parentName ?? "Parent"},
</p>

<p>
Your child has completed the Placement Test.
</p>

<table style="width:100%;border-collapse:collapse">
<tr>
<td style="padding:8px"><strong>Student</strong></td>
<td style="padding:8px">${params.studentName}</td>
</tr>

<tr>
<td style="padding:8px"><strong>Performance</strong></td>
<td style="padding:8px"><strong>${performanceScale}</strong></td>
</tr>

<tr>
<td style="padding:8px"><strong>Recommendation</strong></td>
<td style="padding:8px">${recommendation}</td>
</tr>
</table>

<br/>

${message}

<p>
Please log in to the Kaputra Academy portal to continue the enrollment process.
</p>

<br/>

Regards,<br/>
<strong>Kaputra Academy</strong>

</div>
`;

  await transporter.sendMail({
    from: `"Kaputra Academy" <${process.env.EMAIL_USER}>`,
    to: params.parentEmail,
    subject: `Placement Test Result - ${params.studentName}`,
    html: emailHtml,
  });

  return { success: true };
}

export interface EnrollmentConfirmationEmailParams {
  parentEmail: string;
  studentName: string;
  courseTitle: string;
}

export async function sendEnrollmentConfirmationEmail(
  params: EnrollmentConfirmationEmailParams
) {
  const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;border:1px solid #ddd;border-radius:10px">

<h2 style="color:#1E40AF">
Kaputra Academy
</h2>

<h3>Enrollment Confirmed</h3>

<p>
Dear Parent,
</p>

<p>
We are pleased to inform you that
<strong>${params.studentName}</strong>
has been successfully enrolled in:
</p>

<p style="font-size:18px;font-weight:bold;color:#1E40AF">
${params.courseTitle}
</p>

<p>
Your child now has full access to the class materials, schedules, and learning resources through the student dashboard.
</p>

<p>
Thank you for choosing Kaputra Academy.
</p>

<br/>

Regards,<br/>
<strong>Kaputra Academy</strong>

</div>
`;

  await transporter.sendMail({
    from: `"Kaputra Academy" <${process.env.EMAIL_USER}>`,
    to: params.parentEmail,
    subject: "Enrollment Confirmed - Kaputra Academy",
    html: emailHtml,
  });

  return { success: true };
}

export interface CampEnrollmentConfirmationEmailParams {
  parentEmail: string;
  studentName: string;
  campName: string;
}

export async function sendCampEnrollmentConfirmationEmail(
  params: CampEnrollmentConfirmationEmailParams
) {
  const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;border:1px solid #ddd;border-radius:10px">

<h2 style="color:#1E40AF">
Kaputra Academy
</h2>

<h3>Camp Registration Confirmed</h3>

<p>
Dear Parent,
</p>

<p>
We are pleased to inform you that
<strong>${params.studentName}</strong>
has been successfully enrolled in the Camp Program:
</p>

<p style="font-size:18px;font-weight:bold;color:#1E40AF">
    ${params.campName}
</p>

<p>
Your child now has full access to the camp program materials, schedules, and learning resources through the student dashboard.
</p>

<p>
Thank you for choosing Kaputra Academy.
</p>

<br/>

Regards,<br/>
<strong>Kaputra Academy</strong>

</div>
`;

  await transporter.sendMail({
    from: `"Kaputra Academy" <${process.env.EMAIL_USER}>`,
    to: params.parentEmail,
    subject: "Camp Registration Confirmed - Kaputra Academy",
    html: emailHtml,
  });

  return { success: true };
}