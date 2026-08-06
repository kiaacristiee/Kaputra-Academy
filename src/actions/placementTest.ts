"use server";

import prisma from "@/lib/db";

const DEFAULT_CONFIG = {
  passingScore: 60,
  questions: [
    {
      id: "q1",
      question: "If a train travels 120 km in 2 hours, what is its average speed in km/h?",
      options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"],
      correctAnswer: "60 km/h",
    },
    {
      id: "q2",
      question: "Which of the following sentences is grammatically correct?",
      options: [
        "He don't like apples.",
        "She like to read books.",
        "They have went to the store.",
        "We are going to school.",
      ],
      correctAnswer: "We are going to school.",
    },
    {
      id: "q3",
      question: "If all cats are mammals, and all mammals have fur, which of the following is true?",
      options: [
        "All cats have fur.",
        "Some cats do not have fur.",
        "All mammals are cats.",
        "No cats have fur.",
      ],
      correctAnswer: "All cats have fur.",
    },
    {
      id: "q4",
      question: "What is the chemical symbol for water?",
      options: ["CO2", "H2O", "NaCl", "O2"],
      correctAnswer: "H2O",
    },
    {
      id: "q5",
      question: "What is the primary curriculum followed at Kaputra Academy?",
      options: ["Cambridge Curriculum", "Singapore Curriculum", "IB Curriculum", "National Curriculum"],
      correctAnswer: "Singapore Curriculum",
    },
  ],
};

async function getTestConfig() {
  try {
    const block = await prisma.contentBlock.findUnique({
      where: { section: "placement_test_config" },
    });
    if (!block) return DEFAULT_CONFIG;
    return JSON.parse(block.content) as typeof DEFAULT_CONFIG;
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

export async function validateTestCode(studentId: string, code: string) {
  try {
    const test = await prisma.placementTest.findUnique({
      where: { testCode: code },
      include: {
        registration: true,
      },
    });

    if (!test) {
      return { success: false, error: "Invalid Placement Test Code." };
    }

    if (test.studentIdStr !== studentId) {
      return { success: false, error: "Student ID does not match this Test Code." };
    }

    if (test.status === "SUBMITTED" || test.status === "REVIEWED") {
      return { success: false, error: "This Placement Test has already been submitted and the code is used." };
    }

    // Update status to IN_PROGRESS if it was NOT_STARTED
    if (test.status === "NOT_STARTED") {
      await prisma.placementTest.update({
        where: { id: test.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });
    }

    const config = await getTestConfig();

    return {
      success: true,
      testId: test.id,
      studentName: test.registration.studentName,
      status: test.status,
      savedAnswers: test.answers ? JSON.parse(test.answers) : {},
      // Strip correctAnswers for safety! We only return id, question, options to client
      questions: config.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
      })),
    };
  } catch (error: any) {
    console.error("Validation error:", error);
    return { success: false, error: "An error occurred during validation." };
  }
}

