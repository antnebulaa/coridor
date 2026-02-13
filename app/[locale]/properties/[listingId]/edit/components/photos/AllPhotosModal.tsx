'use client';

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Room, PropertyImage } from "@prisma/client";
import { X, Plus, ChevronLeft, Image as ImageIcon, Upload, Move, Trash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor,
    MouseSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { Button } from "@/components/ui/Button";
import PageBody from "@/components/ui/PageBody";
import PhotoGrid from "./PhotoGrid";
import MovePhotoModal from "./MovePhotoModal";
import AddRoomModal from "./AddRoomModal";
import SelectUnassignedModal from "./SelectUnassignedModal";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import MultiImageUpload from "@/components/inputs/MultiImageUpload"; // For hidden upload usage
import CustomToast from "@/components/ui/CustomToast";

interface AllPhotosModalProps {
    isOpen: boolean;
    onClose: () => void;
    listingId: string;
    rooms: (Room & { images: PropertyImage[] })[];
    unassignedImages: PropertyImage[];
    activeView?: 'global' | 'unassigned' | 'room';
    activeRoomId?: string | null;
    initialGlobalImages?: PropertyImage[];
}

const AllPhotosModal: React.FC<AllPhotosModalProps> = ({
    isOpen,
    onClose,
    listingId,
    rooms,
    unassignedImages,
    activeView = 'global',
    activeRoomId = null,
    initialGlobalImages = []
}) => {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);

    // Modal states
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);

    // "Add Photos" menu state
    const [targetRoomForAdd, setTargetRoomForAdd] = useState<{ id: string, name: string } | null>(null);
    const [isSelectUnassignedOpen, setIsSelectUnassignedOpen] = useState(false);

    // Optimistic states
    const [optimisticUnassigned, setOptimisticUnassigned] = useState(unassignedImages);
    const [optimisticRooms, setOptimisticRooms] = useState(rooms);
    const [optimisticGlobalImages, setOptimisticGlobalImages] = useState(initialGlobalImages);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Sync props to state
    useEffect(() => {
        setOptimisticUnassigned(unassignedImages);
    }, [unassignedImages]);

    useEffect(() => {
        setOptimisticRooms(rooms);
    }, [rooms]);

    useEffect(() => {
        setOptimisticGlobalImages(initialGlobalImages);
    }, [initialGlobalImages]);

    // Clear selection when view changes
    useEffect(() => {
        if (isOpen) {
            setSelectedIds([]);
        }
    }, [isOpen, activeView, activeRoomId]);

    // Helpers
    const handleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(item => item !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleClearSelection = () => {
        setSelectedIds([]);
    };

    const handleDeleteSelected = async () => {
        const promises = selectedIds.map(id => axios.delete(`/api/images/${id}`));
        try {
            await Promise.all(promises);
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Photos supprimées"
                    type="success"
                />
            ));
            setSelectedIds([]);
            router.refresh();
        } catch (error) {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors de la suppression"
                    type="error"
                />
            ));
        }
    };

    // Calculate badges for global view
    const getImageBadge = (image: PropertyImage) => {
        if (!image.roomId) return undefined;
        const room = rooms.find(r => r.id === image.roomId);
        return room ? room.name : undefined;
    };

    // Sensors
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Dnd-kit Handler
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            let currentItems: PropertyImage[] = [];
            let type: 'global' | 'unassigned' | 'room' = 'global';
            let roomId: string | undefined = undefined;

            if (activeView === 'global') {
                currentItems = optimisticGlobalImages;
                type = 'global';
            } else if (activeView === 'unassigned') {
                currentItems = optimisticUnassigned;
                type = 'unassigned';
            } else if (activeView === 'room' && activeRoomId) {
                const room = optimisticRooms.find(r => r.id === activeRoomId);
                if (room) {
                    currentItems = room.images;
                    type = 'room';
                    roomId = activeRoomId;
                }
            }

            if (currentItems.length > 0) {
                const oldIndex = currentItems.findIndex((item) => item.id === active.id);
                const newIndex = currentItems.findIndex((item) => item.id === over?.id);
                const newOrder = arrayMove(currentItems, oldIndex, newIndex);
                handleReorder(newOrder, type, roomId);
            }
        }
    };

    // Reorder Handlers
    const handleReorder = (newOrder: PropertyImage[], type: 'global' | 'unassigned' | 'room', roomId?: string) => {
        // Optimistic Update
        if (type === 'global') setOptimisticGlobalImages(newOrder);
        else if (type === 'unassigned') setOptimisticUnassigned(newOrder);
        else if (type === 'room' && roomId) {
            const roomIndex = optimisticRooms.findIndex(r => r.id === roomId);
            if (roomIndex !== -1) {
                const newRooms = [...optimisticRooms];
                newRooms[roomIndex] = { ...newRooms[roomIndex], images: newOrder };
                setOptimisticRooms(newRooms);
            }
        }

        // API Update
        const updates = newOrder.map((item, index) => ({ id: item.id, order: index }));
        axios.put('/api/images/reorder', { updates }).catch(() => {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors du réagencement"
                    type="error"
                />
            ));
        });
    };

    const handleUploadToRoom = (urls: string[], roomId: string) => {
        axios.post(`/api/listings/${listingId}/images`, {
            images: urls,
            roomId: roomId
        })
            .then(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Photos ajoutées"
                        type="success"
                    />
                ));
                setTargetRoomForAdd(null);
                router.refresh();
            })
            .catch(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Erreur lors de l'ajout"
                        type="error"
                    />
                ));
            });
    };

    // Determine Title
    let title = "Toutes les photos";
    if (activeView === 'unassigned') title = "Photos non classées";
    if (activeView === 'room' && activeRoomId) {
        const r = rooms.find(room => room.id === activeRoomId);
        if (r) title = r.name;
    }

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col pt-safe">
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-6 bg-white z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 rounded-lg transition text-sm font-medium text-neutral-900"
                    >
                        <ChevronLeft size={18} />
                        Retour
                    </button>
                    <div className="h-6 w-px bg-neutral-200 mx-2"></div>
                    <h2 className="text-lg font-semibold">
                        {title}
                    </h2>
                </div>

                {/* Right side header actions */}
                <div className="flex gap-2">
                </div>
            </div>

            {/* Content */}
            <PageBody className="flex-1 overflow-y-auto bg-neutral-50/30 pb-32">
                <div className="max-w-5xl mx-auto flex flex-col gap-10">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >

                        {/* GLOBAL VIEW */}
                        {activeView === 'global' && (
                            <section>
                                <div className="mb-6">
                                    <h3 className="text-xl font-semibold mb-2">Toutes les photos</h3>
                                    <p className="text-neutral-500 text-sm">
                                        Voici toutes les photos de votre annonce. Les badges indiquent à quelle pièce elles appartiennent.
                                    </p>
                                </div>
                                <PhotoGrid
                                    id="global"
                                    images={optimisticGlobalImages}
                                    selectable
                                    selectedIds={selectedIds}
                                    onSelect={handleSelect}

                                    getItemBadge={getImageBadge}
                                    onReorder={(newOrder) => handleReorder(newOrder, 'global')}
                                />
                            </section>
                        )}

                        {/* UNASSIGNED VIEW */}
                        {activeView === 'unassigned' && (
                            <section>
                                <div className="mb-6">
                                    <h3 className="text-xl font-semibold mb-2">Photos non classées</h3>
                                    <p className="text-neutral-500 text-sm">
                                        Photos qui n'ont pas encore été assignées à une pièce.
                                    </p>
                                </div>

                                <PhotoGrid
                                    id="unassigned"
                                    images={optimisticUnassigned}
                                    selectable
                                    selectedIds={selectedIds}
                                    onSelect={handleSelect}
                                    emptyContent={
                                        <div className="text-neutral-400 text-sm italic py-4">
                                            Aucune photo non classée.
                                        </div>
                                    }
                                />
                            </section>
                        )}

                        {/* ROOM VIEW */}
                        {activeView === 'room' && activeRoomId && (
                            (() => {
                                const room = optimisticRooms.find(r => r.id === activeRoomId);
                                if (!room) return null;

                                return (
                                    <section className="relative overflow-visible">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-xl font-semibold">{room.name}</h3>

                                            {/* Add Button with Dropdown logic */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setTargetRoomForAdd(targetRoomForAdd?.id === room.id ? null : { id: room.id, name: room.name })}
                                                    className="w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 transition"
                                                    title="Ajouter des photos"
                                                >
                                                    <Plus size={16} />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {targetRoomForAdd?.id === room.id && (
                                                    <div className="absolute right-0 top-10 z-30 bg-white rounded-xl shadow-xl border border-neutral-100 p-2 w-64 animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex flex-col gap-1">

                                                            {/* Option 1: Choose from unassigned */}
                                                            <button
                                                                onClick={() => {
                                                                    setIsSelectUnassignedOpen(true);
                                                                    // targetRoomForAdd is already set
                                                                }}
                                                                className="flex items-center gap-3 w-full p-2 hover:bg-neutral-50 rounded-lg transition text-left text-sm font-medium"
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                                                                    <ImageIcon size={14} />
                                                                </div>
                                                                Choisir parmi les photos non classées
                                                            </button>

                                                            {/* Option 2: Upload new */}
                                                            <div className="relative">
                                                                <div className="flex items-center gap-3 w-full p-2 hover:bg-neutral-50 rounded-lg transition text-left text-sm font-medium cursor-pointer">
                                                                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                                                                        <Upload size={14} />
                                                                    </div>
                                                                    <span className="flex-1">Importer des photos</span>

                                                                    {/* Invisible Overlay for Upload */}
                                                                    <div className="absolute inset-0 opacity-0 cursor-pointer">
                                                                        <MultiImageUpload
                                                                            value={[]}
                                                                            onChange={(urls) => handleUploadToRoom(urls, room.id)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Backdrop to close menu */}
                                                {targetRoomForAdd?.id === room.id && (
                                                    <div
                                                        className="fixed inset-0 z-20 cursor-default"
                                                        onClick={() => setTargetRoomForAdd(null)}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <PhotoGrid
                                            id={room.id}
                                            images={room.images}
                                            selectable
                                            selectedIds={selectedIds}
                                            onSelect={handleSelect}
                                            onReorder={(newOrder) => handleReorder(newOrder, 'room', room.id)}
                                            emptyContent={
                                                <div className="text-neutral-400 italic text-sm border-2 border-dashed rounded-xl p-8 text-center bg-neutral-50/50 h-full flex items-center justify-center">
                                                    Aucune photo dans cette pièce.
                                                </div>
                                            }
                                        />
                                    </section>
                                );
                            })()
                        )}


                    </DndContext>
                </div>
            </PageBody>

            {/* Selection Footer - Floating Pill */}
            <AnimatePresence>
                {
                    selectedIds.length > 0 && (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                                mass: 1
                            }}
                            className="
                            fixed 
                            z-[70]
                            bg-white 
                            shadow-2xl 
                            border border-neutral-200 
                            overflow-hidden
                            
                            /* Mobile Styles: Stacked, full width minus padding, bottom anchored */
                            bottom-4 
                            left-4 
                            right-4 
                            w-auto 
                            rounded-2xl 
                            flex 
                            flex-col 
                            p-4 
                            gap-3

                            /* Desktop Styles: Centered pill, horizontal */
                            md:bottom-10 
                            md:left-1/2 
                            md:right-auto 
                            md:w-auto 
                            md:-translate-x-1/2 
                            md:rounded-full 
                            md:flex-row 
                            md:px-6 
                            md:py-3 
                            md:gap-6
                        "
                        >

                            <motion.div layout className="font-medium text-sm whitespace-nowrap order-1 text-center md:text-left">
                                {selectedIds.length} <span className="hidden sm:inline">photo{selectedIds.length > 1 ? 's' : ''}</span> sélectionnée{selectedIds.length > 1 ? 's' : ''}
                            </motion.div>

                            <motion.div layout className="hidden md:block h-5 w-px bg-neutral-200 shrink-0 order-2"></motion.div>

                            <motion.div layout className="flex items-center gap-2 w-full md:w-auto justify-center order-3">
                                <button
                                    onClick={() => setIsMoveModalOpen(true)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition whitespace-nowrap"
                                >
                                    <Move size={16} />
                                    Déplacer
                                </button>

                                <button
                                    onClick={handleDeleteSelected}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition whitespace-nowrap"
                                >
                                    <Trash size={16} />
                                    Supprimer
                                </button>

                                <button
                                    onClick={handleClearSelection}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 transition ml-2 shrink-0"
                                    title="Annuler la sélection"
                                >
                                    <X size={18} />
                                </button>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Modals */}
            < MovePhotoModal
                isOpen={isMoveModalOpen}
                onClose={() => setIsMoveModalOpen(false)}
                selectedPhotoIds={selectedIds}
                rooms={rooms}
                onSuccess={handleClearSelection}
            />

            <AddRoomModal
                isOpen={isAddRoomModalOpen}
                onClose={() => setIsAddRoomModalOpen(false)}
                listingId={listingId}
            />

            {
                targetRoomForAdd && (
                    <SelectUnassignedModal
                        isOpen={isSelectUnassignedOpen}
                        onClose={() => {
                            setIsSelectUnassignedOpen(false);
                            setTargetRoomForAdd(null);
                        }}
                        unassignedImages={optimisticUnassigned}
                        targetRoomId={targetRoomForAdd.id}
                        targetRoomName={targetRoomForAdd.name}
                        onSuccess={() => {
                            setTargetRoomForAdd(null);
                            router.refresh();
                        }}
                    />
                )
            }
        </div >
        , document.body);
}

export default AllPhotosModal;
