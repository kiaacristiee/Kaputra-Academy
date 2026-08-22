const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: 'foo@bar.com', mode: 'insensitive' } }
    });
    console.log('Prisma Insensitive OK:', user);
  } catch(e) {
    console.error('Prisma Error:', e.message);
  }
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
