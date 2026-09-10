require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function backup() {
  console.log('Fetching users...');
  const users = await prisma.user.findMany();

  console.log('Fetching categories...');
  const categories = await prisma.category.findMany();

  console.log('Fetching courses...');
  const courses = await prisma.course.findMany();

  console.log('Fetching question folders...');
  const questionFolders = await prisma.questionFolder.findMany();

  console.log('Fetching mock questions in batches...');
  let mockQuestions = [];
  let skip = 0;
  const take = 100;
  while (true) {
    console.log(`  Fetching questions ${skip} to ${skip + take}...`);
    const batch = await prisma.mockQuestion.findMany({ skip, take });
    if (batch.length === 0) break;
    mockQuestions.push(...batch);
    skip += take;
  }

  console.log('Fetching mock tests...');
  const mockTests = await prisma.mockTest.findMany({
    include: {
      questions: { select: { id: true } }
    }
  });

  console.log('Fetching camp programs...');
  const campPrograms = await prisma.campProgram.findMany();

  console.log('Fetching camp schedules...');
  const campSchedules = await prisma.campSchedule.findMany();

  const backupData = {
    users,
    categories,
    courses,
    questionFolders,
    mockQuestions,
    mockTests,
    campPrograms,
    campSchedules
  };

  fs.writeFileSync('backup_data.json', JSON.stringify(backupData, null, 2));
  console.log('------------------------------------');
  console.log('SUCCESS: Exported all data to backup_data.json');
  console.log('Users:', users.length);
  console.log('Courses:', courses.length);
  console.log('Folders:', questionFolders.length);
  console.log('Questions:', mockQuestions.length);
  console.log('Mock Tests (Papers):', mockTests.length);
  console.log('------------------------------------');
}

backup()
  .catch((e) => {
    console.error('Backup error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
