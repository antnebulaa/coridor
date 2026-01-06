import { MapContainer, Marker, TileLayer, useMap, ZoomControl, GeoJSON } from 'react-leaflet';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

import 'leaflet/dist/leaflet.css';
import { SafeListing, SafeUser } from '@/types';
import L from 'leaflet';
import dynamic from 'next/dynamic';

const StationsLayer = dynamic(() => import('./map/StationsLayer'), {
    ssr: false
});

// Fix for Leaflet default marker
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapMainProps {
    listings: SafeListing[];
    selectedListingId?: string;
    onSelect?: (id: string) => void;
    currentUser?: SafeUser | null;
    isochrones?: any[]; // Array of feature collections
}

const Recenter = ({ center, useOffset }: { center: number[], useOffset: boolean }) => {
    const map = useMap();

    useEffect(() => {
        // Guard against invalid component state or missing map
        if (!map) return;

        try {
            // 1. Basic Validation of 'center' prop
            if (!Array.isArray(center) || center.length !== 2) return;

            const lat = center[0];
            const lng = center[1];

            // Strict check: Must be numbers, finite, and not NaN
            const isLatValid = typeof lat === 'number' && Number.isFinite(lat) && !Number.isNaN(lat);
            const isLngValid = typeof lng === 'number' && Number.isFinite(lng) && !Number.isNaN(lng);

            if (!isLatValid || !isLngValid) {
                return;
            }

            let finalLat = lat;
            let finalLng = lng;

            // 2. Validate Zoom
            let targetZoom = 13;
            const currentZoom = map.getZoom();

            // If listing selected (useOffset is true), force tighter zoom
            if (useOffset) {
                targetZoom = Math.max(currentZoom, 15);
            } else if (typeof currentZoom === 'number' && Number.isFinite(currentZoom) && currentZoom >= 13) {
                targetZoom = currentZoom;
            }

            // 3. Optional Offset Logic (only if standard check passed)
            if (useOffset) {
                try {
                    const point = map.project([lat, lng], targetZoom);
                    // Check projection results
                    if (point && typeof point.x === 'number' && typeof point.y === 'number') {
                        const pointWithOffset = L.point(point.x - 200, point.y);
                        const latLngWithOffset = map.unproject(pointWithOffset, targetZoom);

                        if (latLngWithOffset &&
                            typeof latLngWithOffset.lat === 'number' && !Number.isNaN(latLngWithOffset.lat) &&
                            typeof latLngWithOffset.lng === 'number' && !Number.isNaN(latLngWithOffset.lng)
                        ) {
                            finalLat = latLngWithOffset.lat;
                            finalLng = latLngWithOffset.lng;
                        }
                    }
                } catch (offsetError) {
                    // Silently fail offset and stick to original center
                }
            }

            // 4. Final Execution with Robust Start/End Checks
            if (
                typeof finalLat === 'number' && Number.isFinite(finalLat) && !Number.isNaN(finalLat) &&
                typeof finalLng === 'number' && Number.isFinite(finalLng) && !Number.isNaN(finalLng) &&
                typeof targetZoom === 'number' && Number.isFinite(targetZoom)
            ) {
                // Ensure map has dimensions before attempting view operations
                const size = map.getSize();
                if (size.x > 0 && size.y > 0) {
                    try {
                        // Use setView instead of flyTo to avoid curve calculation crashes with NaNs
                        map.setView([finalLat, finalLng], targetZoom, { animate: false });
                    } catch (viewError) {
                        console.error("Map setView failed", viewError);
                    }
                }
            }
        } catch (e) {
            console.error("Map Recenter Error", e);
        }
    }, [center, useOffset, map]);

    return null;
}

const ResizeHandler = () => {
    const map = useMap();

    useEffect(() => {
        const handleResize = () => {
            map.invalidateSize();
        };

        // 1. Initial invalidation (Wrapped in RAF to prevent sync race conditions with Map mount)
        requestAnimationFrame(() => {
            handleResize();
        });

        // 2. Delayed invalidation (catches animation end)
        const timer = setTimeout(handleResize, 400);

        // 3. Window resize
        window.addEventListener('resize', handleResize);

        // 4. Focus / Visibility Change (Mobile Tab switching)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                handleResize();
                // Double check after a small delay ensures rendering on slow mobile browsers
                setTimeout(handleResize, 200);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleResize);

        // 5. ResizeObserver (Detects container size changes not triggered by window resize)
        const container = map.getContainer();
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });
        resizeObserver.observe(container);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleResize);
            resizeObserver.disconnect();
        };
    }, [map]);

    return null;
}

