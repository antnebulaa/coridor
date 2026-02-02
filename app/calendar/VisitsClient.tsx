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
    return (
        <Container>
            <Heading
                title="Mes Visites"
                subtitle="Gérez vos visites à venir et passées"
            />
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visits.length === 0 && (
                    <div className="col-span-full text-center text-neutral-500 py-10">
                        Aucune visite programmée.
                    </div>
                )}

                {visits.map((visit) => (
                    <div key={visit.id} className="bg-white border rounded-xl overflow-hidden hover:shadow-lg transition group">
                        <div className="aspect-video relative w-full overflow-hidden">
                            <Image
                                fill
                                alt="Listing"
                                src={visit.listing.images[0]?.url || '/images/placeholder.jpg'}
                                className="object-cover group-hover:scale-110 transition h-full w-full"
                            />
                            {/* <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-md text-xs font-bold">
                                {visit.status}
                            </div> */}
                        </div>
                        <div className="p-4 flex flex-col gap-2">
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
                ))}
            </div>
        </Container>
    );
}

export default VisitsClient;
