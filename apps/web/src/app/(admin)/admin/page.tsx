import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getStaffRedirectPath } from '@/app/actions/auth';

export default async function AdminRootPage() {
  const session = await auth();

  // Enforce staff session restrictions
  if (!session || !session.user || session.user.role === 'CITIZEN') {
    redirect('/admin/login');
  }

  // Redirect staff according to their role
  const targetPath = await getStaffRedirectPath(session.user.role);
  redirect(targetPath);
}