const MapMain: React.FC<MapMainProps> = ({ listings, selectedListingId, onSelect, currentUser, isochrones }) => {
    const { theme, resolvedTheme } = useTheme();
    const [center, setCenter] = useState<number[]>([48.8566, 2.3522]); // Default Paris

    const isDark = resolvedTheme === 'dark';

    const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    useEffect(() => {
        if (selectedListingId) {
            const selected = listings.find(l => l.id === selectedListingId);
            if (selected &&
                typeof selected.latitude === 'number' && Number.isFinite(selected.latitude) &&
                typeof selected.longitude === 'number' && Number.isFinite(selected.longitude)
            ) {
                setCenter([selected.latitude, selected.longitude]);
            }
        } else if (listings.length > 0) {
            const first = listings[0];
            if (first.latitude && first.longitude &&
                typeof first.latitude === 'number' && Number.isFinite(first.latitude) &&
                typeof first.longitude === 'number' && Number.isFinite(first.longitude)
            ) {
                setCenter([first.latitude, first.longitude]);
            }
        }
    }, [selectedListingId, listings]);


    const getIcon = (price: number, isSelected: boolean, listingId: string) => {
        const isDark = theme === 'dark';

        // Correctly check favorites via Wishlists (Relation), not legacy favoriteIds (Scalar)
        const isFavorite = currentUser?.wishlists?.some(wishlist =>
            wishlist.listings.some(l => l.id === listingId)
        ) || false;

        // Base classes for the marker
        const baseClasses = `
            padding: 4px 8px;
            border-radius: 9999px;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            width: fit-content;
            white-space: nowrap;
        `;

        if (isFavorite || isSelected) {
            // Favorite or Selected: Primary Background, White Text
            // We use standard CSS variables directly for maximum reliability
            const bg = 'var(--primary)';
            const text = 'var(--primary-foreground)';

            return L.divIcon({
                className: 'custom-icon',
                html: `
                    <div style="
                        background-color: ${bg};
                        color: ${text};
                        border: 1px solid ${bg};
                        ${baseClasses}
                        transform: scale(${isSelected ? 1.2 : 1});
                    ">
                        ${price}€
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
        }

        // Standard Logic (Non-Favorite) - Preserving exact previous behavior or close to it
        let backgroundColor, textColor;
        if (isDark) {
            backgroundColor = isSelected ? '#ffffff' : '#262626';
            textColor = isSelected ? '#000000' : '#ffffff';
        } else {
            backgroundColor = isSelected ? '#000000' : '#ffffff';
            textColor = isSelected ? '#ffffff' : '#000000';
        }

        return L.divIcon({
            className: 'custom-icon',
            html: `
                <div style="
                    background-color: ${backgroundColor};
                    color: ${textColor};
                    ${baseClasses}
                    border: 1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
                    transform: scale(${isSelected ? 1.2 : 1});
                ">
                    ${price}€
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
    };

    return (
        <MapContainer
            // key={resolvedTheme || theme} removed to prevent reuse error during hydration/switching
            center={center as L.LatLngExpression}
            zoom={12}
            scrollWheelZoom={true}
            className="h-full w-full rounded-[20px] overflow-hidden"
            zoomControl={false} // Disable default
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url={tileUrl}
            />
            <ZoomControl position="topright" />

            {/* Isochrone Polygons */}
            {isochrones && isochrones.map((geoJson, index) => {
                // Color Palette: Index 0 = Black, Index 1 = Green-500 (#22c55e)
                const color = index === 0 ? "#000000" : "#22c55e";

                return (
                    <GeoJSON
                        key={`iso-${index}-${JSON.stringify(geoJson)}`}
                        data={geoJson}
                        style={{
                            color: color,
                            weight: 2,
                            opacity: 0.8, // Stronger border
                            fillColor: color,
                            fillOpacity: 0.2 // Transparency allows "fusion" effect at intersection
                        }}
                    />
                );
            })}

            {listings.map((listing) => {
                if (!listing.latitude || !listing.longitude) return null;

                const isSelected = listing.id === selectedListingId;

                // Calculate price including charges
                const charges = (listing.charges as any)?.amount || 0;
                const totalPrice = listing.price + charges;

                return (
                    <Marker
                        key={listing.id}
                        position={[listing.latitude, listing.longitude]}
                        icon={getIcon(totalPrice, isSelected, listing.id)}
                        eventHandlers={{
                            click: () => onSelect && onSelect(listing.id)
                        }}
                    />
                )
            })}


            {/* Commute Locations Markers */}
            {currentUser?.commuteLocations?.filter(loc => loc.isShowOnMap).map((loc) => {
                if (!loc.latitude || !loc.longitude) return null;

                // Select SVG based on icon or transport mode fallback
                let iconSvg = '';
                const iconType = loc.icon;
                const mode = loc.transportMode || 'TRANSIT';

                if (iconType === 'briefcase') {
                    // Briefcase
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
                } else if (iconType === 'home') {
                    // Home
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
                } else if (iconType === 'school') {
                    // GraduationCap
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>`;
                } else if (iconType === 'favorite') {
                    // Star
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
                } else if (iconType === 'partner') {
                    // Heart
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
                } else {
                    // Fallback to Transport Mode
                    if (mode === 'DRIVING') {
                        // Car
                        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
                    } else if (mode === 'CYCLING') {
                        // Bike
                        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`;
                    } else if (mode === 'WALKING') {
                        // Footprints
                        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8.75A8.6 8.6 0 0 1 7 1c2.25 0 4-1.35 4-2.38V16.25c0 .85.47 1.63.85 2.25l3.11 5.31A1 1 0 0 1 14.1 25a1 1 0 0 1-.9.59H5.5A2.5 2.5 0 0 1 3 23.09v-7.09Z"/><path d="M20 7h-7"/></svg>`;
                    } else {
                        // Default TRANSIT (Train/Tram)
                        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h0"/><path d="M16 15h0"/></svg>`;
                    }
                }

                const iconHtml = `
                    <div style="
                        background-color: #000000;
                        color: #ffffff;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        border: 2px solid white;
                    ">
                        ${iconSvg}
                    </div>
                `;

                return (
                    <Marker
                        key={`commute-${loc.id}`}
                        position={[loc.latitude, loc.longitude]}
                        icon={L.divIcon({
                            className: 'custom-commute-icon',
                            html: iconHtml,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16] // Center
                        })}
                    // No click handler needed for now, just visual
                    />
                );
            })}
            <Recenter center={center} useOffset={!!selectedListingId} />
            <ResizeHandler />
            <StationsLayer />
        </MapContainer>
    )
};

export default MapMain;
