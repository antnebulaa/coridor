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
    isochrone?: any; // Add isochrone prop
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
                        map.setView([finalLat, finalLng], targetZoom);
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

const MapMain: React.FC<MapMainProps> = ({ listings, selectedListingId, onSelect, currentUser, isochrone }) => {
    const { theme } = useTheme();
    const [center, setCenter] = useState<number[]>([48.8566, 2.3522]); // Default Paris

    const tileUrl = theme === 'dark'
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
            key={theme} // Force remount on theme change to prevent specific tile layer issues
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

            {/* Isochrone Polygon */}
            {isochrone && (
                <GeoJSON
                    key={JSON.stringify(isochrone)} // Force re-render on change
                    data={isochrone}
                    style={{
                        color: "#22c55e", // Green-500
                        weight: 2,
                        opacity: 0.6,
                        fillColor: "#22c55e",
                        fillOpacity: 0.2
                    }}
                />
            )}

            {listings.map((listing) => {
                if (!listing.latitude || !listing.longitude) return null;

                const isSelected = listing.id === selectedListingId;

                return (
                    <Marker
                        key={listing.id}
                        position={[listing.latitude, listing.longitude]}
                        icon={getIcon(listing.price, isSelected, listing.id)}
                        eventHandlers={{
                            click: () => onSelect && onSelect(listing.id)
                        }}
                    />
                )
            })}
            <Recenter center={center} useOffset={!!selectedListingId} />
            <ResizeHandler />
            <StationsLayer />
        </MapContainer>
    )
};

export default MapMain;
