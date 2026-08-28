import prisma from "./db";

// Helper to generate the next Student ID based on initials and DOB (e.g., MDC211006)
export async function generateStudentId(name: string, dobInput: string | Date, dbClient: any = prisma): Promise<string> {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const words = cleanName.split(" ");
  let initials = words.map(w => w.charAt(0)).join("").toUpperCase();
  if (!initials) {
    initials = "KPA"; // Fallback initials
  }

  // Parse DOB
  const dob = typeof dobInput === "string" ? new Date(dobInput) : dobInput;
  const day = String(dob.getDate()).padStart(2, "0");
  const month = String(dob.getMonth() + 1).padStart(2, "0");
  const year = String(dob.getFullYear()).slice(-2); // Get last 2 digits of year (e.g., 2006 -> 06)
  const dobStr = `${day}${month}${year}`;

  const baseId = `${initials}${dobStr}`;

  // Find unique ID in db (check User table) with a single query to avoid connection pool exhaustion
  const existingUsers = await dbClient.user.findMany({
    where: {
      studentIdStr: {
        startsWith: baseId,
      },
    },
    select: {
      studentIdStr: true,
    },
  });


  const existingIds = new Set(
    existingUsers
      .map((u: { studentIdStr: string | null }) => u.studentIdStr)
      .filter((id: string | null): id is string => !!id)
  );

  let studentId = baseId;
  let counter = 2;
  while (existingIds.has(studentId)) {
    studentId = `${baseId}-${counter}`;
    counter++;
  }

  return studentId;
}

// Helper to generate a unique Placement Test Code (e.g., PT-KPA-8X3F9Q)
export async function generatePlacementTestCode(): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  let isUnique = false;

  while (!isUnique) {
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `PT-KPA-${randomPart}`;

    // Verify uniqueness in db
    const existing = await prisma.placementTest.findUnique({
      where: { testCode: code },
    });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
}
