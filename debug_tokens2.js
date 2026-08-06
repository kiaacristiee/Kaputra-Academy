const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check ALL tokens that were ever in emails
  const tokens = [
    '433f1fc254dc9c68dda8d1d4831ee666667574655bc5ac50e2418ae8da668c54',
    'dbfd7c398590b220b6ef03f02f2425508b6997cd01b612074b1fb24b434bde46',
    'cf08f0a82c5e8352ff064eccbc08f556088d605bed6b8b5faf13982bce1577da',
    'b0968313089aba5f2ef249cdad64ed1958e5509cf0bb68c8b5314719c6d47a1a',
    '42815a66f5899289585a472b7343828767c4e3c8819dfac53c26c6ded4d61820',
  ];

  for (const token of tokens) {
    const user = await prisma.user.findUnique({
      where: { activationToken: token },
      select: { email: true, name: true, isActive: true }
    });
    console.log(`Token: ${token.substring(0, 16)}... => ${user ? `Found: ${user.email} (active=${user.isActive})` : 'NOT FOUND'}`);
  }

  // Also check: the email address from the latest email, what is their current token?
  console.log('\n=== Current DB state for recent admins ===');
  const emails = ['kiaacristiee@gmail.com', 'cristiehizkia@gmail.com'];
  for (const email of emails) {
    const u = await prisma.user.findUnique({
      where: { email },
      select: { email: true, role: true, isActive: true, activationToken: true, activationExpires: true }
    });
    if (u) {
      console.log(`${u.email}: role=${u.role}, active=${u.isActive}, token=${u.activationToken ? u.activationToken.substring(0, 16) + '...' : 'NULL'}, expires=${u.activationExpires}`);
    } else {
      console.log(`${email}: USER NOT FOUND`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
