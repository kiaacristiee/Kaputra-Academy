const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the most recent admin activation emails
  const emails = await prisma.emailDraft.findMany({
    where: { type: 'ACCOUNT_ACTIVATION' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      recipient: true,
      subject: true,
      status: true,
      bodyHtml: true,
      createdAt: true,
    }
  });

  emails.forEach(e => {
    console.log('---');
    console.log('Recipient:', e.recipient);
    console.log('Subject:', e.subject);
    console.log('Status:', e.status);
    console.log('Created:', e.createdAt);
    
    // Extract the activation link from the HTML
    const linkMatch = e.bodyHtml.match(/href="([^"]*activate-admin[^"]*)"/);
    if (linkMatch) {
      console.log('Activation Link:', linkMatch[1]);
      
      // Extract the token from the link
      const tokenMatch = linkMatch[1].match(/token=([^&"]*)/);
      if (tokenMatch) {
        console.log('Token in link:', tokenMatch[1]);
        console.log('Token length in link:', tokenMatch[1].length);
      }
    } else {
      console.log('No activate-admin link found in email body');
      // Try to find any activation link
      const anyLink = e.bodyHtml.match(/href="([^"]*token=[^"]*)"/);
      if (anyLink) {
        console.log('Found link with token:', anyLink[1]);
      }
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
