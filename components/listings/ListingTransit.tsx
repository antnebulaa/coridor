'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import { Bus, Train, TramFront, MapPin, Footprints, Car } from "lucide-react";

interface TransitLine {
    name: string;
    type: string;
    color: string;
    textColor: string;
}

interface NearbyStation {
    stationName: string;
    distance: number;
    walkTime: number;
    lines: TransitLine[];
    types: string[];
}

interface MainConnection {
    name: string; // Station Name
    line: string; // Line Name (e.g. A, 1, etc)
    headsign: string;
    type: string;
    color: string;
    textColor: string;
    distance: number;
    walkTime: number;
}

interface TransitData {
    mainConnection: MainConnection | null;
    nearby: NearbyStation[];
}

interface ListingTransitProps {
    latitude: number;
    longitude: number;
    listingId: string;
}

const ListingTransit: React.FC<ListingTransitProps> = ({ latitude, longitude, listingId }) => {
    const [data, setData] = useState<TransitData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTransit = async () => {
            try {
                const response = await axios.get(`/api/transit?lat=${latitude}&lng=${longitude}&listingId=${listingId}`);
                setData(response.data);
            } catch (error) {
                console.error("Failed to fetch transit data", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (latitude && longitude) {
            fetchTransit();
        }
    }, [latitude, longitude, listingId]);

    if (isLoading) {
        return <div className="h-20 animate-pulse bg-muted/50 rounded-xl" />;
    }

    if (!data || (!data.mainConnection && data.nearby.length === 0)) {
        return null;
    }

    const getIcon = (type: string, size = 24) => {
        const cat = String(type).toLowerCase().trim();
        if (cat.includes("subway") || cat.includes("metro")) return <div className="font-bold border-2 border-current rounded-full flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.5 }}>M</div>;
        if (cat.includes("rer")) return <div className="font-bold border-2 border-current rounded-[8px] flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.5 }}>RER</div>;
        if (cat.includes("tram")) return <div className="font-bold border-2 border-current rounded-full flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.5 }}>T</div>;
        if (cat.includes("train") || cat.includes("rail")) return <Train size={size} className="shrink-0" />;
        if (cat.includes("bus")) return <Bus size={size} className="shrink-0" />;
        return <Bus size={size} className="shrink-0" />;
    };

    const getTypeLabel = (type: string) => {
        const cat = String(type).toLowerCase().trim();
        if (cat.includes("subway") || cat.includes("metro")) return "Métro";
        if (cat.includes("rer")) return "RER";
        if (cat.includes("tram")) return "Tramway";
        if (cat.includes("train") || cat.includes("rail")) return "Train";
        if (cat.includes("bus")) return "Bus";
        return "Transport";
    }

    // Determine travel mode icon
    const getTravelIcon = (walkTime: number) => {
        if (walkTime > 20) return <Car size={14} />;
        return <Footprints size={14} />;
    }

    const { mainConnection, nearby } = data;

    return (
        <div className="flex flex-col gap-6">
            <div className="text-xl font-semibold flex items-center gap-2">
                Transports à proximité
            </div>

            <div className="flex flex-col gap-6">
                {/* Block 1: The Champion */}
                {mainConnection && (
                    <div className="bg-neutral-50 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Type Icon (M, RER, etc) - Small version */}
                                    <div className="shrink-0">
                                        {getIcon(mainConnection.type, 20)}
                                    </div>

                                    {/* Line Chip */}
                                    <span
                                        className="text-xs font-bold px-1.5 py-0.5 rounded text-white min-w-[20px] text-center inline-block shrink-0"
                                        style={{ backgroundColor: mainConnection.color || '#333', color: mainConnection.textColor || '#fff' }}
                                    >
                                        {mainConnection.line}
                                    </span>

                                    {/* Station Name */}
                                    <span className="font-semibold text-base leading-tight truncate">
                                        {mainConnection.name}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground font-light line-clamp-2 leading-snug mt-1.5">
                                    {mainConnection.headsign}
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end shrink-0 whitespace-nowrap">
                                <span className="font-bold text-lg flex items-center gap-1.5">
                                    {getTravelIcon(mainConnection.walkTime)}
                                    {mainConnection.walkTime} min
                                </span>
                                <span className="text-xs text-muted-foreground bg-white px-2 py-0.5 rounded-full border border-neutral-100 mt-1">
                                    {mainConnection.distance > 1000 ? `${(mainConnection.distance / 1000).toFixed(1)} km` : `${mainConnection.distance}m`}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Block 2: Proximity */}
                {nearby.length > 0 && (
                    <div className="flex flex-col gap-3">
                        {mainConnection && <div className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Également à proximité</div>}

                        <div className="grid grid-cols-1 gap-3">
                            {nearby.map((station, idx) => {
                                const types = station.types.map((t: string) => t.toLowerCase());
                                const isMetro = types.some((t: string) => t.includes('metro') || t.includes('subway'));
                                const isTram = types.some((t: string) => t.includes('tram') || t.includes('lightrail'));
                                const isTrain = types.some((t: string) => t.includes('train') || t.includes('rail') || t.includes('rer'));
                                const isBus = types.some((t: string) => t.includes('bus'));

                                let icon;
                                let label = "Arrêt";

                                if (isMetro) {
                                    icon = <div className="font-bold border-2 border-current rounded-full flex items-center justify-center shrink-0" style={{ width: 20, height: 20, fontSize: 10 }}>M</div>;
                                    label = "Station";
                                } else if (isTram) {
                                    icon = <div className="font-bold border-2 border-current rounded-full flex items-center justify-center shrink-0" style={{ width: 20, height: 20, fontSize: 10 }}>T</div>;
                                    label = "Station";
                                } else if (isTrain) {
                                    icon = <Train size={20} />;
                                    label = "Gare";
                                } else {
                                    icon = <Bus size={20} />;
                                    label = "Arrêt";
                                }

                                const rawName = station.stationName;
                                const isUnknown = !rawName || rawName === 'Inconnue' || rawName === 'Arrêt Inconnu';
                                const displayName = isUnknown ? "" : rawName;

                                return (
                                    <div key={idx} className="flex items-start gap-3 py-1">
                                        <div className="w-[40px] flex justify-center text-neutral-400 mt-0.5">
                                            {icon}
                                        </div>
                                        <div className="flex-1 flex flex-col gap-1">
                                            {/* Row 1: Name */}
                                            <div className="font-medium text-sm md:text-base">
                                                {label} <span className="font-semibold">{displayName}</span>
                                            </div>

                                            {/* Row 2: Lines + Distance */}
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {station.lines.map((line, lIdx) => (
                                                        <span
                                                            key={lIdx}
                                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white min-w-[20px] text-center inline-block"
                                                            style={{ backgroundColor: line.color || '#333', color: line.textColor || '#fff' }}
                                                        >
                                                            {line.name}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="text-sm text-neutral-500 flex items-center gap-1 shrink-0 whitespace-nowrap">
                                                    <Footprints size={12} />
                                                    {station.walkTime} min <span className="text-neutral-300">|</span> {station.distance}m
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListingTransit;
