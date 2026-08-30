import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkAllMockTests() {
  const allTests = await prisma.mockTest.findMany({
    select: {
      id: true,
      title: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true,
      courseId: true,
    },
    orderBy: { updatedAt: "desc" }
  });

  console.log(`TOTAL_MOCK_TESTS: ${allTests.length}`);
  console.log(JSON.stringify(allTests, null, 2));
}

checkAllMockTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
