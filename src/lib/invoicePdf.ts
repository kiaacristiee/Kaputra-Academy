import { jsPDF } from "jspdf";

export interface InvoicePdfItem {
  no: number;
  date: string;
  description: string;
  unitPrice: number;
  amount: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  studentName: string;
  studentIdStr: string;
  parentName: string;
  parentEmail: string;
  programName: string;
  learningMethod?: string;
  sessionsPerWeek?: number;
  items: InvoicePdfItem[];
  subtotal: number;
  discount?: number;
  total: number;
  bankName?: string;
  bankAccountNo?: string;
  bankAccountHolder?: string;
  notes?: string;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateInvoicePDF(data: InvoicePdfData): { pdfBuffer: Buffer; base64: string } {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const bankName = data.bankName || "BCA (Bank Central Asia)";
  const bankAccountNo = data.bankAccountNo || "7000686799";
  const bankAccountHolder = data.bankAccountHolder || "ANDI JULIO KAPUTRA";

  // Palette
  const navy = [15, 23, 42]; // #0F172A
  const gold = [202, 142, 37]; // #CA8E25
  const slateDark = [30, 41, 59]; // #1E293B
  const slateMuted = [100, 116, 139]; // #64748B
  const lightBg = [248, 250, 252]; // #F8FAFC

  // Header Banner
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 42, "F");

  // Gold accent bar below header
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(0, 42, pageWidth, 2, "F");

  // Header Content - Left: Logo & Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("KAPUTRA ACADEMY", 15, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(202, 142, 37);
  doc.text("EXCELLENCE IN MATHEMATICS & SCIENCE", 15, 24);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Jakarta, Indonesia  |  support@kaputra.com", 15, 30);

  // Header Content - Right: INVOICE title & number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(202, 142, 37);
  doc.text("INVOICE", pageWidth - 15, 18, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`# ${data.invoiceNumber}`, pageWidth - 15, 25, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Date: ${data.invoiceDate}`, pageWidth - 15, 31, { align: "right" });
  doc.text(`Due: ${data.dueDate}`, pageWidth - 15, 36, { align: "right" });

  // Bill To & Summary Boxes (Y = 50 to 88)
  let startY = 50;

  // BILL TO Box (Left)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(15, startY, 88, 38, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, startY, 88, 38, 3, 3, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.text("TAGIHAN KEPADA / BILL TO", 20, startY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(data.parentName || "Orang Tua / Wali", 20, startY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Email: ${data.parentEmail || "—"}`, 20, startY + 20);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`Siswa: ${data.studentName}`, 20, startY + 26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.text(`Student ID: ${data.studentIdStr}`, 20, startY + 32);

