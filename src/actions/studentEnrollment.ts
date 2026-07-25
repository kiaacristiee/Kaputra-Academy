"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

function getAge(dob: Date | null): number {
  if (!dob) return 10;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export async function selectRegularCourse(studentId: string, courseId: string) {
  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });

    if (!student) throw new Error("Student not found");
    if (!student.parent) throw new Error("Parent account not associated");

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) throw new Error("Course not found");

    // Create Registration for Course Enrollment directly (no Placement Test)
    const registration = await prisma.registration.create({
      data: {
        studentName: student.name,
        studentAge: getAge(student.dateOfBirth),
        parentName: student.parent.name,
        parentPhone: student.parent.phone || "",
        parentEmail: student.parent.email,
        courseId: course.id,
        status: "PENDING_ENROLLMENT_PAYMENT",
      },
    });

    // Payment fee = price + registration fee
    const amount = course.price + course.registrationFee;
    const payment = await prisma.payment.create({
      data: {
        registrationId: registration.id,
        amount: amount,
        status: "PENDING",
      },
    });

    revalidatePath("/student");
    return { success: true, paymentId: payment.id };
  } catch (error: any) {
    console.error("Failed to select regular course:", error);
    return { success: false, error: error.message };
  }
}

export async function selectCompetitionCourse(studentId: string, courseId: string) {
  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });

    if (!student) throw new Error("Student not found");
    if (!student.parent) throw new Error("Parent account not associated");

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) throw new Error("Course not found");

    // Create Registration for Placement Test
    const registration = await prisma.registration.create({
      data: {
        studentName: student.name,
        studentAge: getAge(student.dateOfBirth),
        parentName: student.parent.name,
        parentPhone: student.parent.phone || "",
        parentEmail: student.parent.email,
        courseId: course.id,
        status: "PENDING_PT_PAYMENT",
      },
    });

    // Placement Test fee is fixed at IDR 300,000
    const payment = await prisma.payment.create({
      data: {
        registrationId: registration.id,
        amount: 300000,
        status: "PENDING",
      },
    });

    revalidatePath("/student");
    return { success: true, paymentId: payment.id };
  } catch (error: any) {
    console.error("Failed to select competition course:", error);
    return { success: false, error: error.message };
  }
}

export async function proceedToCompetitionEnrollment(studentId: string, oldRegistrationId: string) {
  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });

    if (!student) throw new Error("Student not found");
    if (!student.parent) throw new Error("Parent account not associated");

    const oldRegistration = await prisma.registration.findUnique({
      where: { id: oldRegistrationId },
      include: { course: true },
    });

    if (!oldRegistration || !oldRegistration.course) {
      throw new Error("Previous registration not found");
    }

    // Create a new Registration representing the course enrollment itself
    const enrollmentRegistration = await prisma.registration.create({
      data: {
        studentName: student.name,
        studentAge: getAge(student.dateOfBirth),
        parentName: student.parent.name,
        parentPhone: student.parent.phone || "",
        parentEmail: student.parent.email,
        courseId: oldRegistration.courseId,
        status: "VERIFYING_ENROLLMENT_PAYMENT", // Ready to upload payment
      },
    });

    const amount = oldRegistration.course.price + oldRegistration.course.registrationFee;

    // Create Payment record for course price
    const payment = await prisma.payment.create({
      data: {
        registrationId: enrollmentRegistration.id,
        amount: amount,
        status: "PENDING",
      },
    });

    // Update status of enrollmentRegistration to PENDING_ENROLLMENT_PAYMENT
    await prisma.registration.update({
      where: { id: enrollmentRegistration.id },
      data: {
        status: "PENDING_ENROLLMENT_PAYMENT",
      },
    });

    revalidatePath("/student");
    return { success: true, paymentId: payment.id };
  } catch (error: any) {
    console.error("Failed to proceed to competition enrollment:", error);
    return { success: false, error: error.message };
  }
}