export async function saveTestProgress(code: string, answers: Record<string, string>) {
  try {
    await prisma.placementTest.update({
      where: { testCode: code },
      data: {
        answers: JSON.stringify(answers),
      },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Save progress error:", error);
    return { success: false };
  }
}

export async function submitPlacementTest(code: string, answers: Record<string, string>) {
  try {
    const test = await prisma.placementTest.findUnique({
      where: { testCode: code },
      include: {
        registration: {
          include: { course: true },
        },
      },
    });

    if (!test) {
      return { success: false, error: "Placement test not found." };
    }

    if (!test.registration || !test.registration.course) {
      return { success: false, error: "Associated registration or course details not found." };
    }

    const safeAnswers = answers || {};
    const config = await getTestConfig();

    // Auto-grading
    let correctCount = 0;
    const totalQuestions = config.questions.length;
    
    config.questions.forEach((q) => {
      if (safeAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const isQualifiedForCompetition = score >= config.passingScore;

    let targetCourseId = test.registration.courseId;
    let targetAmount = (test.registration.course.price || 0) + (test.registration.course.registrationFee || 0);
    let qualificationStatus: "QUALIFIED" | "NOT_QUALIFIED" = isQualifiedForCompetition ? "QUALIFIED" : "NOT_QUALIFIED";

    if (test.registration.course.type === "COMPETITION") {
      if (isQualifiedForCompetition) {
        qualificationStatus = "QUALIFIED";
      } else {
        qualificationStatus = "NOT_QUALIFIED";
        // Transition registration to Regular Class
        const regularCourse = await prisma.course.findFirst({
          where: { type: "REGULAR" },
        });
        if (regularCourse) {
          targetCourseId = regularCourse.id;
          
          let tuition = 0;
          const method = test.registration.learningMethod;
          const freq = test.registration.sessionsPerWeek || 1;
          
          if (method === "PRIVATE") {
            tuition = freq === 1 ? (regularCourse.pricePrivateOnce ?? 0) : (regularCourse.pricePrivateTwice ?? 0);
          } else {
            tuition = freq === 1 ? (regularCourse.priceSemiPrivateOnce ?? 0) : (regularCourse.priceSemiPrivateTwice ?? 0);
          }
          
          targetAmount = tuition + (regularCourse.registrationFee || 0);

          // Update the Registration record's courseId
          await prisma.registration.update({
            where: { id: test.registrationId },
            data: { courseId: targetCourseId },
          });
        }
      }
    } else {
      if (isQualifiedForCompetition) {
        qualificationStatus = "QUALIFIED";
        // Transition registration to Competition Class
        const competitionCourse = await prisma.course.findFirst({
          where: { type: "COMPETITION" },
        });
        if (competitionCourse) {
          targetCourseId = competitionCourse.id;
          
          let tuition = 0;
          const method = test.registration.learningMethod;
          const freq = test.registration.sessionsPerWeek || 1;
          
          if (method === "PRIVATE") {
            tuition = freq === 1 ? (competitionCourse.pricePrivateOnce ?? 0) : (competitionCourse.pricePrivateTwice ?? 0);
          } else {
            tuition = freq === 1 ? (competitionCourse.priceSemiPrivateOnce ?? 0) : (competitionCourse.priceSemiPrivateTwice ?? 0);
          }
          
          targetAmount = tuition + (competitionCourse.registrationFee || 0);

          // Update the Registration record's courseId
          await prisma.registration.update({
            where: { id: test.registrationId },
            data: { courseId: targetCourseId },
          });
        }
      } else {
        // For Regular Class, they remain in Regular Class but are marked NOT_QUALIFIED for competition.
        qualificationStatus = "NOT_QUALIFIED";
      }
    }

    // Update PlacementTest record
    await prisma.placementTest.update({
      where: { testCode: code },
      data: {
        answers: JSON.stringify(safeAnswers),
        status: "SUBMITTED",
        submittedAt: new Date(),
        score: score,
        qualificationStatus: qualificationStatus,
      },
    });

    // Update corresponding Registration record status
    await prisma.registration.update({
      where: { id: test.registrationId },
      data: {
        status: qualificationStatus,
      },
    });

    // Find studentId for invoice
    let studentId = test.registration.studentId;
    if (!studentId) {
      const studentUser = await prisma.user.findFirst({
        where: { name: test.registration.studentName, role: "STUDENT" },
      });
      studentId = studentUser?.id || "";
    }

    if (studentId) {
      try {
        // Automatically generate Tuition Invoice if not already created
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            studentId,
            itemId: targetCourseId,
            itemType: "CLASS",
          },
        });

        if (!existingInvoice) {
          const count = await prisma.invoice.count();
          const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;
          const virtualAccountNumber = `8800${Math.floor(10000000 + Math.random() * 90000000)}`;
          const dueDate = new Date();
          dueDate.setHours(dueDate.getHours() + 24);

          await prisma.invoice.create({
            data: {
              invoiceNumber,
              studentId: studentId,
              itemId: targetCourseId,
              itemType: "CLASS",
              learningMethod: test.registration.learningMethod,
              sessionsPerWeek: test.registration.sessionsPerWeek || 1,
              amount: targetAmount,
              virtualAccountNumber,
              dueDate,
            },
          });
        }
      } catch (invoiceErr) {
        console.warn("Non-fatal invoice generation error during placement test submission:", invoiceErr);
      }
    }

    // Send result email to the parent (non-blocking)
    try {
      const { sendPlacementTestResultEmail } = await import("@/lib/email");
      await sendPlacementTestResultEmail({
        parentEmail: test.registration.parentEmail,
        parentName: test.registration.parentName,
        studentName: test.registration.studentName,
        score: score,
        qualificationStatus: qualificationStatus,
      });
    } catch (emailError) {
      console.warn("Non-fatal email error during placement test submission:", emailError);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Submit test error:", error);
    return { success: false, error: error.message || "Failed to submit test." };
  }
}

