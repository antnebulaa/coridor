'use client';

import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { useTheme } from 'next-themes';

interface Station {
    id: number;
    lat: number;
    lon: number;
    name?: string;
    type: 'subway' | 'train';
}



const StationsLayer = () => {
    const map = useMap();
    const { theme } = useTheme();
    const [stations, setStations] = useState<Station[]>([]);
    // Use a simpler cache key or just bounds?
    // Using stringified query is exact but might miss slight overlaps.
    // For now, exact caching is better than nothing.
    const cacheRef = useRef<Map<string, Station[]>>(new Map());
    const layersRef = useRef<L.LayerGroup | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isCooldownRef = useRef(false);

    // Initialize layer group
    useEffect(() => {
        layersRef.current = L.layerGroup().addTo(map);
        return () => {
            if (layersRef.current) {
                layersRef.current.remove();
            }
        };
    }, [map]);

    const fetchStations = async () => {
        if (map.getZoom() < 13) {
            setStations([]);
            return;
        }

        if (isCooldownRef.current) {
            return;
        }

        const bounds = map.getBounds();
        const south = bounds.getSouth();
        const west = bounds.getWest();
        const north = bounds.getNorth();
        const east = bounds.getEast();

        // Round bounds to ~10 meters to improve cache hits on slight shifts
        // 4 decimal places is roughly 11m
        const r = (n: number) => n.toFixed(4);

        // Overpass QL
        // Use a more compact query string for cache key
        const boundsKey = `${r(south)},${r(west)},${r(north)},${r(east)}`;

        const query = `
            [out:json][timeout:25];
            (
              node["station"="subway"](${south},${west},${north},${east});
              node["railway"="station"](${south},${west},${north},${east});
            );
            out body;
        `;

        if (cacheRef.current.has(boundsKey)) {
            setStations(cacheRef.current.get(boundsKey)!);
            return;
        }

        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            // Increase timeout to 30s
            // Modify query to be slightly lighter if possible, but it's already simple.
            // We just fetch nodes.
            const queryWithTimeout = query.replace('[timeout:25]', '[timeout:10]'); // REDUCE timeout to fail fast on overloaded server? Or increase?
            // Actually, for interactive maps, we want to fail fast if it hangs so we don't block.
            // But 504 comes from the gateway. 

            const response = await axios.get('https://overpass-api.de/api/interpreter', {
                params: { data: query },
                signal: abortControllerRef.current.signal,
                timeout: 10000 // Axios timeout 10s strict
            });

            const elements = response.data.elements;
            const newStations: Station[] = elements.map((el: any) => ({
                id: el.id,
                lat: el.lat,
                lon: el.lon,
                name: el.tags.name,
                type: el.tags.station === 'subway' ? 'subway' : 'train'
            }));

            // Cache the result
            cacheRef.current.set(boundsKey, newStations);
            // Limit cache size? naive cache for now, simple enough for session.
            if (cacheRef.current.size > 50) {
                const firstKey = cacheRef.current.keys().next().value;
                if (firstKey) cacheRef.current.delete(firstKey);
            }

            setStations(newStations);

        } catch (error: any) {
            if (axios.isCancel(error)) return;

            // Handle 429 (Too Many Requests) AND 504 (Gateway Timeout) AND 502 (Bad Gateway)
            if (error.response?.status === 429 || error.response?.status === 504 || error.response?.status === 502 || error.code === 'ECONNABORTED') {
                console.warn(`Overpass API Issues (${error.response?.status || error.code}). Cooling down.`);
                isCooldownRef.current = true;

                // Longer cooldown for server errors
                const cooldownTime = error.response?.status === 429 ? 10000 : 30000;

                setTimeout(() => {
                    isCooldownRef.current = false;
                }, cooldownTime);
            } else {
                console.error('Error fetching stations:', error);
            }
        }
    };

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Listen to moveend with debounce
    useEffect(() => {
        const onMoveEnd = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Debounce fetch by 2s (increased from 1s) to avoid 429
            timeoutRef.current = setTimeout(() => {
                fetchStations();
            }, 2000);
        };

        map.on('moveend', onMoveEnd);

        // Initial fetch logic
        onMoveEnd();

        return () => {
            map.off('moveend', onMoveEnd);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [map]);

    // Update Markers
    useEffect(() => {
        if (!layersRef.current) return;

        layersRef.current.clearLayers();

        stations.forEach(station => {
            const isSubway = station.type === 'subway';
            const color = isSubway ? '#eab308' : '#3b82f6'; // Yellow/Blue approx
            const iconBg = isSubway ? '#FCD34D' : '#3B82F6';
            const iconText = isSubway ? 'M' : 'G'; // Metro / Gare

            // Simple DivIcon
            const icon = L.divIcon({
                className: 'station-icon',
                html: `
                    <div style="
                        background-color: ${theme === 'dark' ? '#1f2937' : 'white'};
                        border: 2px solid ${color};
                        color: ${color};
                        border-radius: 50%;
                        width: 24px;
                        height: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 12px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        ${iconText}
                    </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([station.lat, station.lon], { icon, title: station.name });

            // Simple tooltip on hover
            if (station.name) {
                marker.bindTooltip(station.name, {
                    direction: 'top',
                    offset: [0, -10],
                    opacity: 1,
                    className: 'station-tooltip' // We need to ensure styles exist or use default
                });
            }

            marker.addTo(layersRef.current!);
        });

    }, [stations, theme]);

    return null;
};

export default StationsLayer;
