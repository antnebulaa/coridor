'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import { Bus, Train, TramFront } from "lucide-react";

interface TransitLine {
    name: string;
    category: string;
    color: string;
    textColor: string;
    headsign: string;
    operator: string;
}

interface ListingTransitProps {
    latitude: number;
    longitude: number;
    listingId: string;
}

const ListingTransit: React.FC<ListingTransitProps> = ({ latitude, longitude, listingId }) => {
    const [lines, setLines] = useState<TransitLine[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTransit = async () => {
            try {
                const response = await axios.get(`/api/transit?lat=${latitude}&lng=${longitude}&listingId=${listingId}`);
                setLines(response.data);
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
        return <div className="h-20 animate-pulse bg-neutral-100 rounded-xl" />;
    }

    if (lines.length === 0) {
        return null;
    }

    // Group lines by category
    const groupedLines = lines.reduce((acc, line) => {
        if (!acc[line.category]) {
            acc[line.category] = [];
        }
        // Avoid duplicates in display if name is same
        if (!acc[line.category].some(l => l.name === line.name)) {
            acc[line.category].push(line);
        }
        return acc;
    }, {} as Record<string, TransitLine[]>);

    const getIcon = (category: string) => {
        const cat = String(category).toLowerCase().trim();
        if (cat.includes("subway") || cat.includes("metro")) return <div className="font-bold text-xl border-2 border-current rounded-full w-8 h-8 flex items-center justify-center">M</div>;
        if (cat.includes("tram") || cat.includes("lightrail")) return <TramFront size={24} />;
        if (cat.includes("train") || cat.includes("rail") || cat.includes("regional")) return <Train size={24} />;
        return <Bus size={24} />;
    };

    const getCategoryLabel = (category: string) => {
        const cat = String(category).toLowerCase().trim();
        if (cat.includes("subway") || cat.includes("metro")) return "Métro";
        if (cat.includes("tram") || cat.includes("lightrail")) return "Tramway";
        if (cat.includes("train") || cat.includes("rail") || cat.includes("regional")) return "Train / RER";
        if (cat.includes("bus")) return "Bus";
        return `Transport (${category})`;
    };

    // Sort categories: Subway > Tram > Train > Bus > Others
    const sortedCategories = Object.keys(groupedLines).sort((a, b) => {
        const getOrder = (cat: string) => {
            const c = String(cat).toLowerCase();
            if (c.includes("subway") || c.includes("metro")) return 1;
            if (c.includes("tram")) return 2;
            if (c.includes("train")) return 3;
            if (c.includes("bus")) return 4;
            return 99;
        };
        return getOrder(a) - getOrder(b);
    });

    return (
        <div className="flex flex-col gap-4">
            <div className="text-xl font-semibold flex items-center gap-2">
                <Train />
                Transports en commun (à ~10 min à pied)
            </div>
            <div className="flex flex-col gap-4">
                {sortedCategories.map((category) => (
                    <div key={category} className="flex items-center gap-4">
                        <div className="w-32 font-medium text-neutral-600 flex items-center gap-2">
                            {getIcon(category)}
                            {getCategoryLabel(category)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {groupedLines[category].map((line, index) => (
                                <div
                                    key={index}
                                    className="px-3 py-1 rounded-md font-bold text-sm shadow-sm"
                                    style={{
                                        backgroundColor: line.color,
                                        color: line.textColor || '#fff',
                                        border: line.color === '#ffffff' ? '1px solid #e5e5e5' : 'none'
                                    }}
                                    title={line.headsign}
                                >
                                    {line.name}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default ListingTransit;
