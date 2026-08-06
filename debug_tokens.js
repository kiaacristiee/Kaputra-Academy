const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      activationToken: true,
      activationExpires: true,
    }
  });

  if (admins.length === 0) {
    console.log('No admin users found.');
    return;
  }

  admins.forEach(a => {
    console.log('---');
    console.log('Name:', a.name);
    console.log('Email:', a.email);
    console.log('Role:', a.role);
    console.log('isActive:', a.isActive);
    console.log('Token exists:', !!a.activationToken);
    console.log('Token length:', a.activationToken?.length);
    console.log('Token value:', a.activationToken);
    console.log('Expires:', a.activationExpires);
    console.log('Expired?:', a.activationExpires ? new Date() > a.activationExpires : 'N/A');
  });

  // Also test: can we find a user by their activation token?
  const firstWithToken = admins.find(a => a.activationToken);
  if (firstWithToken) {
    console.log('\n=== TOKEN LOOKUP TEST ===');
    console.log('Looking up token:', firstWithToken.activationToken);
    const found = await prisma.user.findUnique({
      where: { activationToken: firstWithToken.activationToken }
    });
    console.log('Found by token?', !!found);
    if (found) {
      console.log('Match email:', found.email);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
