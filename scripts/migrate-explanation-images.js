/**
 * migrate-explanation-images.js
 *
 * One-time migration: converts base64 explanationImageUrl values to physical files.
 *
 * Run with:
 *   node scripts/migrate-explanation-images.js
 *
 * What it does:
 *   1. Queries all MockQuestion rows where explanationImageUrl starts with "data:image"
 *   2. Writes each base64 blob to public/uploads/questions/<uuid>.png
 *   3. Updates the DB row with the new /uploads/questions/<uuid>.png URL
 *
 * Safe to run multiple times (idempotent).
 * Does NOT touch rows that already have a /uploads/... URL.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'questions');

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function main() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  // Fetch all questions with base64 explanation images
  const questions = await prisma.mockQuestion.findMany({
    where: {
      explanationImageUrl: {
        startsWith: 'data:image',
      },
    },
    select: { id: true, explanationImageUrl: true },
  });

  console.log(`Found ${questions.length} questions with base64 explanationImageUrl.`);

  let converted = 0;
  let errors = 0;

  for (const q of questions) {
    try {
      const dataUrl = q.explanationImageUrl;
      if (!dataUrl || !dataUrl.startsWith('data:image')) continue;

      // Parse "data:image/png;base64,<data>"
      const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/s);
      if (!match) {
        console.warn(`  [SKIP] ID ${q.id}: Unrecognised data URL format.`);
        continue;
      }

      const mimeType = match[1]; // e.g. "image/png"
      const base64Data = match[2];
      const ext = mimeType.split('/')[1] || 'png';
      const filename = `${generateUuid()}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      const fileUrl = `/uploads/questions/${filename}`;

      // Decode and write to disk
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);

      // Update DB
      await prisma.mockQuestion.update({
        where: { id: q.id },
        data: { explanationImageUrl: fileUrl },
      });

      converted++;
      if (converted % 50 === 0) {
        console.log(`  Progress: ${converted}/${questions.length}...`);
      }
    } catch (err) {
      console.error(`  [ERROR] ID ${q.id}:`, err.message);
      errors++;
    }
  }

  console.log(`\n✅ Migration complete: ${converted} converted, ${errors} errors.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Fatal error:', err);
    prisma.$disconnect();
    process.exit(1);
  });
