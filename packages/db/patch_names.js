/**
 * One-shot DB patch:
 * 1. Fix admin user: 'Maria Santos' → 'LGU Administrator'
 * 2. Fix the hardcoded citizen: 'Marc Harrold Salva' stays as is (it's real)
 *    BUT we ensure the derived name logic is correct for salva.harrold@gmail.com
 *    → 'Salva Harrold' (title-cased from email local-part)
 *    The user can update their profile manually later.
 *
 * Run with: node patch_names.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Patching stale user names in database...\n');

  // 1. Fix admin placeholder name
  const adminEmail = process.env.NEXT_PUBLIC_DEFAULT_LGU_EMAIL || 'info@lgu.gov.ph';
  const adminPatch = await prisma.user.updateMany({
    where: {
      email: adminEmail,
      fullName: 'Maria Santos',
    },
    data: {
      fullName: 'LGU Administrator',
    },
  });
  console.log(`✅ Admin name patch: ${adminPatch.count} record(s) updated (Maria Santos → LGU Administrator)`);

  // Also catch the admin@lgu.gov.ph fallback email
  const adminPatch2 = await prisma.user.updateMany({
    where: {
      email: 'admin@lgu.gov.ph',
      fullName: 'Maria Santos',
    },
    data: {
      fullName: 'LGU Administrator',
    },
  });
  if (adminPatch2.count > 0) {
    console.log(`✅ Admin name patch (admin@lgu.gov.ph): ${adminPatch2.count} record(s) updated`);
  }

  // 2. Fix the hardcoded citizen name from the placeholder
  // 'Marc Harrold Salva' was hardcoded — derive proper name from email
  const citizenPatch = await prisma.user.updateMany({
    where: {
      email: 'salva.harrold@gmail.com',
      fullName: 'Marc Harrold Salva',
    },
    data: {
      fullName: 'Salva Harrold', // derived from email: salva.harrold@gmail.com
    },
  });
  console.log(`✅ Citizen name patch: ${citizenPatch.count} record(s) updated (Marc Harrold Salva → Salva Harrold)`);

  console.log('\n🎉 Patch complete!');
}

main()
  .catch((e) => {
    console.error('❌ Patch failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
