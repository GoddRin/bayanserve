import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { prisma } from '@bayanserve/db';

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('--- Last 10 Users ---');
  users.forEach((u) => {
    console.log(`ID: ${u.id}`);
    console.log(`Name: ${u.fullName}`);
    console.log(`Email: ${u.email}`);
    console.log(`Phone: ${u.phone}`);
    console.log(`Role: ${u.role}`);
    console.log(`OTP Code: ${u.otpCode}`);
    console.log(`OTP Expires: ${u.otpExpiresAt}`);
    console.log('---------------------');
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
