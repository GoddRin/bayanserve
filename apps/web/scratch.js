const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const apps = await prisma.application.findMany({
      include: {
        documents: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5
    });

    const docs = await prisma.applicationDocument.findMany();
    console.log('All documents in database:');
    for (const doc of docs) {
      console.log(`- Document ID: ${doc.id}`);
      console.log(`  Filename: ${doc.filename}`);
      console.log(`  File Type: ${doc.fileType}`);
      console.log(`  File URL: ${doc.fileUrl}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
