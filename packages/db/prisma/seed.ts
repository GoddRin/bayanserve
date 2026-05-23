// ============================================================================
// BayanServe — Database Seed Script
// Creates: 1 test LGU (white-label), 1 admin user, 1 citizen user,
//          6 service types, 1 test application, 1 test issued document
// Run:  npx prisma db seed
// ============================================================================

import { PrismaClient, UserRole, ServiceCategory, ApplicationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding BayanServe database...\n');

  // ─── 1. White-label LGU ─────────────────────────────────────────────────────

  const defaultLguName = process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME || 'Municipality of Peñablanca';
  const defaultLguMunicipality = process.env.NEXT_PUBLIC_DEFAULT_LGU_MUNICIPALITY || 'Peñablanca';
  const defaultLguProvince = process.env.NEXT_PUBLIC_DEFAULT_LGU_PROVINCE || 'Cagayan';
  const defaultLguPrimaryColor = process.env.NEXT_PUBLIC_DEFAULT_LGU_PRIMARY_COLOR || '#2d6a2d';
  const defaultLguEmail = process.env.NEXT_PUBLIC_DEFAULT_LGU_EMAIL || 'Penablanca.LGU@negosyocenter.gov.ph';
  const defaultLguPhone = process.env.NEXT_PUBLIC_DEFAULT_LGU_PHONE || '(078) 304-0399';

  const lgu = await prisma.lgu.upsert({
    where: { name: defaultLguName },
    update: {
      municipality: defaultLguMunicipality,
      province: defaultLguProvince,
      primaryColor: defaultLguPrimaryColor,
      contactEmail: defaultLguEmail,
      contactPhone: defaultLguPhone,
      logoUrl: process.env.NEXT_PUBLIC_DEFAULT_LGU_LOGO_URL || undefined,
    },
    create: {
      name: defaultLguName,
      municipality: defaultLguMunicipality,
      province: defaultLguProvince,
      logoUrl: process.env.NEXT_PUBLIC_DEFAULT_LGU_LOGO_URL || null,
      primaryColor: defaultLguPrimaryColor,
      contactEmail: defaultLguEmail,
      contactPhone: defaultLguPhone,
      isActive: true,
    },
  });

  console.log(`✅ LGU created/updated: ${lgu.name} (${lgu.id})`);

  // ─── 2. Admin User (password: "BayanServe@2026") ───────────────────────────

  const hashedPassword = await bcrypt.hash('BayanServe@2026', 12);
  const adminEmail = process.env.NEXT_PUBLIC_DEFAULT_LGU_EMAIL || 'admin@lgu.gov.ph';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: 'LGU Administrator',
      password: hashedPassword,
      isVerified: true,
      mustChangePassword: false,
    },
    create: {
      lguId: lgu.id,
      fullName: 'LGU Administrator',
      email: adminEmail,
      phone: '+639171234567',
      password: hashedPassword,
      nationalId: '0000-0000-0000-0001',
      address: 'Municipal Hall Complex',
      barangay: 'Poblacion',
      role: UserRole.ADMIN,
      isVerified: true,
      mustChangePassword: false,
    },
  });

  console.log(`✅ Admin created: ${admin.email} / BayanServe@2026`);

  // ─── 3. Test Citizen User (for login and tracking) ──────────────────────────

  const citizen = await prisma.user.upsert({
    where: { email: 'juan.delacruz@gmail.com' },
    update: {},
    create: {
      lguId: lgu.id,
      fullName: 'Juan dela Cruz',
      email: 'juan.delacruz@gmail.com',
      phone: '+639189876543',
      nationalId: '1111-2222-3333-4444',
      address: '45 Rizal Street',
      barangay: 'Barangay 1',
      role: UserRole.CITIZEN,
      isVerified: true,
    },
  });

  console.log(`✅ Citizen created: ${citizen.fullName} <${citizen.email}> (${citizen.id})`);

  // ─── 4. Service Types ─────────────────────────────────────────────────────

  const services = [
    {
      name: 'Barangay Clearance',
      category: ServiceCategory.CLEARANCE,
      baseFee: 100.0,
      processingDays: 1,
      requiredDocuments: [
        'Valid ID (any government-issued)',
        'Proof of Residency (utility bill or lease contract)',
        '2x2 ID Photo (white background)',
      ],
    },
    {
      name: 'Community Tax Certificate (Cedula)',
      category: ServiceCategory.CERTIFICATE,
      baseFee: 50.0,
      processingDays: 1,
      requiredDocuments: [
        'Valid ID (any government-issued)',
        'Proof of Income (if employed — payslip or certificate of employment)',
      ],
    },
    {
      name: 'Business Permit',
      category: ServiceCategory.PERMIT,
      baseFee: 500.0,
      processingDays: 7,
      requiredDocuments: [
        'DTI Registration or Business Name Registration',
        'Barangay Clearance',
        'Fire Safety Inspection Certificate',
        'Lease Contract or Land Title (proof of business location)',
        'Community Tax Certificate (Cedula)',
      ],
    },
    {
      name: 'Working Permit',
      category: ServiceCategory.PERMIT,
      baseFee: 200.0,
      processingDays: 2,
      requiredDocuments: [
        'Barangay Clearance',
        'Health Certificate (from RHU or accredited clinic)',
        '2x2 ID Photo (white background)',
      ],
    },
    {
      name: 'Certificate of Indigency',
      category: ServiceCategory.CERTIFICATE,
      baseFee: 0.0,
      processingDays: 1,
      requiredDocuments: [
        'Valid ID (any government-issued)',
        'Proof of Residency (utility bill or lease contract)',
      ],
    },
    {
      name: 'Complaint Filing',
      category: ServiceCategory.COMPLAINT,
      baseFee: 0.0,
      processingDays: 1,
      requiredDocuments: [],
    },
  ];

  const serviceTypesMap: Record<string, string> = {};

  for (const svc of services) {
    const serviceType = await prisma.serviceType.upsert({
      where: {
        lguId_name: { lguId: lgu.id, name: svc.name },
      },
      update: {},
      create: {
        lguId: lgu.id,
        name: svc.name,
        category: svc.category,
        baseFee: svc.baseFee,
        processingDays: svc.processingDays,
        requiredDocuments: svc.requiredDocuments,
        isActive: true,
      },
    });
    serviceTypesMap[svc.name] = serviceType.id;
    console.log(`✅ Service type:  ${serviceType.name} (₱${svc.baseFee})`);
  }

  // ─── 5. Test Application (for QR document verification) ────────────────────

  const testApp = await prisma.application.upsert({
    where: { trackingNumber: 'LGU-2026-000001' },
    update: {},
    create: {
      lguId: lgu.id,
      citizenId: citizen.id,
      serviceTypeId: serviceTypesMap['Barangay Clearance'],
      trackingNumber: 'LGU-2026-000001',
      status: ApplicationStatus.RELEASED,
      formData: {
        fullName: 'Juan dela Cruz',
        email: 'juan.delacruz@gmail.com',
        phone: '09189876543',
        address: '45 Rizal Street',
        barangay: 'Barangay 1',
        purpose: 'Employment Requirement',
      },
      notes: 'Issued on seed database setup.',
    },
  });

  console.log(`✅ Test Application created: ${testApp.trackingNumber}`);

  // ─── 6. Real IssuedDocument with TEST-QR-TOKEN-001 ─────────────────────────

  const testDoc = await prisma.issuedDocument.upsert({
    where: { qrToken: 'TEST-QR-TOKEN-001' },
    update: {},
    create: {
      applicationId: testApp.id,
      lguId: lgu.id,
      documentType: 'Barangay Clearance',
      qrToken: 'TEST-QR-TOKEN-001',
      fileUrl: 'https://supabase.co/storage/v1/object/public/application-documents/test-clearance.pdf',
      issuedBy: admin.id,
      isRevoked: false,
    },
  });

  console.log(`✅ Test Issued Document created with QR Token: ${testDoc.qrToken}`);

  console.log('\n🎉 Seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
