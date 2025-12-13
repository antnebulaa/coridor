import { MapContainer, Marker, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

import 'leaflet/dist/leaflet.css';
import { SafeListing } from '@/types';
import L from 'leaflet';

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
                // console.warn("Map Recenter: Invalid center coordinates", center);
                return;
            }

            let finalLat = lat;
            let finalLng = lng;

            // 2. Validate Zoom
            let targetZoom = 13;
            const currentZoom = map.getZoom();
            if (typeof currentZoom === 'number' && Number.isFinite(currentZoom) && currentZoom >= 13) {
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

            // 4. Final FlyTo Execution with Double Check & Try-Catch
            if (
                typeof finalLat === 'number' && Number.isFinite(finalLat) && !Number.isNaN(finalLat) &&
                typeof finalLng === 'number' && Number.isFinite(finalLng) && !Number.isNaN(finalLng) &&
                typeof targetZoom === 'number' && Number.isFinite(targetZoom)
            ) {
                try {
                    // Double check with Leaflet's own validator if possible, or just try-catch
                    map.flyTo([finalLat, finalLng], targetZoom, {
                        duration: 0.5,
                        easeLinearity: 0.25
                    });
                } catch (flyError) {
                    console.error("Map flyTo failed despite validation", flyError);
                }
            }
        } catch (e) {
            console.error("Map Recenter Error", e);
        }
    }, [center, useOffset, map]);

    return null;
}

const MapMain: React.FC<MapMainProps> = ({ listings, selectedListingId, onSelect }) => {
    const { theme } = useTheme();
    const [center, setCenter] = useState<number[]>([48.8566, 2.3522]); // Default Paris

    const tileUrl = theme === 'dark'
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    useEffect(() => {
        if (selectedListingId) {
            const selected = listings.find(l => l.id === selectedListingId);
            if (selected && selected.latitude && selected.longitude) {
                setCenter([selected.latitude, selected.longitude]);
            }
        } else if (listings.length > 0) {
            const first = listings[0];
            if (first.latitude && first.longitude) {
                setCenter([first.latitude, first.longitude]);
            }
        }
    }, [selectedListingId, listings]);


    const getIcon = (price: number, isSelected: boolean) => {
        const isDark = theme === 'dark';

        // Define colors based on theme and selection state
        let backgroundColor, textColor;

        if (isDark) {
            // Dark Mode: Default is Dark Grey, Selected is White
            backgroundColor = isSelected ? '#ffffff' : '#262626';
            textColor = isSelected ? '#000000' : '#ffffff';
        } else {
            // Light Mode: Default is White, Selected is Black
            backgroundColor = isSelected ? '#000000' : '#ffffff';
            textColor = isSelected ? '#ffffff' : '#000000';
        }

        return L.divIcon({
            className: 'custom-icon',
            html: `
                <div style="
                    background-color: ${backgroundColor};
                    color: ${textColor};
                    padding: 4px 8px;
                    border-radius: 9999px;
                    font-weight: bold;
                    font-size: 14px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    border: 1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
                    transform: scale(${isSelected ? 1.2 : 1});
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: fit-content;
                    white-space: nowrap;
                ">
                    ${price}€
                </div>
            `,
            iconSize: [40, 40], // Approximate, css handles it
            iconAnchor: [20, 20]
        });
    };

    return (
        <MapContainer
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

            {listings.map((listing) => {
                if (!listing.latitude || !listing.longitude) return null;

                const isSelected = listing.id === selectedListingId;

                return (
                    <Marker
                        key={listing.id}
                        position={[listing.latitude, listing.longitude]}
                        icon={getIcon(listing.price, isSelected)}
                        eventHandlers={{
                            click: () => onSelect && onSelect(listing.id)
                        }}
                    />
                )
            })}
            <Recenter center={center} useOffset={!!selectedListingId} />
        </MapContainer>
    )
};

export default MapMain;