  // PROGRAM DETAILS Box (Right)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(107, startY, 88, 38, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(107, startY, 88, 38, 3, 3, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.text("RINCIAN PROGRAM / PROGRAM DETAILS", 112, startY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(data.programName, 112, startY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  if (data.learningMethod) {
    const methodStr = data.learningMethod === "PRIVATE" ? "Private Class" : "Semi-Private Class";
    const freqStr = data.sessionsPerWeek ? ` (${data.sessionsPerWeek}x per minggu)` : "";
    doc.text(`Metode: ${methodStr}${freqStr}`, 112, startY + 20);
  } else {
    doc.text("Metode: Standard Program", 112, startY + 20);
  }

  doc.text(`No. Invoice: ${data.invoiceNumber}`, 112, startY + 26);
  doc.text(`Jatuh Tempo: ${data.dueDate}`, 112, startY + 32);

  // Itemized Table Header (Y = 94)
  let tableY = 96;
  const colX = {
    no: 15,
    date: 27,
    desc: 60,
    price: 135,
    amount: 195,
  };

  // Header background
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(15, tableY, pageWidth - 30, 9, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("NO.", colX.no + 2, tableY + 6);
  doc.text("TANGGAL", colX.date, tableY + 6);
  doc.text("DESKRIPSI / ITEM", colX.desc, tableY + 6);
  doc.text("HARGA SATUAN", colX.price, tableY + 6, { align: "right" });
  doc.text("JUMLAH", colX.amount, tableY + 6, { align: "right" });

  tableY += 9;

  // Table Body Rows
  const items = data.items && data.items.length > 0 ? data.items : [
    {
      no: 1,
      date: data.invoiceDate,
      description: data.programName,
      unitPrice: data.total,
      amount: data.total,
    },
  ];

  items.forEach((item, index) => {
    const rowHeight = 10;
    if (index % 2 === 0) {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(15, tableY, pageWidth - 30, rowHeight, "F");
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(15, tableY + rowHeight, pageWidth - 15, tableY + rowHeight);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

    doc.text(String(item.no || index + 1), colX.no + 2, tableY + 6.5);
    doc.text(item.date || data.invoiceDate, colX.date, tableY + 6.5);
    doc.text(item.description, colX.desc, tableY + 6.5);
    doc.text(formatRupiah(item.unitPrice), colX.price, tableY + 6.5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatRupiah(item.amount), colX.amount, tableY + 6.5, { align: "right" });

    tableY += rowHeight;
  });

  tableY += 6;

  // Totals Section (Right Box)
  const totalsWidth = 80;
  const totalsX = pageWidth - 15 - totalsWidth;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text("Subtotal:", totalsX, tableY);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(formatRupiah(data.subtotal || data.total), pageWidth - 15, tableY, { align: "right" });

  if (data.discount && data.discount > 0) {
    tableY += 6;
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text("Diskon:", totalsX, tableY);
    doc.setTextColor(220, 38, 38);
    doc.text(`- ${formatRupiah(data.discount)}`, pageWidth - 15, tableY, { align: "right" });
  }

  tableY += 6;

  // Total Box with Gold Accent
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.roundedRect(totalsX - 5, tableY - 4, totalsWidth + 5, 11, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(202, 142, 37);
  doc.text("TOTAL BAYAR:", totalsX, tableY + 3);

  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(formatRupiah(data.total), pageWidth - 15, tableY + 3, { align: "right" });

  tableY += 20;

  // Bottom Section: Payment Info (Left) & Signature (Right)
  const bottomY = Math.max(tableY, 190);

  // PAYMENT INFO Box (Left)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(15, bottomY, 100, 42, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, bottomY, 100, 42, 3, 3, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.text("INFORMASI PEMBAYARAN / PAYMENT INFO", 20, bottomY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text("Bank Name:", 20, bottomY + 15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(bankName, 52, bottomY + 15);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text("No. Rekening:", 20, bottomY + 22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(bankAccountNo, 52, bottomY + 22);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text("Atas Nama:", 20, bottomY + 29);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(bankAccountHolder, 52, bottomY + 29);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text("* Harap sertakan No. Invoice pada berita transfer.", 20, bottomY + 36);

  // SIGNATURE Box (Right)
  const sigX = 135;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text("Hormat kami,", sigX + 15, bottomY + 8);
  doc.setFont("helvetica", "bold");
  doc.text("KAPUTRA ACADEMY", sigX + 15, bottomY + 14);

  // Digital Signature Stamp Box
  doc.setDrawColor(202, 142, 37);
  doc.setLineWidth(0.5);
  doc.roundedRect(sigX + 12, bottomY + 18, 42, 16, 2, 2, "D");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(202, 142, 37);
  doc.text("OFFICIAL STAMP", sigX + 33, bottomY + 25, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("VERIFIED & APPROVED", sigX + 33, bottomY + 30, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text("Finance Department", sigX + 15, bottomY + 40);

  // Page Footer
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 287, pageWidth, 10, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Thank you for choosing Kaputra Academy for your educational journey.", pageWidth / 2, 293, { align: "center" });

  // Output
  const arrayBuffer = doc.output("arraybuffer");
  const pdfBuffer = Buffer.from(arrayBuffer);
  const base64 = pdfBuffer.toString("base64");

  return { pdfBuffer, base64 };
}
