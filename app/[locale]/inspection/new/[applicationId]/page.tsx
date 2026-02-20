import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { redirect } from 'next/navigation';
import InspectionHomeClient from './InspectionHomeClient';

interface PageProps {
  params: Promise<{ applicationId: string; locale: string }>;
}

export default async function InspectionNewPage({ params }: PageProps) {
  const { applicationId, locale } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/${locale}/`);
  }

  const application = await prisma.rentalApplication.findUnique({
    where: { id: applicationId },
    include: {
      listing: {
        include: {
          rentalUnit: {
            include: {
              property: {
                select: {
                  id: true,
                  ownerId: true,
                  address: true,
                  city: true,
                  zipCode: true,
                  category: true,
                },
              },
            },
          },
        },
      },
      candidateScope: {
        include: {
          creatorUser: { select: { id: true, firstName: true, lastName: true, name: true } },
        },
      },
    },
  });

  if (!application) {
    redirect(`/${locale}/dashboard`);
  }

  const property = application.listing.rentalUnit.property;

  // Only landlord can start an inspection
  if (property.ownerId !== currentUser.id) {
    redirect(`/${locale}/dashboard`);
  }

  // Check if ENTRY inspection already exists
  const existing = await prisma.inspection.findUnique({
    where: { applicationId_type: { applicationId, type: 'ENTRY' } },
  });

  if (existing) {
    // Resume existing inspection — smart redirect picks the right step
    redirect(`/${locale}/inspection/${existing.id}`);
  }

  const tenant = application.candidateScope?.creatorUser;
  const tenantName = tenant
    ? [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') || tenant.name || 'Locataire'
    : 'Locataire';

  const landlordName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || currentUser.name || 'Propriétaire';

  return (
    <InspectionHomeClient
      applicationId={applicationId}
      landlordName={landlordName}
      tenantName={tenantName}
      address={[property.address, property.zipCode, property.city].filter(Boolean).join(', ')}
      propertyType={property.category || 'Logement'}
      locale={locale}
    />
  );
}
