'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Bike, Footprints, Train, X } from 'lucide-react';

import useCommuteModal from '@/hooks/useCommuteModal';
import GoogleAddressSelect, { AddressSelectValue } from '../inputs/GoogleAddressSelect';
import dynamic from 'next/dynamic';
import { Button } from '../ui/Button';

const Map = dynamic(() => import('../Map'), {
    ssr: false
});

const CommuteModal = () => {
    const commuteModal = useCommuteModal();
    const router = useRouter();

    const [location, setLocation] = useState<AddressSelectValue | null>(null);
    const [transportMode, setTransportMode] = useState<'driving' | 'bicycling' | 'walking' | 'transit'>('driving');
    const [duration, setDuration] = useState(15);

    const handleClose = useCallback(() => {
        commuteModal.onClose();
    }, [commuteModal]);

    const handleSubmit = useCallback(() => {
        // Placeholder for future implementation
        commuteModal.onClose();
    }, [commuteModal]);

    if (!commuteModal.isOpen) {
        return null;
    }

    return (
        <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-[70] outline-none focus:outline-none bg-neutral-800/70">
            <div className="relative w-full md:w-5/6 lg:w-4/6 xl:w-3/5 my-6 mx-auto h-full lg:h-auto md:h-auto">
                {/* CONTENT */}
                <div className="translate h-full lg:h-auto md:h-auto border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">

                    {/* HEADER */}
                    <div className="flex items-center p-6 rounded-t justify-center relative border-b-[1px]">
                        <button
                            onClick={handleClose}
                            className="p-1 border-0 hover:opacity-70 transition absolute left-9"
                        >
                            <X size={18} />
                        </button>
                        <div className="text-lg font-semibold">
                            Recherche par temps de trajet
                        </div>
                    </div>

                    {/* BODY */}
                    <div className="relative flex-auto">
                        <div className="flex flex-col md:flex-row h-[70vh] md:h-[600px]">

                            {/* LEFT: INPUTS */}
                            <div className="w-full md:w-1/2 p-6 flex flex-col gap-8 overflow-y-auto">

                                {/* Location */}
                                <div className="flex flex-col gap-2">
                                    <label className="font-semibold">Localisation</label>
                                    <GoogleAddressSelect
                                        value={location || undefined}
                                        onChange={(value) => setLocation(value)}
                                        placeholder="Saisir une adresse (lieu de travail, école...)"
                                    />
                                </div>

                                {/* Transport Mode */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <label className="font-semibold">Moyen de transport</label>
                                        <span className="text-sm text-neutral-500 font-medium">
                                            {transportMode === 'driving' && 'Voiture'}
                                            {transportMode === 'bicycling' && 'Vélo'}
                                            {transportMode === 'walking' && 'Marche'}
                                            {transportMode === 'transit' && 'Transports'}
                                        </span>
                                    </div>
                                    <div className="flex border rounded-full p-1 bg-neutral-100">
                                        <button
                                            onClick={() => setTransportMode('driving')}
                                            className={`flex-1 flex justify-center py-2 rounded-full transition ${transportMode === 'driving' ? 'bg-neutral-800 text-white shadow-sm' : 'hover:bg-neutral-200'}`}
                                        >
                                            <Car size={20} />
                                        </button>
                                        <button
                                            onClick={() => setTransportMode('bicycling')}
                                            className={`flex-1 flex justify-center py-2 rounded-full transition ${transportMode === 'bicycling' ? 'bg-neutral-800 text-white shadow-sm' : 'hover:bg-neutral-200'}`}
                                        >
                                            <Bike size={20} />
                                        </button>
                                        <button
                                            onClick={() => setTransportMode('walking')}
                                            className={`flex-1 flex justify-center py-2 rounded-full transition ${transportMode === 'walking' ? 'bg-neutral-800 text-white shadow-sm' : 'hover:bg-neutral-200'}`}
                                        >
                                            <Footprints size={20} />
                                        </button>
                                        <button
                                            onClick={() => setTransportMode('transit')}
                                            className={`flex-1 flex justify-center py-2 rounded-full transition ${transportMode === 'transit' ? 'bg-neutral-800 text-white shadow-sm' : 'hover:bg-neutral-200'}`}
                                        >
                                            <Train size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Duration */}
                                <div className="flex flex-col gap-2">
                                    <label className="font-semibold">Durée maximale</label>
                                    <select
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full p-4 border-2 border-neutral-200 rounded-xl outline-none focus:border-black transition bg-white"
                                    >
                                        <option value={15}>15 min</option>
                                        <option value={30}>30 min</option>
                                        <option value={45}>45 min</option>
                                        <option value={60}>60 min</option>
                                    </select>
                                </div>

                                <div className="flex-grow"></div>

                                {/* Footer Button (Mobile only or Bottom of left panel) */}
                                <div className="mt-auto pt-6 border-t">
                                    <Button
                                        label="Afficher 2740 annonces"
                                        onClick={handleSubmit}
                                    />
                                </div>
                            </div>

                            {/* RIGHT: MAP */}
                            <div className="w-full md:w-1/2 bg-neutral-100 h-full relative">
                                <Map center={location?.latlng} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommuteModal;
