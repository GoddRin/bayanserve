import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { prisma } from '@bayanserve/db';

async function main() {
  const email = 'salva.harrold@gmail.com';
  const targetName = 'Marc Harrold Salva';

  console.log(`Updating user ${email} name to "${targetName}"...`);

  const updated = await prisma.user.update({
    where: { email },
    data: {
      fullName: targetName,
    },
  });

  console.log('Update successful!');
  console.log(`ID: ${updated.id}`);
  console.log(`Name: ${updated.fullName}`);
  console.log(`Email: ${updated.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
