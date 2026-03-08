'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Room, PropertyImage } from "@prisma/client";
import { X, Plus, ChevronLeft, Image as ImageIcon, Upload, Move, Trash2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    MouseSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
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
    const [isSelecting, setIsSelecting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
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

    // Clear selection when view changes or modal closes
    useEffect(() => {
        if (isOpen) {
            exitSelecting();
        }
    }, [isOpen, activeView, activeRoomId]);

    // Exit selection mode
    const exitSelecting = () => {
        setIsSelecting(false);
        setSelectedIds([]);
        setConfirmDelete(false);
    };

    // Helpers
    const handleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(item => item !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        setIsDeleting(true);
        try {
            await Promise.all(selectedIds.map(id => axios.delete(`/api/images/${id}`)));
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message={selectedIds.length > 1 ? `${selectedIds.length} photos supprimées` : 'Photo supprimée'}
                    type="success"
                />
            ));
            router.refresh();
            exitSelecting();
        } catch {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors de la suppression"
                    type="error"
                />
            ));
        } finally {
            setIsDeleting(false);
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
                delay: 200,
                tolerance: 8,
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
                                    selectable={isSelecting}
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
                                    selectable={isSelecting}
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
                                            selectable={isSelecting}
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

            {/* Floating action buttons */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-70">
                <AnimatePresence mode="popLayout">
                    {isSelecting ? (
                        <motion.div
                            key="selection-bar"
                            initial={{ opacity: 0, y: 12, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="flex gap-3"
                        >
                            {/* Cancel */}
                            <motion.button
                                onClick={exitSelecting}
                                whileTap={{ scale: 0.93 }}
                                className="h-12 px-5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-lg flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                            >
                                <X size={16} />
                                Annuler
                            </motion.button>

                            {/* Move — icon only + count */}
                            <motion.button
                                onClick={() => {
                                    if (selectedIds.length > 0) setIsMoveModalOpen(true);
                                }}
                                disabled={selectedIds.length === 0}
                                whileTap={selectedIds.length > 0 ? { scale: 0.93 } : undefined}
                                animate={selectedIds.length > 0
                                    ? { backgroundColor: 'rgb(51 65 85)', color: '#fff' }
                                    : { backgroundColor: 'rgb(245 245 245)', color: 'rgb(163 163 163)' }
                                }
                                transition={{ duration: 0.15 }}
                                className="h-12 px-4 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium"
                            >
                                <Move size={18} />
                            </motion.button>

                            {/* Delete — icon only + count */}
                            <motion.button
                                onClick={() => {
                                    if (selectedIds.length > 0) setConfirmDelete(true);
                                }}
                                disabled={selectedIds.length === 0}
                                whileTap={selectedIds.length > 0 ? { scale: 0.93 } : undefined}
                                animate={selectedIds.length > 0
                                    ? { backgroundColor: 'rgb(239 68 68)', color: '#fff' }
                                    : { backgroundColor: 'rgb(245 245 245)', color: 'rgb(163 163 163)' }
                                }
                                transition={{ duration: 0.15 }}
                                className="h-12 px-4 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium"
                            >
                                <Trash2 size={18} />
                                {selectedIds.length > 0 && (
                                    <motion.span
                                        key={selectedIds.length}
                                        initial={{ scale: 0.6 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 0.1 }}
                                        className="bg-white text-neutral-900 font-medium text-sm min-w-[28px] h-7 rounded-full flex items-center justify-center px-2"
                                    >
                                        {selectedIds.length}
                                    </motion.span>
                                )}
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.button
                            key="edit-btn"
                            initial={{ opacity: 0, y: 12, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => setIsSelecting(true)}
                            className="h-12 px-6 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-lg flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        >
                            <Pencil size={16} />
                            Modifier
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* Delete confirmation overlay */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-6">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <h3 className="text-lg font-semibold mb-2">
                            Supprimer {selectedIds.length > 1 ? `${selectedIds.length} photos` : 'cette photo'} ?
                        </h3>
                        <p className="text-sm text-neutral-500 mb-6">Cette action est irréversible.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
                            >
                                {isDeleting ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <MovePhotoModal
                isOpen={isMoveModalOpen}
                onClose={() => setIsMoveModalOpen(false)}
                selectedPhotoIds={selectedIds}
                rooms={rooms}
                onSuccess={exitSelecting}
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
