'use client';

import { toast } from "react-hot-toast";
import axios from "axios";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import useLeaseModal from "@/hooks/useLeaseModal";
import { generateDossierHtml } from "@/utils/dossierGenerator";

import { SafeReservation, SafeUser } from "@/types";
import PageHeader from "@/components/PageHeader";
import Container from "@/components/Container";
import ListingCard from "@/components/listings/ListingCard";

interface ReservationsClientProps {
    reservations: SafeReservation[];
    currentUser?: SafeUser | null;
}

const ReservationsClient: React.FC<ReservationsClientProps> = ({
    reservations,
    currentUser
}) => {
    const router = useRouter();
    const leaseModal = useLeaseModal();
    const [deletingId, setDeletingId] = useState('');

    const onCancel = useCallback((id: string) => {
        setDeletingId(id);

        axios.delete(`/api/reservations/${id}`)
            .then(() => {
                toast.success('Reservation cancelled');
                router.refresh();
            })
            .catch((error) => {
                toast.error('Something went wrong.');
            })
            .finally(() => {
                setDeletingId('');
            })
    }, [router]);

    return (
        <Container>
            <PageHeader
                title="Reservations"
                subtitle="Bookings on your properties"
            />
            <div
                className="
          mt-10
          grid 
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          lg:grid-cols-4
          xl:grid-cols-5
          2xl:grid-cols-6
          gap-8
        "
            >
                {reservations.map((reservation: any) => (
                    <ListingCard
                        key={reservation.id}
                        data={reservation.listing}
                        reservation={reservation}
                        actionId={reservation.id}
                        onAction={onCancel}
                        disabled={deletingId === reservation.id}
                        actionLabel="Cancel guest reservation"
                        currentUser={currentUser}
                        secondaryAction={() => leaseModal.onOpen(reservation)}
                        secondaryActionLabel="Generate Lease"
                        tertiaryAction={() => {
                            if (!reservation.user.tenantProfile) {
                                toast.error("No rental profile found");
                                return;
                            }
                            const html = generateDossierHtml(reservation.user, reservation.user.tenantProfile);
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                                printWindow.document.write(html);
                                printWindow.document.close();
                                printWindow.focus();
                                printWindow.print();
                            }
                        }}
                        tertiaryActionLabel="View Dossier"
                    />
                ))}
            </div>
        </Container>
    );
}

export default ReservationsClient;
