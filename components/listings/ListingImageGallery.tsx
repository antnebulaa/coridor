'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import Image from "next/image";
import HeartButton from "../HeartButton";
import { SafeUser } from "@/types";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { useGesture } from "@use-gesture/react";
import { getCloudinaryThumbnail, getCloudinaryHD } from "@/lib/cloudinaryTransforms";

interface ListingImageGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    images: {
        url: string;
        label?: string | null;
    }[];
    listingId: string;
    currentUser?: SafeUser | null;
}

const ListingImageGallery: React.FC<ListingImageGalleryProps> = ({
    isOpen,
    onClose,
    images,
    listingId,
    currentUser
}) => {
    const [showGallery, setShowGallery] = useState(isOpen);

    // Slideshow state
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const x = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLDivElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Pinch-to-zoom state
    const [scale, setScale] = useState(1);
    const [origin, setOrigin] = useState({ x: 50, y: 50 });
    const isZoomed = scale > 1;

    useEffect(() => {
        setShowGallery(isOpen);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            setSelectedImageIndex(null);
            x.set(0);
        }
        return () => {
            document.body.style.overflow = 'unset';
            x.stop();
        };
    }, [isOpen, x]);

    const groupedImages = useMemo(() => {
        const groups: Record<string, typeof images> = {};
        const otherImages: typeof images = [];

        images.forEach((img) => {
            if (img.label) {
                if (!groups[img.label]) {
                    groups[img.label] = [];
                }
                groups[img.label].push(img);
            } else {
                otherImages.push(img);
            }
        });

        return { groups, otherImages };
    }, [images]);

    const flattenedImages = useMemo(() => {
        const flat: typeof images = [];
        Object.values(groupedImages.groups).forEach(group => flat.push(...group));
        flat.push(...groupedImages.otherImages);
        return flat;
    }, [groupedImages]);

    const getCircularIndex = useCallback((index: number) => {
        const len = flattenedImages.length;
        if (len === 0) return 0;
        return ((index % len) + len) % len; // Ensure positive modulo
    }, [flattenedImages.length]);

    const handleImageClick = (url: string) => {
        const index = flattenedImages.findIndex(img => img.url === url);
        if (index !== -1) {
            setSelectedImageIndex(index);
            x.set(0);
            setIsAnimating(false);
        }
    };

    const navigate = useCallback((direction: number) => {
        if (selectedImageIndex === null || isAnimating) return;
        setIsAnimating(true);

        const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
        const targetX = direction === 1 ? -containerWidth : containerWidth; // 1 = Next (slide left), -1 = Prev (slide right)

        animate(x, targetX, {
            type: "tween",
            ease: "easeOut", // Immediate response, no slow start
            duration: 0.3,
            onComplete: () => {
                setSelectedImageIndex(prev => {
                    if (prev === null) return null;
                    return getCircularIndex(prev + direction);
                });
                x.set(0);
                setIsAnimating(false);
            }
        });
    }, [selectedImageIndex, isAnimating, x, getCircularIndex]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        navigate(1);
    }, [navigate]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        navigate(-1);
    }, [navigate]);

    const onDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
        const threshold = containerWidth * 0.2; // 20% width threshold

        if (offset < -threshold || velocity < -500) {
            // Swipe Left -> Next
            navigate(1);
        } else if (offset > threshold || velocity > 500) {
            // Swipe Right -> Prev
            navigate(-1);
        } else {
            // Rebound to 0
            animate(x, 0, { type: "tween", ease: "easeOut", duration: 0.2 });
        }
    };

    // Keyboard navigation
    useEffect(() => {
        if (selectedImageIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') setSelectedImageIndex(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImageIndex, handleNext, handlePrev]);


    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    // Pinch-to-zoom gesture handler
    const bindGesture = useGesture(
        {
            onPinch: ({ offset: [s], origin: [ox, oy] }) => {
                const newScale = Math.min(Math.max(s, 1), 4);
                setScale(newScale);
                if (imageRef.current) {
                    const rect = imageRef.current.getBoundingClientRect();
                    setOrigin({
                        x: ((ox - rect.left) / rect.width) * 100,
                        y: ((oy - rect.top) / rect.height) * 100,
                    });
                }
            },
            onPinchEnd: () => {
                setScale(1);
                setOrigin({ x: 50, y: 50 });
            },
        },
        {
            pinch: { scaleBounds: { min: 1, max: 4 } },
        }
    );

    // Reset zoom when changing images
    useEffect(() => {
        if (selectedImageIndex !== null) {
            setScale(1);
            setOrigin({ x: 50, y: 50 });
        }
    }, [selectedImageIndex]);

    // Helper to render slides
    const renderSlide = (offsetIndex: number, positionClass: string) => {
        if (selectedImageIndex === null) return null;
        const index = getCircularIndex(selectedImageIndex + offsetIndex);
        const img = flattenedImages[index];
        const isCurrent = offsetIndex === 0;

        return (
            <div className={`absolute top-0 w-full h-full flex items-center justify-center ${positionClass}`}>
                <div
                    ref={isCurrent ? imageRef : undefined}
                    className="relative w-full h-full max-h-[85vh] max-w-[95vw]"
                    {...(isCurrent ? bindGesture() : {})}
                    style={isCurrent ? {
                        transform: `scale(${scale})`,
                        transformOrigin: `${origin.x}% ${origin.y}%`,
                        transition: scale === 1 ? 'transform 0.2s ease-out' : 'none',
                        touchAction: isZoomed ? 'none' : 'pan-y',
                    } : {}}
                >
                    <Image
                        src={getCloudinaryHD(img.url)}
                        alt={`Slide ${index}`}
                        fill
                        className="object-contain pointer-events-none"
                        priority={offsetIndex === 0}
                    />
                </div>
            </div>
        );
    };

    const slideshowContent = selectedImageIndex !== null && (
        <div className="fixed inset-0 z-10000 bg-black flex flex-col animate-in fade-in duration-300 touch-none">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 text-white bg-black/50 absolute top-0 w-full z-20">
                <button
                    onClick={() => setSelectedImageIndex(null)}
                    className="p-2 hover:bg-neutral-800 rounded-full transition"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="font-semibold text-lg">
                    {flattenedImages[selectedImageIndex].label || "Galerie"}
                </div>
                <div className="text-sm font-medium">
                    {selectedImageIndex + 1} / {flattenedImages.length}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 relative w-full h-full overflow-hidden" ref={containerRef}>

                {/* Desktop Controls (outside drag area if possible, or z-indexed above) */}
                <button
                    onClick={handlePrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-neutral-800/50 hover:bg-neutral-800 text-white rounded-full transition z-30 hidden md:block"
                >
                    <ChevronLeft size={32} />
                </button>

                <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-neutral-800/50 hover:bg-neutral-800 text-white rounded-full transition z-30 hidden md:block"
                >
                    <ChevronRight size={32} />
                </button>

                {/* Track */}
                <motion.div
                    className="relative w-full h-full"
                    style={{ x }}
                    drag={flattenedImages.length > 1 && !isZoomed ? "x" : false} // Disable drag if zoomed or only 1 image
                    dragElastic={0.2}
                    onDragEnd={onDragEnd}
                >
                    {/* Previous Slide */}
                    {renderSlide(-1, "-left-full")}

                    {/* Current Slide */}
                    {renderSlide(0, "left-0")}

                    {/* Next Slide */}
                    {renderSlide(1, "left-full")}
                </motion.div>
            </div>
        </div>
    );

    const galleryContent = (
        <div className="fixed inset-0 z-9999 bg-white dark:bg-neutral-900 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm flex items-center justify-between px-4 py-3 md:px-8 border-b border-neutral-200 dark:border-neutral-800">
                <button
                    onClick={onClose}
                    className="p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex items-center gap-4 text-neutral-500">
                    <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition flex items-center gap-2">
                        <Upload size={18} />
                        <span className="hidden md:inline text-sm font-semibold underline text-neutral-800 dark:text-neutral-200">Partager</span>
                    </button>
                    <HeartButton
                        listingId={listingId}
                        currentUser={currentUser}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 pb-20">
                {Object.entries(groupedImages.groups).map(([roomName, roomImages]) => (
                    <div key={roomName} className="mb-12">
                        <h2 className="text-xl md:text-2xl font-semibold mb-6 text-neutral-800 dark:text-neutral-100">{roomName}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {roomImages.map((img, index) => {
                                const isLarge = index === 0 && roomImages.length > 2;
                                return (
                                    <div
                                        key={index}
                                        onClick={() => handleImageClick(img.url)}
                                        className={`
                                            aspect-4/3 
                                            relative 
                                            overflow-hidden 
                                            ${isLarge ? 'md:col-span-2 md:row-span-2 md:h-full md:aspect-auto' : ''}
                                            cursor-pointer
                                        `}
                                    >
                                        <Image
                                            src={getCloudinaryThumbnail(img.url, 600)}
                                            alt={`${roomName} - ${index}`}
                                            fill
                                            loading="lazy"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            className="object-cover hover:scale-105 transition duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition duration-300" />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}

                {groupedImages.otherImages.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-xl md:text-2xl font-semibold mb-6 text-neutral-800 dark:text-neutral-100">Autres photos</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {groupedImages.otherImages.map((img, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleImageClick(img.url)}
                                    className="aspect-4/3 relative overflow-hidden cursor-pointer"
                                >
                                    <Image
                                        src={getCloudinaryThumbnail(img.url, 600)}
                                        alt={`Autre - ${index}`}
                                        fill
                                        loading="lazy"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        className="object-cover hover:scale-105 transition duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition duration-300" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {slideshowContent}
        </div>
    );

    return ReactDOM.createPortal(galleryContent, document.body);
}

export default ListingImageGallery;
