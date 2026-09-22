const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get ALL distinct URL patterns
  const questions = await prisma.mockQuestion.findMany({
    where: { explanationImageUrl: { not: null } },
    select: { id: true, explanationImageUrl: true, imageUrl: true },
  });

  let byPattern = {};
  for (const q of questions) {
    const url = q.explanationImageUrl || '';
    let pattern;
    if (url.startsWith('/uploads/questions/')) pattern = 'CORRECT: /uploads/questions/';
    else if (url.startsWith('/uploads/')) pattern = 'PARTIAL: /uploads/ (no questions/)';
    else if (url.startsWith('data:image')) pattern = 'BASE64';
    else if (url.startsWith('http://') || url.startsWith('https://')) pattern = 'HTTP URL';
    else if (url.length > 200) pattern = 'LIKELY BASE64 (long)';
    else if (url === '') pattern = 'EMPTY';
    else pattern = 'OTHER: ' + url.substring(0, 50);
    
    byPattern[pattern] = (byPattern[pattern] || 0) + 1;
  }
  
  console.log('=== explanationImageUrl patterns ===');
  for (const [p, c] of Object.entries(byPattern)) {
    console.log('  ' + p + ': ' + c);
  }

  // Same for imageUrl
  const qWithImg = questions.filter(q => q.imageUrl);
  let imgPattern = {};
  for (const q of qWithImg) {
    const url = q.imageUrl || '';
    let pattern;
    if (url.startsWith('/uploads/questions/')) pattern = 'CORRECT: /uploads/questions/';
    else if (url.startsWith('/uploads/')) pattern = 'PARTIAL: /uploads/ (no questions/)';
    else if (url.startsWith('data:image')) pattern = 'BASE64';
    else if (url.startsWith('http://') || url.startsWith('https://')) pattern = 'HTTP URL';
    else if (url.length > 200) pattern = 'LIKELY BASE64 (long)';
    else if (url === '') pattern = 'EMPTY';
    else pattern = 'OTHER: ' + url.substring(0, 50);
    imgPattern[pattern] = (imgPattern[pattern] || 0) + 1;
  }
  
  console.log('=== imageUrl patterns ===');
  for (const [p, c] of Object.entries(imgPattern)) {
    console.log('  ' + p + ': ' + c);
  }

  // Sample 5 good ones
  const good = questions.filter(q => q.explanationImageUrl && q.explanationImageUrl.startsWith('/uploads/questions/')).slice(0, 3);
  const partial = questions.filter(q => q.explanationImageUrl && q.explanationImageUrl.startsWith('/uploads/') && !q.explanationImageUrl.startsWith('/uploads/questions/')).slice(0, 3);
  
  if (good.length > 0) {
    console.log('\nSample CORRECT explanationImageUrl:');
    good.forEach(q => console.log('  ' + q.explanationImageUrl));
  }
  if (partial.length > 0) {
    console.log('\nSample PARTIAL explanationImageUrl:');
    partial.forEach(q => console.log('  ' + q.explanationImageUrl));
  }
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e.message); prisma.$disconnect(); });
