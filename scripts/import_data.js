require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restore() {
  if (!fs.existsSync('backup_data.json')) {
    console.error('ERROR: backup_data.json file not found!');
    process.exit(1);
  }

  console.log('Reading backup_data.json...');
  const data = JSON.parse(fs.readFileSync('backup_data.json', 'utf8'));

  console.log('Restoring Users...');
  for (const u of data.users) {
    const { parentId, ...userBody } = u;
    await prisma.user.upsert({
      where: { id: u.id },
      update: userBody,
      create: userBody,
    });
  }

  // Restore parent-child relations
  for (const u of data.users) {
    if (u.parentId) {
      await prisma.user.update({
        where: { id: u.id },
        data: { parentId: u.parentId },
      }).catch(() => {});
    }
  }

  console.log('Restoring Categories...');
  for (const cat of data.categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat,
    });
  }

  console.log('Restoring Courses...');
  for (const course of data.courses) {
    await prisma.course.upsert({
      where: { id: course.id },
      update: course,
      create: course,
    });
  }

  console.log('Restoring Camp Programs...');
  for (const camp of data.campPrograms) {
    await prisma.campProgram.upsert({
      where: { id: camp.id },
      update: camp,
      create: camp,
    });
  }

  console.log('Restoring Question Folders...');
  for (const folder of data.questionFolders) {
    const { parentId, ...folderBody } = folder;
    await prisma.questionFolder.upsert({
      where: { id: folder.id },
      update: folderBody,
      create: folderBody,
    });
  }

  // Restore folder hierarchy
  for (const folder of data.questionFolders) {
    if (folder.parentId) {
      await prisma.questionFolder.update({
        where: { id: folder.id },
        data: { parentId: folder.parentId },
      }).catch(() => {});
    }
  }

  console.log('Restoring Mock Questions...');
  for (const q of data.mockQuestions) {
    const { mockTests, ...qBody } = q;
    await prisma.mockQuestion.upsert({
      where: { id: q.id },
      update: qBody,
      create: qBody,
    });
  }

  console.log('Restoring Mock Tests (Quiz Papers)...');
  for (const t of data.mockTests) {
    const { questions, ...tBody } = t;
    await prisma.mockTest.upsert({
      where: { id: t.id },
      update: tBody,
      create: tBody,
    });

    if (questions && questions.length > 0) {
      await prisma.mockTest.update({
        where: { id: t.id },
        data: {
          questions: {
            connect: questions.map((q) => ({ id: q.id })),
          },
        },
      });
    }
  }

  console.log('------------------------------------');
  console.log('SUCCESS: All data successfully restored into MySQL!');
  console.log('------------------------------------');
}

restore()
  .catch((e) => {
    console.error('Restore error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
