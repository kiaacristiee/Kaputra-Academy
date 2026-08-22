import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating backdated and future-dated invoices to test monthly archiving...");

  // Generate a random student or just pick the first one
  const student = await prisma.user.findFirst({
    where: { role: "STUDENT" }
  });

  if (!student) {
    console.log("No student found. Please create a student first.");
    return;
  }

  // Create an invoice for July 2026 (Last month)
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-TEST-JUL-001",
      studentId: student.id,
      itemId: "TEST-COURSE",
      itemType: "COURSE",
      amount: 150000,
      status: "PAID",
      dueDate: new Date("2026-07-15T10:00:00Z"),
      createdAt: new Date("2026-07-10T10:00:00Z"),
      updatedAt: new Date("2026-07-15T10:00:00Z"),
      itemCategory: "REGULAR",
      learningMethod: "SEMI_PRIVATE"
    }
  });

  // Create an invoice for September 2026 (Next month)
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-TEST-SEP-001",
      studentId: student.id,
      itemId: "TEST-COURSE",
      itemType: "COURSE",
      amount: 150000,
      status: "PENDING",
      dueDate: new Date("2026-09-05T10:00:00Z"),
      createdAt: new Date("2026-09-01T10:00:00Z"),
      updatedAt: new Date("2026-09-01T10:00:00Z"),
      itemCategory: "REGULAR",
      learningMethod: "SEMI_PRIVATE"
    }
  });

  console.log("✅ Successfully created simulated invoices for July 2026 and September 2026!");
  console.log("Check your admin dashboard. The new 'folders' should appear in the Payment Archives list.");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
