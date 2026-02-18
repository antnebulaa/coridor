import getCurrentUser from '@/app/actions/getCurrentUser';
import { redirect } from 'next/navigation';
import PlanManagementClient from './PlanManagementClient';

export default async function AdminPlansPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    redirect('/');
  }

  return <PlanManagementClient />;
}
