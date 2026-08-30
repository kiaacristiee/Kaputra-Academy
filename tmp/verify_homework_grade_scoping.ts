import prisma from "../src/lib/db";
import {
  canUserAccessHomework,
  getHomeworkVisibilityWhereClause,
  getStudentGrades,
} from "../src/lib/homeworkScope";

async function runTests() {
  console.log("=== RUNNING GRADE-BASED HOMEWORK SCOPE VERIFICATION ===");

  try {
    // 1. Create Mock Student Grade 1 & Registration Grade 1
    const student1 = await prisma.user.create({
      data: {
        name: "Test Student Grade 1",
        email: `test_g1_${Date.now()}@example.com`,
        passwordHash: "dummy",
        role: "STUDENT",
      },
    });

    const student2 = await prisma.user.create({
      data: {
        name: "Test Student Grade 2",
        email: `test_g2_${Date.now()}@example.com`,
        passwordHash: "dummy",
        role: "STUDENT",
      },
    });

    // Create Course
    const course = await prisma.course.create({
      data: {
        title: "Test Math Course",
        slug: `test-math-${Date.now()}`,
        shortDescription: "Short",
        fullDescription: "Full",
        objectives: "Obj",
        learningOutcomes: "Outcomes",
        schedule: "Mon 9am",
        price: 100,
        category: {
          create: {
            name: `Test Cat ${Date.now()}`,
            slug: `test-cat-${Date.now()}`,
          },
        },
      },
    });

    // Register student 1 as Grade 1
    await prisma.registration.create({
      data: {
        studentId: student1.id,
        studentName: student1.name,
        studentAge: 7,
        parentName: "Parent 1",
        parentPhone: "123",
        parentEmail: "p1@example.com",
        courseId: course.id,
        grade: "GRADE_1",
        status: "APPROVED",
      },
    });

    // Register student 2 as Grade 2
    await prisma.registration.create({
      data: {
        studentId: student2.id,
        studentName: student2.name,
        studentAge: 8,
        parentName: "Parent 2",
        parentPhone: "123",
        parentEmail: "p2@example.com",
        courseId: course.id,
        grade: "GRADE_2",
        status: "APPROVED",
      },
    });

    // Create Homework Grade 1
    const hw1 = await prisma.mockTest.create({
      data: {
        title: "Grade 1 Math Quiz",
        timeLimit: 15,
        passingScore: 70,
        isPublished: true,
        targetedGrade: "GRADE_1",
        courseId: course.id,
      },
    });

    // Create Homework Grade 2
    const hw2 = await prisma.mockTest.create({
      data: {
        title: "Grade 2 Math Quiz",
        timeLimit: 15,
        passingScore: 70,
        isPublished: true,
        targetedGrade: "GRADE_2",
        courseId: course.id,
      },
    });

    // Create Homework targeting Grade 1 & Grade 2
    const hwMulti = await prisma.mockTest.create({
      data: {
        title: "Combined Grades 1 & 2 Quiz",
        timeLimit: 15,
        passingScore: 70,
        isPublished: true,
        targetedGrades: JSON.stringify(["GRADE_1", "GRADE_2"]),
        courseId: course.id,
      },
    });

    // Test 1: Active Grade Resolution
    const s1Grades = await getStudentGrades(student1.id);
    const s2Grades = await getStudentGrades(student2.id);
    console.log("✓ Student 1 Grades:", s1Grades, "(Expected: ['GRADE_1'])");
    console.log("✓ Student 2 Grades:", s2Grades, "(Expected: ['GRADE_2'])");

    // Test 2: Access Checks for Grade 1 Student
    const s1CanAccessHw1 = await canUserAccessHomework(student1, hw1.id);
    const s1CanAccessHw2 = await canUserAccessHomework(student1, hw2.id);
    const s1CanAccessMulti = await canUserAccessHomework(student1, hwMulti.id);

    console.log("✓ Grade 1 Student Access HW1 (Grade 1):", s1CanAccessHw1, "(Expected: true)");
    console.log("✓ Grade 1 Student Access HW2 (Grade 2):", s1CanAccessHw2, "(Expected: false)");
    console.log("✓ Grade 1 Student Access Multi (G1 & G2):", s1CanAccessMulti, "(Expected: true)");

    // Test 3: Access Checks for Grade 2 Student
    const s2CanAccessHw1 = await canUserAccessHomework(student2, hw1.id);
    const s2CanAccessHw2 = await canUserAccessHomework(student2, hw2.id);

    console.log("✓ Grade 2 Student Access HW1 (Grade 1):", s2CanAccessHw1, "(Expected: false)");
    console.log("✓ Grade 2 Student Access HW2 (Grade 2):", s2CanAccessHw2, "(Expected: true)");

    // Test 4: Database Query Visibility Scope
    const s1Where = await getHomeworkVisibilityWhereClause(student1);
    const s1VisibleTests = await prisma.mockTest.findMany({
      where: {
        AND: [{ id: { in: [hw1.id, hw2.id, hwMulti.id] } }, s1Where],
      },
    });

    const visibleTitles = s1VisibleTests.map((t) => t.title);
    console.log("✓ Grade 1 Visible Tests Query:", visibleTitles);

    if (
      visibleTitles.includes("Grade 1 Math Quiz") &&
      visibleTitles.includes("Combined Grades 1 & 2 Quiz") &&
      !visibleTitles.includes("Grade 2 Math Quiz")
    ) {
      console.log("✅ ALL DB SCOPING AND VISIBILITY TESTS PASSED!");
    } else {
      console.error("❌ DB SCOPING TEST FAILED");
    }

    // Cleanup test data
    await prisma.mockTest.deleteMany({
      where: { id: { in: [hw1.id, hw2.id, hwMulti.id] } },
    });
    await prisma.registration.deleteMany({
      where: { studentId: { in: [student1.id, student2.id] } },
    });
    await prisma.course.delete({ where: { id: course.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [student1.id, student2.id] } },
    });
    console.log("✓ Cleanup finished.");
  } catch (error) {
    console.error("Verification failed with error:", error);
  }
}

runTests();
