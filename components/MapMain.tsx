import { MapContainer, Marker, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import { useEffect, useState } from 'react';

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
        // Prevent map operations if map is hidden (e.g. mobile view) to avoid NaN errors
        if (!map.getContainer().offsetParent) {
            return;
        }

        // Strict validation: center must be an array of two finite numbers
        if (!Array.isArray(center) || center.length < 2 || !Number.isFinite(center[0]) || !Number.isFinite(center[1])) {
            return;
        }

        // Use primitive variables to ensure we don't pass complex objects that might hide NaNs
        let finalLat = center[0];
        let finalLng = center[1];
        let targetZoom = 13;

        if (useOffset) {
            try {
                const mapZoom = map.getZoom();
                // Ensure zoom is valid
                targetZoom = (Number.isFinite(mapZoom) && mapZoom >= 13) ? mapZoom : 13;

                const point = map.project([center[0], center[1]], targetZoom);
                const pointWithOffset = L.point(point.x - 200, point.y);
                const latLngWithOffset = map.unproject(pointWithOffset, targetZoom);

                if (latLngWithOffset && Number.isFinite(latLngWithOffset.lat) && Number.isFinite(latLngWithOffset.lng)) {
                    finalLat = latLngWithOffset.lat;
                    finalLng = latLngWithOffset.lng;
                }
            } catch (e) {
                console.warn("Error calculating map offset", e);
            }
        }

        // Final sanity check before calling Leaflet
        if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng) || Number.isNaN(finalLat) || Number.isNaN(finalLng)) {
            // console.warn("Skipping flyTo due to invalid coordinates", { finalLat, finalLng });
            return;
        }

        try {
            map.flyTo([finalLat, finalLng], targetZoom, {
                duration: 0.5,
                easeLinearity: 0.25
            });
        } catch (e) {
            console.error("Leaflet flyTo failed", e);
        }
    }, [center, useOffset, map]);

    return null;
}

const MapMain: React.FC<MapMainProps> = ({ listings, selectedListingId, onSelect }) => {
    const [center, setCenter] = useState<number[]>([48.8566, 2.3522]); // Default Paris

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
        return L.divIcon({
            className: 'custom-icon',
            html: `
                <div style="
                    background-color: ${isSelected ? 'black' : 'white'};
                    color: ${isSelected ? 'white' : 'black'};
                    padding: 4px 8px;
                    border-radius: 9999px;
                    font-weight: bold;
                    font-size: 14px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    border: 1px solid rgba(0,0,0,0.1);
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
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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
