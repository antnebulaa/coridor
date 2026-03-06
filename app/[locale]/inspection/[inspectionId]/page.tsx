import prisma from '@/libs/prismadb';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ inspectionId: string; locale: string }>;
}

export default async function InspectionRedirectPage({ params }: PageProps) {
  const { inspectionId, locale } = await params;

  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      rooms: { select: { id: true, isCompleted: true }, orderBy: { order: 'asc' } },
    },
  });

  if (!inspection) {
    redirect(`/${locale}/dashboard`);
  }

  // Determine where to redirect based on inspection state
  if (inspection.status === 'SIGNED' || inspection.status === 'LOCKED' || inspection.status === 'AMENDED') {
    redirect(`/${locale}/inspection/${inspectionId}/done`);
  }

  if (inspection.status === 'CANCELLED') {
    redirect(`/${locale}/dashboard`);
  }

  if (inspection.status === 'PENDING_SIGNATURE') {
    redirect(`/${locale}/inspection/${inspectionId}/sign`);
  }

  const isExit = inspection.type === 'EXIT';

  // DRAFT: find the current step
  // EXIT inspections skip meters (already done at entry) → go straight to rooms
  if (!isExit) {
    const hasMeters = await prisma.inspectionMeter.count({ where: { inspectionId } });
    if (hasMeters === 0) {
      redirect(`/${locale}/inspection/${inspectionId}/meters`);
    }
  }

  const allRoomsComplete = inspection.rooms.length > 0 && inspection.rooms.every((r) => r.isCompleted);
  if (allRoomsComplete) {
    redirect(`/${locale}/inspection/${inspectionId}/recap`);
  }

  // Find first incomplete room
  const incompleteRoom = inspection.rooms.find((r) => !r.isCompleted);
  if (incompleteRoom) {
    redirect(`/${locale}/inspection/${inspectionId}/rooms/${incompleteRoom.id}`);
  }

  // Default: rooms hub
  redirect(`/${locale}/inspection/${inspectionId}/rooms`);
}
