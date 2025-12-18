'use client';

import { useEffect, useState } from "react";
import { FaUtensils, FaShoppingCart, FaGraduationCap, FaHeartbeat } from "react-icons/fa";

interface NeighborhoodScoreProps {
    latitude: number;
    longitude: number;
}

interface Scores {
    convenience: number;
    health: number;
    lifestyle: number;
    education: number;
}

interface Counts {
    bakeries: number;
    supermarkets: number;
    groceries: number;
    pharmacies: number;
    doctors: number;
    bars: number;
    restaurants: number;
    schools: number;
}

interface ApiResponse {
    scores: Scores;
    counts: Counts;
    error?: string;
}

const NeighborhoodScore: React.FC<NeighborhoodScoreProps> = ({ latitude, longitude }) => {
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!latitude || !longitude) return;

        const fetchScores = async () => {
            try {
                const res = await fetch(`/api/neighborhood?lat=${latitude}&lng=${longitude}`);
                const json = await res.json();
                setData(json);
            } catch (error) {
                console.error("Failed to fetch neighborhood scores", error);
            } finally {
                setLoading(false);
            }
        };

        fetchScores();
    }, [latitude, longitude]);

    if (loading) {
        return <div className="animate-pulse h-24 bg-gray-100 rounded-xl mt-4"></div>;
    }

    if (!data || data.error) {
        return null;
    }

    const { scores, counts } = data;

    const items = [
        {
            label: "Pratique",
            score: scores.convenience,
            icon: FaShoppingCart,
            color: "text-blue-500",
            details: `${counts.supermarkets} supermarchés (15min), ${counts.groceries} épiceries (5min), ${counts.bakeries} boulangeries (5min)`
        },
        {
            label: "Santé",
            score: scores.health,
            icon: FaHeartbeat,
            color: "text-red-500",
            details: `${counts.doctors} médecins (15min), ${counts.pharmacies} pharmacies (5min)`
        },
        {
            label: "Vie locale",
            score: scores.lifestyle,
            icon: FaUtensils,
            color: "text-orange-500",
            details: `${counts.restaurants} restos (5min), ${counts.bars} bars (5min)`
        },
        {
            label: "Éducation",
            score: scores.education,
            icon: FaGraduationCap,
            color: "text-green-500",
            details: `${counts.schools} écoles (15min)`
        }
    ];

    return (
        <div className="mt-6 p-6 bg-white rounded-xl">
            <h3 className="text-xl font-semibold mb-4">Le quartier</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map((item) => (
                    <div key={item.label} className="flex items-center gap-4">
                        <div className={`p-3 rounded-full bg-gray-50 ${item.color}`}>
                            <item.icon size={24} />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between mb-1">
                                <span className="font-medium text-gray-900">{item.label}</span>
                                <span className="font-bold text-gray-900">{item.score}/10</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${item.color === 'text-blue-500' ? 'bg-blue-500' :
                                        item.color === 'text-red-500' ? 'bg-red-500' :
                                            item.color === 'text-orange-500' ? 'bg-orange-500' :
                                                'bg-green-500'
                                        }`}
                                    style={{ width: `${item.score * 10}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{item.details}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NeighborhoodScore;
