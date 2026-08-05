const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ where: { role: { contains: 'ADMIN', mode: 'insensitive' } } });
  console.log(users.map(u => ({ email: u.email, role: u.role })));
  
  // Let's also check for a SUPERADMIN role
  const suAdmin = await prisma.user.findMany({ where: { role: 'SUPERADMIN' } });
  if (suAdmin.length > 0) {
    for (const u of suAdmin) {
      await prisma.user.update({
        where: { id: u.id },
        data: { role: 'SUPER_ADMIN' }
      });
    }
    console.log('Fixed SUPERADMIN role to SUPER_ADMIN');
  }
}
main().finally(() => prisma.$disconnect());
