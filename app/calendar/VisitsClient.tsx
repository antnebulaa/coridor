'use client';

import { SafeUser, SafeVisit } from "@/types";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";

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
    return (
        <div className="bg-white border rounded-xl overflow-hidden hover:shadow-lg transition group h-full flex flex-col">
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
                    {format(new Date(visit.date), 'HH:mm')}
                </div>
                <div className="font-semibold text-lg line-clamp-1">
                    {visit.listing.title}
                </div>
                <div className="flex items-center gap-2 text-neutral-500 text-sm line-clamp-1">
                    <MapPin size={16} />
                    {visit.listing.rentalUnit.property.city}
                </div>

                <div className="flex-1"></div>
                <hr className="my-2" />

                <div className="flex items-center justify-between">
                    <Link
                        href={`/listings/${visit.listing.id}`}
                        className="text-sm font-medium underline"
                    >
                        Voir l'annonce
                    </Link>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${visit.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {visit.status === 'CONFIRMED' ? 'Confirmée' : 'Annulée'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default VisitsClient;
