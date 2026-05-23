import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the apps/api/.env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { prisma } from '@bayanserve/db';
import { sendNotification } from '../services/notificationService';

async function runVerification() {
  let testEmail = process.env.TEST_EMAIL_RECIPIENT;
  
  if (!testEmail || testEmail.trim().length === 0 || testEmail.includes('your.email@gmail.com') || testEmail.includes('your.test.email@gmail.com')) {
    console.log('ℹ️ TEST_EMAIL_RECIPIENT is not configured in .env. Falling back to citizen@bayanserve.gov.ph for Ethereal SMTP preview testing.');
    testEmail = 'citizen@bayanserve.gov.ph';
  }

  console.log(`🚀 Starting notification verification process sending to: ${testEmail}`);

  // Find a real LGU from the database to use, ensuring proper foreign key relationships
  const dbLgu = await prisma.lgu.findFirst();
  if (!dbLgu) {
    console.warn('⚠️ WARNING: No LGU found in database. Running script with fallback values (DB persistence might fail due to foreign key constraints).');
  }

  const lguId = dbLgu?.id || 'lgu-demo-id';
  const lguName = dbLgu?.name || 'Lungsod ng Tuguegarao';
  const lguAddress = dbLgu?.municipality && dbLgu?.province
    ? `${dbLgu.municipality}, ${dbLgu.province}`
    : 'City Hall, Carig Sur, Tuguegarao City, Cagayan';
  const lguPhone = dbLgu?.contactPhone || '(078) 304-1111';
  const lguLogo = dbLgu?.logoUrl || ''; // Empty to test fallback circular badge initials
  const lguColor = dbLgu?.primaryColor || '#1a3c6e';

  // Mock data definitions
  const citizen = {
    name: 'Juan Dela Cruz',
    email: testEmail
  };

  const application = {
    tracking_number: 'BS-2026-9876543',
    service_name: 'Barangay Clearance Certificate',
    amount: 150.00,
    lgu_id: lguId
  };

  const lgu = {
    name: lguName,
    address: lguAddress,
    phone: lguPhone,
    logo_url: lguLogo,
    primary_color: lguColor
  };

  const notificationTypes = [
    'APPLICATION_SUBMITTED',
    'UNDER_REVIEW',
    'PENDING_PAYMENT',
    'APPROVED',
    'REJECTED',
    'DOCUMENT_READY'
  ] as const;

  for (const type of notificationTypes) {
    let extras: Record<string, string> = {};

    if (type === 'APPLICATION_SUBMITTED') {
      extras = { processing_days: '3' };
    } else if (type === 'UNDER_REVIEW') {
      extras = { expected_completion_date: 'May 28, 2026', processing_days: '3' };
    } else if (type === 'PENDING_PAYMENT') {
      // no special extras needed
    } else if (type === 'APPROVED') {
      extras = { estimated_release_date: 'May 25, 2026', processing_days: '3' };
    } else if (type === 'REJECTED') {
      extras = { remarks: 'Hindi malinaw ang isinagawang pirma sa application form. Mangyaring maglakip ng valid government ID na may malinaw na lagda.' };
    } else if (type === 'DOCUMENT_READY') {
      extras = { download_url: 'https://demo-s3-bucket.s3.ap-southeast-1.amazonaws.com/barangay_clearance.pdf' };
    }

    try {
      console.log(`\n⏳ Sending [${type}] email...`);
      await sendNotification(type, citizen, application, lgu, extras);
      console.log(`✅ [${type}] email sent to ${testEmail}`);
    } catch (err: any) {
      console.error(`❌ [${type}] failed: ${err.message}`);
    }

    // Delay 2 seconds to avoid Gmail rate limits
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n🎉 Finished sending all verification notifications.');
}

runVerification()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n💥 Verification failed with critical error:');
    console.error(err.message);
    process.exit(1);
  });
