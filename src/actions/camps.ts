"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

import { isAdminRole } from "@/lib/permissions";

export interface ScheduleInput {
  id?: string;
  dayOfWeek: string; // "FRIDAY" or "SATURDAY"
  startTime: string; // "15:00"
  endTime: string;   // "16:30"
  className: string; // "Class A" or "Class B"
  capacity?: number; // default 4
  teacherId?: string | null;
}

// Fetch all camps for CMS admin
export async function getCamps() {
  try {
    const camps = await prisma.campProgram.findMany({
      include: {
        schedules: {
          include: {
            teacher: {
              select: { id: true, name: true, email: true },
            },
            _count: {
              select: { registrationSlots: true },
            },
          },
          orderBy: [
            { dayOfWeek: "asc" },
            { startTime: "asc" },
            { className: "asc" },
          ],
        },
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, camps };
  } catch (error: any) {
    console.error("Failed to fetch camps:", error);
    return { success: false, error: error.message };
  }
}

// Fetch teachers available for assignment
export async function getTeachersForAssignment() {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return { success: true, teachers };
  } catch (error: any) {
    console.error("Failed to fetch teachers:", error);
    return { success: false, error: error.message };
  }
}

// Helper to check for teacher schedule conflict across all camps
async function checkTeacherConflict(
  teacherId: string,
  dayOfWeek: string,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string
) {
  const existingSchedules = await prisma.campSchedule.findMany({
    where: {
      teacherId,
      dayOfWeek,
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
    },
    include: {
      campProgram: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });

  for (const sched of existingSchedules) {
    // Overlap condition: startA < endB && endA > startB
    if (startTime < sched.endTime && endTime > sched.startTime) {
      return {
        hasConflict: true,
        teacherName: sched.teacher?.name || "Teacher",
        campName: sched.campProgram.name,
        dayOfWeek: sched.dayOfWeek,
        startTime: sched.startTime,
        endTime: sched.endTime,
        className: sched.className,
      };
    }
  }

  return { hasConflict: false };
}

// Create new Camp Program with schedules and frequency pricing
export async function createCamp(data: {
  name: string;
  slug: string;
  description: string;
  thumbnailUrl?: string | null;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  price?: number;
  allow1xWeek: boolean;
  price1xWeek: number;
  allow2xWeek: boolean;
  price2xWeek: number;
  capacity?: number | null;
  status: string;
  visibility: string;
  schedules?: ScheduleInput[];
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdminRole(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    if (!data.allow1xWeek && !data.allow2xWeek) {
      return { success: false, error: "At least one learning frequency (1x/week or 2x/week) must be enabled." };
    }

    if (data.allow1xWeek && (data.price1xWeek === undefined || data.price1xWeek < 0)) {
      return { success: false, error: "Please enter a valid non-negative price for 1x/week frequency." };
    }

    if (data.allow2xWeek && (data.price2xWeek === undefined || data.price2xWeek < 0)) {
      return { success: false, error: "Please enter a valid non-negative price for 2x/week frequency." };
    }

    const existing = await prisma.campProgram.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return { success: false, error: "A camp program with this slug/URL already exists." };
    }

    // Default price fallback for legacy compatibility
    const basePrice = data.allow1xWeek ? data.price1xWeek : data.price2xWeek;

    // Check teacher conflicts in proposed schedules
    const schedulesToCreate = data.schedules && data.schedules.length > 0
      ? data.schedules
      : [
          { dayOfWeek: "FRIDAY", startTime: "15:00", endTime: "16:30", className: "Class A", capacity: 4 },
          { dayOfWeek: "SATURDAY", startTime: "09:00", endTime: "10:30", className: "Class A", capacity: 4 },
          { dayOfWeek: "FRIDAY", startTime: "16:30", endTime: "18:00", className: "Class B", capacity: 4 },
          { dayOfWeek: "SATURDAY", startTime: "10:30", endTime: "12:00", className: "Class B", capacity: 4 },
        ];

    for (const sched of schedulesToCreate) {
      if (sched.teacherId) {
        const conflict = await checkTeacherConflict(
          sched.teacherId,
          sched.dayOfWeek,
          sched.startTime,
          sched.endTime
        );
        if (conflict.hasConflict) {
          return {
            success: false,
            error: `Teacher conflict: ${conflict.teacherName} is already assigned to "${conflict.campName}" (${conflict.className}) on ${conflict.dayOfWeek} (${conflict.startTime}-${conflict.endTime}).`,
          };
        }
      }
    }

    const camp = await prisma.campProgram.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        registrationDeadline: new Date(data.registrationDeadline),
        price: basePrice,
        allow1xWeek: data.allow1xWeek,
        price1xWeek: Number(data.price1xWeek),
        allow2xWeek: data.allow2xWeek,
        price2xWeek: Number(data.price2xWeek),
        capacity: data.capacity || 4,
        status: data.status,
        visibility: data.visibility,
        schedules: {
          create: schedulesToCreate.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            className: s.className,
            capacity: s.capacity || 4,
            teacherId: s.teacherId || null,
          })),
        },
      },
    });

    revalidatePath("/admin/camps");
    return { success: true, camp };
  } catch (error: any) {
    console.error("Failed to create camp:", error);
    return { success: false, error: error.message };
  }
}

