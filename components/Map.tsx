'use client';

import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, Circle } from 'react-leaflet';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';

import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default marker icon using CDN to avoid loader issues
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
    center?: number[]
}

const Recenter = ({ center }: { center: number[] }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center as L.LatLngExpression, 17);
        }
    }, [center, map]);
    return null;
}

const Map: React.FC<MapProps> = ({ center }) => {
    const { theme } = useTheme();

    // Default to light if theme is undefined or light
    // Use CartoDB Dark Matter for dark mode
    const tileUrl = theme === 'dark'
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    return (
        <MapContainer
            center={center as L.LatLngExpression || [51, -0.09]}
            zoom={center ? 17 : 2}
            scrollWheelZoom={false}
            dragging={false}
            className="h-[35vh] rounded-[1rem]"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url={tileUrl}
            />
            {center && (
                <>
                    <Circle
                        center={center as L.LatLngExpression}
                        radius={50}
                        pathOptions={{
                            color: '#ef4444',
                            fillColor: '#ef4444',
                            fillOpacity: 0.2,
                            weight: 2
                        }}
                    />
                    <Recenter center={center} />
                </>
            )}
        </MapContainer>
    )
};

export default Map;
