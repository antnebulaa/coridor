'use client';

import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';
import { useTheme } from 'next-themes';

interface Map3DProps {
    center?: number[];
}

const Map3D: React.FC<Map3DProps> = ({ center }) => {
    const { theme } = useTheme();
    const mapStyle = theme === 'dark' ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12";

    // Mapbox Token
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "pk.eyJ1IjoiYWRyaWVubGMiLCJhIjoiY2x6eGZ6eGZ6MDB6eDJxcXJ6eGZ6eGZ6In0.placeholder";

    const coordinates = center ? {
        longitude: center[1],
        latitude: center[0]
    } : {
        longitude: 2.3522,
        latitude: 48.8566
    };

    return (
        <Map
            initialViewState={{
                ...coordinates,
                zoom: 15
            }}
            style={{ width: '100%', height: '100%', borderRadius: '12px' }}
            mapStyle={mapStyle}
            mapboxAccessToken={MAPBOX_TOKEN}
            scrollZoom={false}
            dragPan={false}
            doubleClickZoom={false}
            boxZoom={false}
            keyboard={false}
            dragRotate={false}
        >
            <Marker
                longitude={coordinates.longitude}
                latitude={coordinates.latitude}
                anchor="bottom"
            >
                <div className="text-primary">
                    <MapPin size={40} fill="currentColor" />
                </div>
            </Marker>
        </Map>
    );
}

export default Map3D;