// Update Camp Program and schedules
export async function updateCamp(
  id: string,
  data: {
    name: string;
    slug: string;
    description: string;
    thumbnailUrl?: string | null;
    startDate: Date;
    endDate: Date;
    registrationDeadline: Date;
    price?: number;
    allow1xWeek: boolean;
    price1xWeek: number;
    allow2xWeek: boolean;
    price2xWeek: number;
    capacity?: number | null;
    status: string;
    visibility: string;
    schedules?: ScheduleInput[];
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdminRole(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    if (!data.allow1xWeek && !data.allow2xWeek) {
      return { success: false, error: "At least one learning frequency (1x/week or 2x/week) must be enabled." };
    }

    if (data.allow1xWeek && (data.price1xWeek === undefined || data.price1xWeek < 0)) {
      return { success: false, error: "Please enter a valid non-negative price for 1x/week frequency." };
    }

    if (data.allow2xWeek && (data.price2xWeek === undefined || data.price2xWeek < 0)) {
      return { success: false, error: "Please enter a valid non-negative price for 2x/week frequency." };
    }

    const existing = await prisma.campProgram.findFirst({
      where: {
        slug: data.slug,
        NOT: { id },
      },
    });
    if (existing) {
      return { success: false, error: "A camp program with this slug/URL already exists." };
    }

    const basePrice = data.allow1xWeek ? data.price1xWeek : data.price2xWeek;

    // Check teacher schedule conflicts
    if (data.schedules && data.schedules.length > 0) {
      for (const sched of data.schedules) {
        if (sched.teacherId) {
          const conflict = await checkTeacherConflict(
            sched.teacherId,
            sched.dayOfWeek,
            sched.startTime,
            sched.endTime,
            sched.id
          );
          if (conflict.hasConflict) {
            return {
              success: false,
              error: `Teacher conflict: ${conflict.teacherName} is already assigned to "${conflict.campName}" (${conflict.className}) on ${conflict.dayOfWeek} (${conflict.startTime}-${conflict.endTime}).`,
            };
          }
        }
      }
    }

    // Perform update in transaction to handle schedules
    const updatedCamp = await prisma.$transaction(async (tx) => {
      const camp = await tx.campProgram.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          thumbnailUrl: data.thumbnailUrl,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          registrationDeadline: new Date(data.registrationDeadline),
          price: basePrice,
          allow1xWeek: data.allow1xWeek,
          price1xWeek: Number(data.price1xWeek),
          allow2xWeek: data.allow2xWeek,
          price2xWeek: Number(data.price2xWeek),
          capacity: data.capacity || 4,
          status: data.status,
          visibility: data.visibility,
        },
      });

      if (data.schedules) {
        const incomingIds = data.schedules.filter((s) => s.id).map((s) => s.id as string);
        
        // Remove schedules deleted by user
        await tx.campSchedule.deleteMany({
          where: {
            campProgramId: id,
            id: { notIn: incomingIds },
          },
        });

        // Upsert schedules
        for (const s of data.schedules) {
          if (s.id) {
            await tx.campSchedule.update({
              where: { id: s.id },
              data: {
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
                className: s.className,
                capacity: s.capacity || 4,
                teacherId: s.teacherId || null,
              },
            });
          } else {
            await tx.campSchedule.create({
              data: {
                campProgramId: id,
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
                className: s.className,
                capacity: s.capacity || 4,
                teacherId: s.teacherId || null,
              },
            });
          }
        }
      }

      return camp;
    });

    revalidatePath("/admin/camps");
    return { success: true, camp: updatedCamp };
  } catch (error: any) {
    console.error("Failed to update camp:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCamp(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdminRole(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    // Delete relations first
    await prisma.campRegistration.deleteMany({
      where: { campProgramId: id },
    });
    await prisma.campSchedule.deleteMany({
      where: { campProgramId: id },
    });

    const camp = await prisma.campProgram.delete({
      where: { id },
    });

    revalidatePath("/admin/camps");
    return { success: true, camp };
  } catch (error: any) {
    console.error("Failed to delete camp:", error);
    return { success: false, error: error.message };
  }
}

