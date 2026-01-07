'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Heart, Plus, Check, X, Bookmark } from 'lucide-react';
import { Drawer } from 'vaul';
import Image from 'next/image';

import { SafeUser } from '@/types';
import useLoginModal from '@/hooks/useLoginModal';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import CustomToast from '@/components/ui/CustomToast';

interface SaveListingMenuProps {
    listingId: string;
    currentUser?: SafeUser | null;
    listingImage?: string | null;
}

const SaveListingMenu: React.FC<SaveListingMenuProps> = ({
    listingId,
    currentUser,
    listingImage
}) => {
    const router = useRouter();
    const loginModal = useLoginModal();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [wishlists, setWishlists] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newListName, setNewListName] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Desktop Popover Positioning
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLDivElement>(null);

    const hasFavoritedMain = currentUser?.wishlists?.some(w =>
        w.name === "All saved" && w.listings.some(l => l.id === listingId)
    ) || false;

    // We can also check legacy favoriteIds if "All saved" isn't strictly used yet
    // But for this new design, we should rely on the fetched wishlists to be accurate

    const fetchWishlists = useCallback(async () => {
        if (!currentUser) return;
        try {
            const response = await axios.get('/api/wishlists');
            setWishlists(response.data);
        } catch (error) {
            console.error(error);
        }
    }, [currentUser]);

    useEffect(() => {
        if (isOpen) {
            fetchWishlists();
        }
    }, [isOpen, fetchWishlists]);

    const toggleOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (!currentUser) {
            return loginModal.onOpen();
        }

        if (!isOpen && buttonRef.current && !isMobile) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const card = buttonRef.current.closest('.listing-card-container');
            const cardRect = card?.getBoundingClientRect();

            let top = 0;
            let left = 0;
            let transform = '';

            // Vertical positioning (relative to button)
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;
            const isTop = spaceBelow < 300 && spaceAbove > 300;

            if (isTop) {
                top = buttonRect.top - 12;
                transform = 'translate(-50%, -100%)';
            } else {
                top = buttonRect.bottom + 12;
                transform = 'translate(-50%, 0)';
            }

            // Horizontal positioning (Centered to Card, or Button if card not found)
            if (cardRect) {
                // Center of the card
                left = cardRect.left + (cardRect.width / 2);
            } else {
                // Fallback: Center relative to button? Or Right align?
                // User specifically asked for center of column (card). 
                // Fallback to button center if card not found.
                left = buttonRect.left + (buttonRect.width / 2);
            }

            setPopoverStyle({
                top,
                left,
                transform
            });
        }

        setIsOpen(!isOpen);
    };

    const handleCreateWishlist = async () => {
        if (!newListName.trim()) return;
        setIsLoading(true);
        try {
            const res = await axios.post('/api/wishlists', {
                name: newListName,
                listingId
            });

            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Collection créée"
                    onUndo={async () => {
                        await axios.delete(`/api/wishlists/${res.data.id}`);
                        fetchWishlists();
                        router.refresh();
                    }}
                />
            ));

            setNewListName('');
            setIsCreating(false);
            fetchWishlists();
            router.refresh(); // Refresh server data
        } catch (error) {
            toast.error('Erreur lors de la création');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleWishlist = async (wishlistId: string, hasListing: boolean) => {
        setIsLoading(true);
        setIsOpen(false); // Close immediately for better UX
        try {
            if (hasListing) {
                await axios.delete(`/api/wishlists/${wishlistId}?listingId=${listingId}`);
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Retiré de la collection"
                        onUndo={async () => {
                            await axios.post(`/api/wishlists/${wishlistId}`, { listingId });
                            fetchWishlists();
                            router.refresh();
                        }}
                    />
                ));
            } else {
                await axios.post(`/api/wishlists/${wishlistId}`, {
                    listingId
                });
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Ajouté à la collection"
                        onUndo={async () => {
                            await axios.delete(`/api/wishlists/${wishlistId}?listingId=${listingId}`);
                            fetchWishlists();
                            router.refresh();
                        }}
                    />
                ));
            }
            fetchWishlists();
            router.refresh();
        } catch (error) {
            toast.error('Une erreur est survenue');
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate if favorite for the icon state
    // We check ALL wishlists. If present in ANY, the heart is filled.
    // Use the PROP currentUser for immediate feedback before fetching
    // const isSavedInitial = currentUser?.wishlists?.some(w => w.listings.some(l => l.id === listingId)); // Optional initialization

    // Use the PROP currentUser for immediate feedback before fetching
    const isSavedInGeneral = currentUser?.favoriteIds?.includes(listingId) || false;
    const isSavedInWishlists = wishlists.some(w => w.listings.some((l: any) => l.id === listingId));

    // Combined state for the heart icon
    const isSavedAnywhere = isSavedInGeneral || isSavedInWishlists;

    // Most recent image from any wishlist for "All listings" thumbnail, or current listing image?
    // Using current listing image is cleaner for the toggle context.

    const handleToggleAll = async () => {
        setIsLoading(true);
        setIsOpen(false); // Close immediately
        try {
            if (isSavedAnywhere) {
                // 1. Remove from General Favorites (favoriteIds) if present
                if (isSavedInGeneral) {
                    await axios.delete(`/api/favorites/${listingId}`);
                }

                // 2. Remove from ALL lists
                const listsToRemove = wishlists.filter(w => w.listings.some((l: any) => l.id === listingId));
                if (listsToRemove.length > 0) {
                    await Promise.all(listsToRemove.map(w => axios.delete(`/api/wishlists/${w.id}?listingId=${listingId}`)));
                }

                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Retiré de tous les favoris"
                        onUndo={async () => {
                            if (isSavedInGeneral) {
                                await axios.post(`/api/favorites/${listingId}`);
                            }
                            if (listsToRemove.length > 0) {
                                await Promise.all(listsToRemove.map(w => axios.post(`/api/wishlists/${w.id}`, { listingId })));
                            }
                            fetchWishlists();
                            router.refresh();
                        }}
                    />
                ));
            } else {
                // Add to General Favorites ONLY
                await axios.post(`/api/favorites/${listingId}`);

                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Ajouté aux favoris"
                        onUndo={async () => {
                            await axios.delete(`/api/favorites/${listingId}`);
                            fetchWishlists();
                            router.refresh();
                        }}
                    />
                ));
            }

            // Refresh logic
            router.refresh();
            // Re-fetch wishlists to update local state (for the check icons)
            const res = await axios.get('/api/wishlists');
            setWishlists(res.data);
        } catch (error) {
            toast.error('Une erreur est survenue');
        } finally {
            setIsLoading(false);
        }
    };

    const MenuContent = (
        <div className="flex flex-col h-auto bg-white dark:bg-neutral-900 rounded-t-[20px] md:rounded-[24px] overflow-hidden md:shadow-xl w-full md:w-[320px]">
            {/* Header Removed as requested */}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide max-h-[50vh]">

                {/* All Saved / Tous les favoris Toggle */}
                <div
                    onClick={handleToggleAll}
                    className="flex items-center gap-3 p-[9px] hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl cursor-pointer transition group"
                >
                    <div className="
                        w-10 h-10 
                        relative 
                        rounded-xl 
                        overflow-hidden 
                        bg-neutral-100 
                            shrink-0
                    ">
                        {listingImage ? (
                            <Image
                                fill
                                src={listingImage}
                                alt="Tous les favoris"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800">
                                <Heart size={20} className={isSavedAnywhere ? "fill-rose-500 text-rose-500" : "text-neutral-500"} />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col">
                        <div className="font-medium text-[18px] md:text-base">Tous les favoris</div>
                        <div className="text-sm text-neutral-500">
                            {isSavedAnywhere ? 'Enregistré' : 'Enregistrer'}
                        </div>
                    </div>

                    {isSavedAnywhere && (
                        <div className="bg-black text-white rounded-full p-1">
                            <Check size={14} />
                        </div>
                    )}
                </div>

                <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-2 mx-3" />
                {/* Default "All Saved" Mockup if needed, or just iterate wishlists */}
                {/* Assuming API returns all wishlists including a default one if it exists */}

                {wishlists.map((list) => {
                    const hasListing = list.listings.some((l: any) => l.id === listingId);

                    return (
                        <div
                            key={list.id}
                            onClick={() => toggleWishlist(list.id, hasListing)}
                            className="flex items-center gap-3 p-[9px] hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl cursor-pointer transition group"
                        >
                            <div className="
                                w-10 h-10 
                                relative 
                                rounded-xl 
                                overflow-hidden 
                                bg-neutral-100 
                                    shrink-0
                            ">
                                {(list.listings[0]?.rentalUnit?.property?.images?.[0]?.url || list.listings[0]?.rentalUnit?.images?.[0]?.url) ? (
                                    <Image
                                        fill
                                        src={list.listings[0]?.rentalUnit?.property?.images?.[0]?.url || list.listings[0]?.rentalUnit?.images?.[0]?.url}
                                        alt={list.name}
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800">
                                        <Bookmark size={20} className="text-neutral-500" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                                <div className="font-medium text-[18px] md:text-base">{list.name}</div>
                                <div className="text-sm text-neutral-500">{list.listings.length}</div>
                            </div>
                            {hasListing && (
                                <div className="bg-black text-white rounded-full p-1">
                                    <Check size={14} />
                                </div>
                            )}
                        </div>
                    );
                })}
                {/* Create New List Button (Integrated) */}
                {!isCreating ? (
                    <div
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-3 p-[9px] hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl cursor-pointer transition group"
                    >
                        <div className="
                            w-10 h-10 
                            rounded-xl 
                            bg-neutral-100 
                            flex items-center justify-center 
                            shrink-0
                        ">
                            <Plus size={20} className="text-neutral-500" />
                        </div>
                        <div className="font-medium text-[18px] md:text-base">Créer une nouvelle liste</div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-[9px]">
                        <div className="
                            w-10 h-10 
                            rounded-xl 
                            bg-neutral-100 
                            flex items-center justify-center 
                            shrink-0
                        ">
                            <Plus size={20} className="text-neutral-500" />
                        </div>
                        <div className="flex-1 flex gap-2">
                            <input
                                autoFocus
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                placeholder="Nom..."
                                className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateWishlist();
                                }}
                            />
                            <button
                                onClick={handleCreateWishlist}
                                disabled={!newListName.trim() || isLoading}
                                className="p-2 bg-black text-white rounded-lg disabled:opacity-50"
                            >
                                <Check size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div
                ref={buttonRef}
                onClick={toggleOpen}
                className="
                    relative
                    hover:opacity-80
                    transition
                    cursor-pointer
                    z-10
                "
            >
                <Heart
                    size={28}
                    className={`
                        ${isSavedAnywhere
                            ? 'fill-primary text-primary'
                            : 'fill-black/50 text-white'}
                    `}
                    strokeWidth={isSavedAnywhere ? 0 : 2}
                />
            </div>

            {/* Mobile Drawer */}
            {isMobile && (
                <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
                    <Drawer.Portal>
                        <Drawer.Overlay
                            className="fixed inset-0 bg-black/40 z-9999"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                        />
                        <Drawer.Content
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-900 flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-9999 outline-none pb-10"
                        >
                            <Drawer.Title className="sr-only">Enregistrer dans une liste</Drawer.Title>
                            <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-neutral-300 mb-2 mt-3" />
                            {MenuContent}
                        </Drawer.Content>
                    </Drawer.Portal>
                </Drawer.Root>
            )}

            {/* Desktop Popover using Portal */}
            {!isMobile && isOpen && mounted && createPortal(
                <div
                    className="fixed inset-0 z-9999"
                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                >
                    <div
                        className="fixed z-9999 animate-in fade-in zoom-in-95 duration-200"
                        style={popoverStyle}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {MenuContent}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default SaveListingMenu;
