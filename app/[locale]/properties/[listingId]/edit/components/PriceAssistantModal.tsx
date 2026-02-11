'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Euro, ArrowRight, Wand2 } from 'lucide-react';

interface PriceAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    // We expect rooms to have at least { name, surface, id? }
    // but here we just need index or id to map back.
    rooms: { name: string; surface: number; currentPrice?: number; currentCharges?: number; description?: string }[];
    onApply: (prices: { index: number; price: number }[]) => void;
}

const PriceAssistantModal: React.FC<PriceAssistantModalProps> = ({
    isOpen,
    onClose,
    rooms,
    onApply
}) => {
    const [mode, setMode] = useState<'TOTAL_TARGET' | 'REFERENCE_ROOM'>('TOTAL_TARGET');
    const [targetTotal, setTargetTotal] = useState<number | string>(2000);

    // For Reference Room Mode
    const [referenceRoomIndex, setReferenceRoomIndex] = useState<number>(0);
    const [referencePrice, setReferencePrice] = useState<number | string>(600);

    const totalSurface = useMemo(() => rooms.reduce((acc, r) => acc + (r.surface || 0), 0), [rooms]);

    // Calculate proposed prices based on current mode
    const proposedPrices = useMemo(() => {
        if (mode === 'TOTAL_TARGET') {
            if (!totalSurface) return rooms.map(() => 0);
            const target = targetTotal === '' ? 0 : Number(targetTotal);
            const pricePerSqm = target / totalSurface;
            return rooms.map(room => Math.round(pricePerSqm * (room.surface || 0)));
        } else {
            // Reference Room Mode
            const refRoom = rooms[referenceRoomIndex];
            if (!refRoom || !refRoom.surface) return rooms.map(() => 0);
            const refPrice = referencePrice === '' ? 0 : Number(referencePrice);
            const pricePerSqm = refPrice / refRoom.surface;
            return rooms.map(room => Math.round(pricePerSqm * (room.surface || 0)));
        }
    }, [mode, targetTotal, totalSurface, rooms, referenceRoomIndex, referencePrice]);

    const handleApply = () => {
        const prices = proposedPrices.map((price, index) => ({ index, price }));
        onApply(prices);
        onClose();
    };

    const totalCharges = useMemo(() => rooms.reduce((acc, r) => acc + (r.currentCharges || 0), 0), [rooms]);
    const totalRent = proposedPrices.reduce((a, b) => a + b, 0);
    const totalCC = totalRent + totalCharges;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[28px] shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-neutral-100 flex justify-between items-start bg-linear-to-r from-indigo-50 to-white">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-gray-900">Assistant de Répartition des Loyers</h2>
                        <div className="flex items-center gap-2 text-indigo-600">
                            <Wand2 size={16} />
                            <p className="text-sm text-gray-500">Calculez automatiquement les loyers selon la surface</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        ✕
                    </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-auto">
                    {/* Sidebar / Controls */}
                    <div className="w-full md:w-1/3 bg-gray-50 p-6 flex flex-col gap-6 border-r border-gray-100">
                        {/* Mode Selection */}
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Méthode de calcul</label>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setMode('TOTAL_TARGET')}
                                    className={`text-left text-sm p-3 rounded-lg border transition-all ${mode === 'TOTAL_TARGET' ? 'bg-white border-indigo-600 ring-1 ring-indigo-600 shadow-sm' : 'bg-transparent border-gray-200 hover:border-gray-300 text-gray-600'}`}
                                >
                                    <span className="font-semibold block mb-0.5">Viser un total</span>
                                    <span className="text-xs opacity-80">Je veux 2000€ au total</span>
                                </button>

                                <button
                                    onClick={() => setMode('REFERENCE_ROOM')}
                                    className={`text-left text-sm p-3 rounded-lg border transition-all ${mode === 'REFERENCE_ROOM' ? 'bg-white border-indigo-600 ring-1 ring-indigo-600 shadow-sm' : 'bg-transparent border-gray-200 hover:border-gray-300 text-gray-600'}`}
                                >
                                    <span className="font-semibold block mb-0.5">Basé sur une chambre</span>
                                    <span className="text-xs opacity-80">Si la chambre 1 vaut 600€...</span>
                                </button>
                            </div>
                        </div>

                        {/* Inputs based on Mode */}
                        <div className="flex flex-col gap-4">
                            {mode === 'TOTAL_TARGET' ? (
                                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-sm font-medium text-gray-700">Revenu total cible (HC)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={targetTotal}
                                            onChange={(e) => setTargetTotal(e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full p-2.5 pl-4 pr-10 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition"
                                        />
                                        <Euro size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Soit ~{totalSurface ? Math.round((targetTotal === '' ? 0 : Number(targetTotal)) / totalSurface) : 0}€ / m² en moyenne
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-gray-700">Chambre de référence</label>
                                        <select
                                            value={referenceRoomIndex}
                                            onChange={(e) => setReferenceRoomIndex(Number(e.target.value))}
                                            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm transition"
                                        >
                                            {rooms.map((room, i) => (
                                                <option key={i} value={i}>
                                                    {room.name || `Chambre ${i + 1}`} ({room.surface} m²)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-gray-700">Prix de cette chambre</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={referencePrice}
                                                onChange={(e) => setReferencePrice(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full p-2.5 pl-4 pr-10 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition"
                                            />
                                            <Euro size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Ratio calculé : {rooms[referenceRoomIndex]?.surface ? Math.round((referencePrice === '' ? 0 : Number(referencePrice)) / rooms[referenceRoomIndex].surface) : 0}€ / m²
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results / Preview */}
                    <div className="w-full md:w-2/3 bg-white p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-gray-900">Aperçu de la répartition (HC)</h3>
                            <div className="flex flex-col items-end">
                                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    Total : <span className="font-bold text-gray-900">{totalRent}€</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1 font-medium">
                                    (Soit {totalCC}€ CC)
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {rooms.map((room, index) => (
                                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xs font-semibold text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition">
                                            {room.surface}m²
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 flex items-center gap-2">
                                                {room.name || `Chambre ${index + 1}`}
                                                {room.description && <span className="text-xs text-gray-400 font-normal">{room.description}</span>}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Actuel : {room.currentPrice ? `${room.currentPrice}€` : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <ArrowRight size={14} className="text-gray-300" />
                                        <div className="text-right">
                                            <div className="font-bold text-lg text-indigo-600">
                                                {proposedPrices[index]}€
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <Button
                        label="Annuler"
                        onClick={onClose}
                        variant="ghost"
                        className="rounded-full h-[42px] px-6 text-neutral-600 hover:bg-neutral-100"
                    />
                    <Button
                        label="Appliquer les prix"
                        onClick={handleApply}
                        icon={Wand2}
                        className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800 border-none shadow-md px-6 h-[42px] w-auto text-sm font-medium whitespace-nowrap"
                    />
                </div>
            </div>
        </div>
    );
};

export default PriceAssistantModal;
