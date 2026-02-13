'use client';

import { SafeUser, SafeVisit } from "@/types";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, CheckCircle, XCircle } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface VisitsClientProps {
    visits: SafeVisit[];
    currentUser?: SafeUser | null;
}

const VisitsClient: React.FC<VisitsClientProps> = ({
    visits,
    currentUser
}) => {
    const upcomingVisits = visits.filter((visit) => new Date(visit.date) > new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const pastVisits = visits.filter((visit) => new Date(visit.date) <= new Date()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <Container>
            <Heading
                title="Mes Visites"
                subtitle="Gérez vos visites à venir et passées"
            />

            <div className="mt-10">
                <h3 className="text-xl font-bold mb-4">À venir</h3>
                {upcomingVisits.length === 0 ? (
                    <div className="w-full p-10 flex flex-col items-center justify-center text-neutral-500 bg-neutral-100/50 rounded-xl border border-dashed">
                        <Calendar size={48} className="mb-4 opacity-50" />
                        <p>Aucune visite à venir</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingVisits.map((visit) => (
                            <VisitCard key={visit.id} visit={visit} />
                        ))}
                    </div>
                )}
            </div>

            {pastVisits.length > 0 && (
                <div className="mt-12">
                    <h3 className="text-xl font-bold mb-4 text-neutral-500">Passées</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 grayscale-[0.5] hover:grayscale-0 transition duration-300">
                        {pastVisits.map((visit) => (
                            <VisitCard key={visit.id} visit={visit} />
                        ))}
                    </div>
                </div>
            )}
        </Container>
    );
}

const VisitCard = ({ visit }: { visit: SafeVisit }) => {
    const router = useRouter();
    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            await axios.post(`/api/visits/${visit.id}/confirm`);
            toast.success('Visite confirmée !');
            router.refresh();
        } catch {
            toast.error('Erreur lors de la confirmation');
        } finally {
            setIsConfirming(false);
        }
    };

    const statusBadge = () => {
        switch (visit.status) {
            case 'PENDING':
                return (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Clock size={12} />
                        En attente
                    </span>
                );
            case 'CONFIRMED':
                return (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
                        <CheckCircle size={12} />
                        Confirmée
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
                        <XCircle size={12} />
                        Annulée
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className={`bg-white border rounded-xl overflow-hidden hover:shadow-lg transition group h-full flex flex-col ${visit.status === 'PENDING' ? 'border-amber-300' : ''}`}>
            <div className="aspect-video relative w-full overflow-hidden">
                <Image
                    fill
                    alt="Listing"
                    src={visit.listing.images[0]?.url || '/images/placeholder.jpg'}
                    className="object-cover group-hover:scale-110 transition h-full w-full"
                />
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2 text-neutral-500 text-sm">
                    <Calendar size={16} />
                    {format(new Date(visit.date), 'EEEE d MMMM yyyy', { locale: fr })}
                </div>
                <div className="flex items-center gap-2 text-neutral-500 text-sm">
                    <Clock size={16} />
                    {visit.startTime || format(new Date(visit.date), 'HH:mm')}
                </div>
                <div className="font-semibold text-lg line-clamp-1">
                    {visit.listing.title}
                </div>
                <div className="flex items-center gap-2 text-neutral-500 text-sm line-clamp-1">
                    <MapPin size={16} />
                    {visit.listing.rentalUnit?.property?.city}
                </div>

                {/* Confirm button for PENDING visits */}
                {visit.status === 'PENDING' && (
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirming}
                        className="mt-2 w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                        {isConfirming ? 'Confirmation...' : 'Confirmer ma présence'}
                    </button>
                )}

                <div className="flex-1"></div>
                <hr className="my-2" />

                <div className="flex items-center justify-between">
                    <Link
                        href={`/listings/${visit.listing.id}`}
                        className="text-sm font-medium underline"
                    >
                        Voir l&apos;annonce
                    </Link>
                    {statusBadge()}
                </div>
            </div>
        </div>
    );
};

export default VisitsClient;