// Fetch single camp with schedules and capacity for enrollment UI
export async function getCampDetails(campId: string) {
  try {
    const camp = await prisma.campProgram.findUnique({
      where: { id: campId },
      include: {
        schedules: {
          include: {
            teacher: {
              select: { id: true, name: true, email: true },
            },
            _count: {
              select: { registrationSlots: true },
            },
          },
          orderBy: [
            { dayOfWeek: "asc" },
            { startTime: "asc" },
            { className: "asc" },
          ],
        },
      },
    });

    if (!camp) {
      return { success: false, error: "Camp Program not found" };
    }

    return { success: true, camp };
  } catch (error: any) {
    console.error("Failed to fetch camp details:", error);
    return { success: false, error: error.message };
  }
}

// Student & Parent facing actions: Available Camps with schedules
export async function getAvailableCamps(studentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Auth validation
    if (session.user.role === "PARENT") {
      const child = await prisma.user.findFirst({
        where: { id: studentId, parentId: session.user.id },
      });
      if (!child) {
        return { success: false, error: "Unauthorized access to child data" };
      }
    } else if (session.user.role === "STUDENT") {
      if (session.user.id !== studentId) {
        return { success: false, error: "Unauthorized access" };
      }
    } else if (!isAdminRole(session.user.role)) {
      return { success: false, error: "Unauthorized role" };
    }

    // Excluded IDs (enrolled or active invoices/registrations)
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, itemType: "CAMP", status: "ACTIVE" },
      select: { itemId: true },
    });

    const invoices = await prisma.invoice.findMany({
      where: {
        studentId,
        itemType: "CAMP",
        status: { in: ["PENDING", "WAITING_VERIFICATION", "PAID"] },
      },
      select: { itemId: true },
    });

    const registrations = await prisma.campRegistration.findMany({
      where: {
        studentId,
        status: { in: ["PENDING_PAYMENT", "VERIFYING_PAYMENT", "APPROVED"] },
      },
      select: { campProgramId: true },
    });

    const excludedIds = Array.from(
      new Set([
        ...enrollments.map((e) => e.itemId),
        ...invoices.map((i) => i.itemId),
        ...registrations.map((r) => r.campProgramId),
      ])
    );

    const availableCamps = await prisma.campProgram.findMany({
      where: {
        visibility: "PUBLISHED",
        status: "OPEN",
        id: { notIn: excludedIds },
      },
      include: {
        schedules: {
          include: {
            teacher: { select: { id: true, name: true } },
            _count: { select: { registrationSlots: true } },
          },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, camps: availableCamps };
  } catch (error: any) {
    console.error("Failed to fetch available camps:", error);
    return { success: false, error: error.message };
  }
}

// Enroll in Camp with session frequency and strict schedule capacity check
export async function enrollInCamp(
  studentId: string,
  campProgramId: string,
  sessionFrequency: "1x_WEEK" | "2x_WEEK",
  scheduleIds: string[]
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user accepted terms
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { acceptedTerms: true },
    });
    if (dbUser && !dbUser.acceptedTerms) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { acceptedTerms: true },
      });
    }

    // Auth validation
    if (session.user.role === "PARENT") {
      const child = await prisma.user.findFirst({
        where: { id: studentId, parentId: session.user.id },
      });
      if (!child) {
        return { success: false, error: "Unauthorized access to child data" };
      }
    } else if (session.user.role === "STUDENT") {
      if (session.user.id !== studentId) {
        return { success: false, error: "Unauthorized access" };
      }
    } else if (!isAdminRole(session.user.role)) {
      return { success: false, error: "Unauthorized role" };
    }

    // Validation of frequency & schedule selection count
    if (sessionFrequency === "1x_WEEK") {
      if (!scheduleIds || scheduleIds.length !== 1) {
        return { success: false, error: "1 Session / Week requires selecting exactly 1 schedule slot." };
      }
    } else if (sessionFrequency === "2x_WEEK") {
      if (!scheduleIds || scheduleIds.length !== 2) {
        return { success: false, error: "2 Sessions / Week requires selecting exactly 2 schedule slots." };
      }
    } else {
      return { success: false, error: "Invalid session frequency selected." };
    }

    // 1. Fetch camp program & student details outside transaction
    const camp = await prisma.campProgram.findUnique({
      where: { id: campProgramId },
      include: { schedules: true },
    });
    if (!camp) {
      return { success: false, error: "Camp Program not found." };
    }

    if (camp.status !== "OPEN" || camp.visibility !== "PUBLISHED") {
      return { success: false, error: "This Camp Program is currently not open for registration." };
    }

    if (sessionFrequency === "1x_WEEK" && !camp.allow1xWeek) {
      return { success: false, error: "1 Session / Week option is not enabled for this camp." };
    }
    if (sessionFrequency === "2x_WEEK" && !camp.allow2xWeek) {
      return { success: false, error: "2 Sessions / Week option is not enabled for this camp." };
    }

    const calculatedPrice = sessionFrequency === "1x_WEEK" ? camp.price1xWeek : camp.price2xWeek;
    const sessionsPerMonth = sessionFrequency === "1x_WEEK" ? 4 : 8;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });
    if (!student) {
      return { success: false, error: "Student record not found." };
    }

    let studentAge = 12;
    if (student.dateOfBirth) {
      const birthYear = new Date(student.dateOfBirth).getFullYear();
      const currentYear = new Date().getFullYear();
      studentAge = currentYear - birthYear;
    }

    // Run concurrency-safe registration in a transaction with extended timeout limits
    const result = await prisma.$transaction(
      async (tx) => {
        // 2. Check if already enrolled or registered
        const existingReg = await tx.campRegistration.findFirst({
          where: {
            studentId,
            campProgramId,
            status: { in: ["PENDING_PAYMENT", "VERIFYING_PAYMENT", "APPROVED"] },
          },
        });
        if (existingReg) {
          throw new Error("You have already registered for this camp program.");
        }

        // 3. Strict Capacity Check per Schedule Slot
        for (const schedId of scheduleIds) {
          const sched = camp.schedules.find((s) => s.id === schedId);
          if (!sched) {
            throw new Error("Selected schedule slot does not exist in this camp.");
          }

          const currentBookedCount = await tx.campRegistrationSlot.count({
            where: { campScheduleId: schedId },
          });

          if (currentBookedCount >= sched.capacity) {
            throw new Error(
              `Schedule slot (${sched.className} - ${sched.dayOfWeek} ${sched.startTime}) is fully booked (Max ${sched.capacity} students). Please choose another schedule.`
            );
          }
        }

        // 4. Create CampRegistration record
        const registration = await tx.campRegistration.create({
          data: {
            studentId,
            studentName: student.name,
            studentAge,
            parentName: student.parent?.name || "Parent",
            parentPhone: student.parent?.phone || "",
            parentEmail: student.parent?.email || "",
            campProgramId,
            sessionFrequency,
            sessionsPerMonth,
            price: calculatedPrice,
            status: "PENDING_PAYMENT",
            slots: {
              create: scheduleIds.map((schedId) => ({
                campScheduleId: schedId,
              })),
            },
          },
        });

        // 5. Generate Invoice
        const count = await tx.invoice.count();
        const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${(count + 1).toString().padStart(4, "0")}`;
        const virtualAccountNumber = "7000686799";

        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + 24);

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            studentId,
            itemId: campProgramId,
            itemType: "CAMP",
            amount: calculatedPrice,
            virtualAccountNumber,
            dueDate,
          },
        });

        return { registration, invoice };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    // Auto-generate invoice draft for admin review
    try {
      const { createOrUpdateInvoiceEmailDraft } = await import("@/lib/invoiceDraft");
      await createOrUpdateInvoiceEmailDraft(result.invoice.id);
    } catch (draftErr) {
      console.error("Failed to auto-generate camp invoice draft:", draftErr);
    }

    revalidatePath("/student/invoices");
    revalidatePath("/parent/invoices");
    revalidatePath("/admin/emails");
    revalidatePath("/admin/camps");

    return { success: true, invoiceId: result.invoice.id };
  } catch (error: any) {
    console.error("Failed to enroll in camp:", error);
    return { success: false, error: error.message };
  }
}

export async function getPublishedCamps() {
  try {
    const camps = await prisma.campProgram.findMany({
      where: {
        visibility: "PUBLISHED",
        status: "OPEN",
      },
      include: {
        schedules: {
          include: {
            teacher: { select: { id: true, name: true } },
            _count: { select: { registrationSlots: true } },
          },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, camps: JSON.parse(JSON.stringify(camps)) };
  } catch (error: any) {
    console.error("Failed to fetch public camps:", error);
    return { success: false, error: error.message };
  }
}

export async function uploadCampThumbnail(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdminRole(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("thumbnailFile") as File;
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" };
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Please upload a valid image file" };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "camps");

    let thumbnailUrl: string;

    try {
      await mkdir(uploadDir, { recursive: true });
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      thumbnailUrl = `/uploads/camps/${filename}`;
    } catch (fsError) {
      console.warn("Serverless disk write fallback activated:", fsError);
      const base64Data = buffer.toString("base64");
      thumbnailUrl = `data:${file.type};base64,${base64Data}`;
    }

    return { success: true, thumbnailUrl };
  } catch (error: any) {
    console.error("Failed to upload camp thumbnail:", error);
    return { success: false, error: error.message };
  }
}
