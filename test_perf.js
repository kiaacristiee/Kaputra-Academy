const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.time('dashboard Load');
  
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const todayDay = days[now.getDay()];
  const isSuperAdmin = true;

  console.time('promise.all');
  const [
    totalStudents,
    totalTeachers,
    pendingPayments,
    pendingEmails,
    todaysClasses,
    todaysPrivateClasses,
    revenueMonthAgg,
    unreadChats
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.invoice.count({ 
      where: { 
        status: "WAITING_VERIFICATION",
        ...(!isSuperAdmin && {
          OR: [
            { learningMethod: null },
            { learningMethod: { not: "PRIVATE" } }
          ]
        }) 
      } 
    }),
    prisma.emailDraft.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.schedule.count({ 
      where: { 
        dayOfWeek: todayDay, 
        ...(!isSuperAdmin && { type: { not: "PRIVATE" } })
      } 
    }),
    isSuperAdmin ? prisma.privateSession.count({ where: { date: { gte: startOfDay, lte: endOfDay }, status: "SCHEDULED" } }) : Promise.resolve(0),
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { 
        status: "PAID", 
        paidAt: { gte: startOfMonth },
        ...(!isSuperAdmin && {
          OR: [
            { learningMethod: null },
            { learningMethod: { not: "PRIVATE" } }
          ]
        })
      }
    }),
    prisma.liveChatSession.count({ where: { status: { in: ["NEW", "WAITING_REPLY"] } } })
  ]);
  console.timeEnd('promise.all');

  console.time('registrations');
  const registrations = await prisma.registration.findMany({
    where: {
      ...(!isSuperAdmin && {
        OR: [
          { learningMethod: null },
          { learningMethod: { not: "PRIVATE" } }
        ]
      })
    },
    include: {
      course: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  console.timeEnd('registrations');

  console.timeEnd('dashboard Load');
  console.log("Success");
}
main().catch(console.error).finally(() => prisma.$disconnect());
