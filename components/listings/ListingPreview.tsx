'use client';

import { SafeListing, SafeUser } from "@/types";
import useCountries from "@/hooks/useCountries";
import { useSession } from "next-auth/react";
import { useMemo, useState, useCallback } from "react";
import ListingEnergy from "./ListingEnergy";
import ListingAmenities from "./ListingAmenities";

import HeartButton from "../HeartButton";
import ListingTransit from "./ListingTransit";
import ListingCommute from "./ListingCommute";
import NeighborhoodScore from "./NeighborhoodScore";
import ListingCardCarousel from "./ListingCardCarousel";
import Image from "next/image";
import { Calendar, ChevronDown, ChevronUp, Fence, Eye, Sun, Waves, Flower2, ArrowUpFromLine, Car, MessageCircle, Home, CheckCircle, Globe, Sparkles } from "lucide-react";
import ListingImageGallery from "./ListingImageGallery";
import { Button } from "../ui/Button";
import useLoginModal from "@/hooks/useLoginModal";
import ApplicationModal from "../modals/ApplicationModal";
import ListingMobileFooter from "./ListingMobileFooter";
import IncompleteProfileModal from "../modals/IncompleteProfileModal";
import PollResults from "./PollResults";
import LandlordAvatar from "@/components/profile/LandlordAvatar";


interface ListingPreviewProps {
    listing: SafeListing & { user?: SafeUser };
    currentUser?: SafeUser | null;
}

const ListingPreview: React.FC<ListingPreviewProps> = ({
    listing,
    currentUser,
}) => {
    const { getByValue } = useCountries();
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
    const [isIncompleteProfileModalOpen, setIsIncompleteProfileModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const loginModal = useLoginModal();
    const { data: session } = useSession();
    const effectiveUserId = currentUser?.id || (session?.user as any)?.id;
    const isOwner = effectiveUserId === listing.user?.id;

    const onApply = useCallback(() => {
        if (!currentUser) {
            return loginModal.onOpen();
        }

        // Check if profile is complete (basic check: jobType OR netSalary)
        const isProfileComplete = !!(currentUser.tenantProfile?.jobType || currentUser.tenantProfile?.netSalary);

        if (!isProfileComplete) {
            return setIsIncompleteProfileModalOpen(true);
        }

        setIsApplicationModalOpen(true);
    }, [currentUser, loginModal]);

    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const location = getByValue((listing as any).locationValue);

    const locationLabel = useMemo(() => {
        if (listing) {
            const parts = [];

            // City + District
            if (listing.city) {
                let cityPart = listing.city;
                if (listing.district) {
                    cityPart += ` ${listing.district}`;
                }
                parts.push(cityPart);
            }

            // Neighborhood field from listing
            if (listing.neighborhood) {
                parts.push(`Quartier ${listing.neighborhood}`);
            }

            // Country
            const country = listing.country || location?.label;
            if (country) {
                parts.push(country);
            }

            if (parts.length > 0) {
                return parts.join(', ');
            }
        }

        if (location?.region && location?.label) {
            return `${location?.region}, ${location?.label}`;
        }

        return location?.label || "Localisation inconnue";
    }, [location, listing]);

    const surfaceDisplay = useMemo(() => {
        if (!listing.surface) return null;

        if (currentUser?.measurementSystem === 'imperial') {
            return `${Math.round(listing.surface * 10.764)} sq ft`;
        }

        return `${listing.surface} m²`;
    }, [listing.surface, currentUser?.measurementSystem]);

    const titleDisplay = useMemo(() => {
        const label = listing.rentalUnit?.type === 'PRIVATE_ROOM'
            ? 'Chambre privée'
            : listing.category;
        if (label && surfaceDisplay) {
            return `${label} de ${surfaceDisplay}`;
        }
        return listing.title;
    }, [listing.category, listing.rentalUnit?.type, surfaceDisplay, listing.title]);



    const listingImages = useMemo(() => {
        // Create a map of room IDs to room names for O(1) lookup
        const roomMap = new Map<string, string>();
        if ((listing as any).rooms) {
            (listing as any).rooms.forEach((room: any) => {
                roomMap.set(room.id, room.name);
            });
        }

        return listing.images.map(img => {
            let label = undefined;
            if (img.roomId && roomMap.has(img.roomId)) {
                label = roomMap.get(img.roomId);
            }

            return {
                url: img.url,
                label: label
            };
        });
    }, [listing.images, (listing as any).rooms]);

    // Reusable Image Component — always full-width, no rounding, stuck to top
    const ImageSection = (
        <div
            className="w-full overflow-hidden relative group h-[280px] md:h-[260px]"
        >
            <div onClick={() => setIsImageModalOpen(true)} className="w-full h-full cursor-pointer">
                <ListingCardCarousel images={listingImages} centeredLabel onIndexChange={setCurrentImageIndex} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/50 to-transparent z-10 pointer-events-none" />

            <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-2">
                {/* Room label pill */}
                {listingImages[currentImageIndex]?.label && (
                    <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium">
                        {listingImages[currentImageIndex].label}
                    </div>
                )}

                {/* Photo counter pill */}
                <button
                    onClick={() => setIsImageModalOpen(true)}
                    className="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-black/70 transition"
                >
                    {currentImageIndex + 1}/{listingImages.length}
                </button>

                <div className="flex-1" />

                {/* Heart button */}
                <HeartButton
                    listingId={listing.id}
                    currentUser={currentUser}
                    listingImage={listing.images?.[0]?.url}
                    variant="button"
                    glass
                />
            </div>
        </div>
    );

    const totalCC = listing.price + (listing.charges ? (listing.charges as any).amount : 0);
    const chargesAmount = listing.charges ? (listing.charges as any).amount : 0;
    const chargesType = (listing as any).chargesType;

    const availabilityDisplay = useMemo(() => {
        if (!listing.availableFrom) return null;
        const date = new Date(listing.availableFrom);
        const now = new Date();
        if (date <= now) return { label: 'Disponible immédiatement', immediate: true };
        return {
            label: `Disponible le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            immediate: false
        };
    }, [listing.availableFrom]);

    // Super atouts — all premium amenities
    const superAtouts = useMemo(() => {
        const items: { icon: any; label: string; color: string }[] = [];
        if (listing.hasTerrace) items.push({ icon: Fence, label: 'Terrasse', color: 'text-amber-600 dark:text-amber-400' });
        if (listing.hasBalcony) items.push({ icon: Fence, label: 'Balcon', color: 'text-amber-600 dark:text-amber-400' });
        if (listing.hasLoggia) items.push({ icon: Fence, label: 'Loggia', color: 'text-amber-600 dark:text-amber-400' });
        if (listing.hasGarden) items.push({ icon: Flower2, label: 'Jardin', color: 'text-emerald-600 dark:text-emerald-400' });
        if (listing.hasPool) items.push({ icon: Waves, label: 'Piscine', color: 'text-sky-600 dark:text-sky-400' });
        if (listing.hasNoOpposite) items.push({ icon: Eye, label: 'Sans vis-à-vis', color: 'text-sky-600 dark:text-sky-400' });
        if (listing.isBright) items.push({ icon: Sun, label: 'Lumineux', color: 'text-amber-500 dark:text-amber-400' });
        if (listing.isLastFloor) items.push({ icon: ArrowUpFromLine, label: 'Dernier étage', color: 'text-violet-600 dark:text-violet-400' });
        if (listing.hasParking) items.push({ icon: Car, label: 'Parking', color: 'text-neutral-600 dark:text-neutral-300' });
        return items;
    }, [listing]);

    // Landlord profile data
    const landlord = useMemo(() => {
        const user = listing.user;
        if (!user) return null;
        const firstName = user.firstName || user.name?.split(' ')[0] || 'Propriétaire';
        const lastInitial = user.lastName?.charAt(0) || user.name?.split(' ')[1]?.charAt(0) || '';
        const responseTime = (user as any).averageResponseTime;
        const propertyCount = (user as any).propertyCount || (user as any)._count?.properties || 1;
        const memberSinceDate = new Date(user.createdAt);
        const now = new Date();
        const monthsSinceMember = (now.getFullYear() - memberSinceDate.getFullYear()) * 12 + (now.getMonth() - memberSinceDate.getMonth());

        // Ancienneté lisible
        let memberSinceLabel: string;
        if (monthsSinceMember < 1) memberSinceLabel = 'Ce mois-ci';
        else if (monthsSinceMember < 12) memberSinceLabel = `${monthsSinceMember} mois`;
        else {
            const years = Math.floor(monthsSinceMember / 12);
            memberSinceLabel = years === 1 ? '1 an' : `${years} ans`;
        }

        let responseLabel: string | null = null;
        if (responseTime != null) {
            if (responseTime < 60) responseLabel = '< 1h';
            else if (responseTime < 120) responseLabel = '~1h';
            else if (responseTime < 1440) responseLabel = `~${Math.round(responseTime / 60)}h`;
            else if (responseTime < 2880) responseLabel = '~1 jour';
            else responseLabel = `~${Math.round(responseTime / 1440)} jours`;
        }

        const languages = ((user as any).languages as string[]) || [];

        return {
            firstName,
            lastInitial,
            avatarUrl: user.image,
            bio: (user as any).bio as string | null,
            propertyCount,
            responseRate: (user as any).responseRate as number | null,
            responseLabel,
            memberSinceLabel,
            languages,
            isNew: monthsSinceMember < 1 && responseTime == null && (user as any).responseRate == null,
            isActive: (user as any).lastActiveAt
                ? Date.now() - new Date((user as any).lastActiveAt).getTime() < 7 * 24 * 60 * 60 * 1000
                : false,
        };
    }, [listing.user]);

    // Summary line: "3 pièces · 2 chambres · 1 SdB · 45 m² · 3e/5"
    const summaryParts = useMemo(() => {
        const parts: string[] = [];
        if (listing.roomCount) parts.push(`${listing.roomCount} ${listing.roomCount > 1 ? 'pièces' : 'pièce'}`);
        if (listing.guestCount) parts.push(`${listing.guestCount} ${listing.guestCount > 1 ? 'chambres' : 'chambre'}`);
        if (listing.bathroomCount) parts.push(`${listing.bathroomCount} SdB`);
        if (surfaceDisplay) parts.push(surfaceDisplay);
        if (listing.floor !== undefined && listing.floor !== null) {
            const floorStr = listing.floor === 0 ? 'RDC' : `${listing.floor}e`;
            parts.push(listing.totalFloors ? `${floorStr}/${listing.totalFloors}` : floorStr);
        }
        return parts;
    }, [listing, surfaceDisplay]);

    return (
        <>
            <div className="col-span-4 flex flex-col">
                {/* Image — full width, no rounding, stuck to top */}
                {ImageSection}

                {/* ── Hero ── */}
                <div className="px-6 pt-5 pb-4">
                    {(listing as any).propertyAdjective && (
                        <span className="text-[11px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-semibold">
                            {(listing as any).propertyAdjective}
                        </span>
                    )}
                    <h2 className="text-[22px] font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mt-0.5">
                        {titleDisplay}
                    </h2>
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
                        {locationLabel}
                    </p>

                    {/* Summary line */}
                    {summaryParts.length > 0 && (
                        <p className="text-[15px] font-medium text-neutral-800 dark:text-neutral-400 mt-2 border-y border-neutral-100 py-3">
                            {summaryParts.join(' · ')}
                        </p>
                    )}

                    {/* ── Badges (meublé, bail, dispo…) ── */}
                    {(() => {
                        const badges: React.ReactNode[] = [];
                        badges.push(
                            <span key="furn" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium px-3 py-1.5 rounded-full">
                                {listing.isFurnished ? 'Meublé' : 'Non meublé'}
                            </span>
                        );
                        if ((listing as any).buildYear) badges.push(
                            <span key="year" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium px-3 py-1.5 rounded-full">Construit en {(listing as any).buildYear}</span>
                        );
                        if (listing.propertySubType) badges.push(
                            <span key="subtype" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium px-3 py-1.5 rounded-full">{listing.propertySubType}</span>
                        );
                        if ((listing as any).leaseType === 'LONG_TERM') badges.push(
                            <span key="lease" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium px-3 py-1.5 rounded-full">{listing.isFurnished ? 'Bail 1 an' : 'Bail 3 ans'}</span>
                        );
                        if ((listing as any).acceptsStudentLease) badges.push(
                            <span key="student" className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full">Bail étudiant</span>
                        );
                        if ((listing as any).acceptsMobilityLease) badges.push(
                            <span key="mobility" className="bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-xs font-medium px-3 py-1.5 rounded-full">Bail mobilité</span>
                        );
                        if (availabilityDisplay) badges.push(
                            <span key="avail" className={`text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 ${
                                availabilityDisplay.immediate
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                            }`}>
                                <Calendar size={12} />
                                {availabilityDisplay.label}
                            </span>
                        );
                        return (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {badges}
                            </div>
                        );
                    })()}


                </div>

                {/* ── Super atouts ── */}
                {superAtouts.length > 0 && (
                    <div className="mx-6 mt-1 mb-1 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-semibold mb-2">Super atouts</p>
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                            {superAtouts.map((item) => (
                                <div key={item.label} className="flex items-center gap-2">
                                    <item.icon size={16} className={item.color} />
                                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Profil propriétaire ── */}
                {landlord && !isOwner && (
                    <>
                        <div className="px-6 py-5">
                            <p className="text-[11px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-semibold mb-4">Le propriétaire</p>

                            {/* Avatar + Nom */}
                            <div className="flex items-center gap-4">
                                <LandlordAvatar
                                    avatarUrl={landlord.avatarUrl}
                                    firstName={landlord.firstName}
                                    lastInitial={landlord.lastInitial}
                                    size="md"
                                    isActive={landlord.isActive}
                                />
                                <div className="flex flex-col">
                                    <span className="text-lg font-semibold text-foreground">
                                        {landlord.firstName} {landlord.lastInitial}.
                                    </span>
                                    {landlord.isNew ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                                            <Sparkles size={12} />
                                            Nouveau sur Coridor
                                        </span>
                                    ) : (
                                        <span className="text-sm  text-neutral-700 dark:text-neutral-500 ">
                                            Membre depuis {landlord.memberSinceLabel}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            {!landlord.isNew && (
                                <div className="flex flex-col gap-2 mt-4">
                                    {landlord.responseLabel && (
                                        <div className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-500">
                                            <MessageCircle size={15} className="shrink-0" />
                                            <span>Répond en général en {landlord.responseLabel}</span>
                                        </div>
                                    )}
                                    {landlord.responseRate != null && (
                                        <div className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-500">
                                            <CheckCircle size={15} className="shrink-0" />
                                            <span>Taux de réponse : {landlord.responseRate}%</span>
                                        </div>
                                    )}
                                    {landlord.propertyCount > 1 && (
                                        <div className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-500">
                                            <Home size={15} className="shrink-0" />
                                            <span>{landlord.propertyCount} biens sur Coridor</span>
                                        </div>
                                    )}
                                    {landlord.languages.length > 0 && (
                                        <div className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-500">
                                            <Globe size={15} className="shrink-0" />
                                            <span>Parle {landlord.languages.join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Bio */}
                            {landlord.bio && (
                                <p className="text-sm text-muted-foreground italic mt-4 leading-relaxed">
                                    &laquo;&nbsp;{landlord.bio}&nbsp;&raquo;
                                </p>
                            )}
                        </div>
                        <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-6" />
                    </>
                )}

                {/* ── Loyer ── */}
                <div className="px-6 py-5">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Détails du loyer</h3>
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700/60 overflow-hidden">
                        <div className="px-5 py-4 flex flex-col gap-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500 dark:text-neutral-400">Loyer hors charges</span>
                                <span className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">{listing.price} €</span>
                            </div>
                            {chargesAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-neutral-500 dark:text-neutral-400">
                                        {chargesType === 'FORFAIT' ? 'Charges (forfait)' : 'Provisions sur charges'}
                                    </span>
                                    <span className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">+ {chargesAmount} €</span>
                                </div>
                            )}
                        </div>
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 px-5 py-3.5 flex justify-between items-center">
                            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Total charges comprises</span>
                            <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">{totalCC} €<span className="text-xs font-normal text-neutral-400 ml-1">/mois</span></span>
                        </div>
                        {listing.securityDeposit !== undefined && listing.securityDeposit !== null && (
                            <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-700/60 flex justify-between text-sm">
                                <span className="text-neutral-500 dark:text-neutral-400">Dépôt de garantie</span>
                                <span className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                                    {listing.securityDeposit === 0 ? 'Aucun' : `${listing.securityDeposit} €`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-6" />

                {/* ── Friendly sections ── */}
                {((listing as any).petsAllowed || listing.isStudentFriendly) && (
                    <>
                        <div className="px-6 py-5 flex flex-col gap-6">
                            <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 text-center">
                                Un proprio accueillant
                            </div>
                            {(listing as any).petsAllowed && (
                                <div className="flex flex-col items-center text-center bg-neutral-50 p-5 rounded-2xl">
                                    <Image
                                        src="/images/Pet-friendly.png"
                                        alt="Pet friendly"
                                        width={60}
                                        height={60}
                                        className="mb-3"
                                    />
                                    <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Animaux bienvenus</p>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-tight max-w-xs">
                                        Le propriétaire accueille volontiers les animaux de compagnie. Rappel : un bailleur ne peut pas interdire la détention d'un animal domestique (loi du 9 juil. 1970).
                                    </p>
                                </div>
                            )}
                            {listing.isStudentFriendly && (
                                <div className="flex flex-col items-center text-center bg-neutral-50 p-5 rounded-2xl">
                                    <Image
                                        src="/images/student-friendly.png"
                                        alt="Student friendly"
                                        width={60}
                                        height={60}
                                        className="mb-3"
                                    />
                                    <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Idéal étudiant</p>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-tight max-w-xs">
                                        Ce logement est particulièrement adapté aux étudiants. Le propriétaire est ouvert aux dossiers étudiants, avec ou sans garant physique (Visale accepté).
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-6" />
                    </>
                )}

                {/* ── Description ── */}
                {listing.description && (
                    <>
                        <div className="px-6 py-5">
                            <div className={`text-[14px] text-neutral-600 dark:text-neutral-400 leading-[1.65] whitespace-pre-line ${!isDescriptionExpanded ? 'line-clamp-4' : ''}`}>
                                {listing.description}
                            </div>
                            {listing.description.length > 180 && (
                                <button
                                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                    className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100 underline underline-offset-4 decoration-neutral-300 dark:decoration-neutral-600 hover:decoration-neutral-900 dark:hover:decoration-neutral-100 transition-colors inline-flex items-center gap-1"
                                >
                                    {isDescriptionExpanded ? <>Voir moins <ChevronUp size={14} /></> : <>Voir plus <ChevronDown size={14} /></>}
                                </button>
                            )}
                        </div>
                        <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-6" />
                    </>
                )}

                {/* ── Équipements ── */}
                <div className="px-6 py-5">
                    <ListingAmenities listing={listing} />
                </div>

                <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-6" />

                {/* ── Énergie & Chauffage ── */}
                <div className="px-6 py-5">
                    <ListingEnergy
                        dpe={listing.dpe}
                        ges={listing.ges}
                        heatingSystem={listing.heatingSystem}
                        glazingType={listing.glazingType}
                        listing={listing}
                    />
                </div>

                <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-6" />

                {/* ── Transports ── */}
                <div className="px-6 py-5">
                    <ListingCommute listing={listing} currentUser={currentUser} />
                </div>

                {listing.latitude && listing.longitude && (
                    <div className="px-6 pb-5">
                        <ListingTransit
                            latitude={listing.latitude}
                            longitude={listing.longitude}
                            listingId={listing.id}
                        />
                    </div>
                )}

                <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-6" />

                {/* ── Score de quartier ── */}
                {listing.latitude && listing.longitude && (
                    <>
                        <div className="px-6 py-5">
                            <NeighborhoodScore
                                latitude={listing.latitude}
                                longitude={listing.longitude}
                            />
                        </div>
                        <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-6" />
                    </>
                )}

                {/* ── Sondages ── */}
                <div className="px-6 py-5 pb-24">
                    <PollResults
                        city={listing.city}
                        zipCode={listing.zipCode}
                    />
                </div>

            </div>

            <ListingImageGallery
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                images={listingImages}
                listingId={listing.id}
                currentUser={currentUser}
            />

            <ApplicationModal
                isOpen={isApplicationModalOpen}
                onClose={() => setIsApplicationModalOpen(false)}
                listing={listing}
                currentUser={currentUser}
            />

            <IncompleteProfileModal
                isOpen={isIncompleteProfileModalOpen}
                onClose={() => setIsIncompleteProfileModalOpen(false)}
            />

            <ListingMobileFooter
                listing={listing}
                onApply={onApply}
                isOwner={isOwner}
            />
        </>
    );
}

// Subcomponent to handle Apply logic independently
const ApplyButton: React.FC<{ listing: SafeListing, currentUser?: SafeUser | null }> = ({
    listing,
    currentUser
}) => {
    const loginModal = useLoginModal();
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
    const [isIncompleteProfileModalOpen, setIsIncompleteProfileModalOpen] = useState(false);

    const onApply = useCallback(() => {
        if (!currentUser) {
            return loginModal.onOpen();
        }

        // Check if profile is complete (basic check: jobType OR netSalary)
        const isProfileComplete = !!(currentUser.tenantProfile?.jobType || currentUser.tenantProfile?.netSalary);

        if (!isProfileComplete) {
            return setIsIncompleteProfileModalOpen(true);
        }

        setIsApplicationModalOpen(true);
    }, [currentUser, loginModal]);

    return (
        <>
            <Button
                label="Candidater"
                onClick={onApply}
            />
            <ApplicationModal
                isOpen={isApplicationModalOpen}
                onClose={() => setIsApplicationModalOpen(false)}
                listing={listing}
                currentUser={currentUser}
            />
            <IncompleteProfileModal
                isOpen={isIncompleteProfileModalOpen}
                onClose={() => setIsIncompleteProfileModalOpen(false)}
            />
        </>
    );
};

// Start of assigning static property to the component function
type ListingPreviewType = React.FC<ListingPreviewProps> & {
    ApplyButton: React.FC<{ listing: SafeListing, currentUser?: SafeUser | null }>
};

const ListingPreviewWithSub = ListingPreview as ListingPreviewType;
ListingPreviewWithSub.ApplyButton = ApplyButton;

export default ListingPreviewWithSub;
