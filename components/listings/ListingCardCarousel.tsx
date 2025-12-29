'use client';

import Image from "next/image";
import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ListingCardCarouselProps {
    images: { url: string; label?: string }[];
}

const ListingCardCarousel: React.FC<ListingCardCarouselProps> = ({
    images
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Update current index on scroll
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;

        const { scrollLeft, clientWidth } = scrollContainerRef.current;
        const newIndex = Math.round(scrollLeft / clientWidth);

        if (newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
        }
    };

    const scrollToIndex = (index: number) => {
        if (!scrollContainerRef.current) return;

        const width = scrollContainerRef.current.clientWidth;
        scrollContainerRef.current.scrollTo({
            left: width * index,
            behavior: 'smooth'
        });
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (currentIndex < images.length - 1) {
            scrollToIndex(currentIndex + 1);
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (currentIndex > 0) {
            scrollToIndex(currentIndex - 1);
        }
    };

    if (!images || images.length === 0) {
        return (
            <div className="relative w-full h-full bg-neutral-100 dark:bg-neutral-900">
                <Image
                    fill
                    alt="Listing"
                    src="/images/placeholder.svg"
                    className="object-cover h-full w-full opacity-50"
                />
            </div>
        );
    }

    return (
        <div className="relative w-full h-full group">
            {/* Scroll Container */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className="
                    flex 
                    w-full 
                    h-full 
                    overflow-x-auto 
                    snap-x 
                    snap-mandatory 
                    scrollbar-hide 
                "
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {images.map((image, index) => (
                    <div
                        key={`${image.url}-${index}`}
                        className="
                            min-w-full 
                            h-full 
                            relative 
                            snap-center 
                            flex-none
                            bg-neutral-200 
                            dark:bg-neutral-800 
                            overflow-hidden
                        "
                    >
                        <Image
                            fill
                            alt={`Instance ${index + 1}`}
                            src={image.url}
                            className="
                                object-cover 
                                h-full 
                                w-full
                            "
                            priority={index === 0}
                            draggable={false}
                        />

                        {/* Label Badge */}
                        {image.label && (
                            <div className="
                                absolute 
                                bottom-3 
                                left-3 
                                bg-white/90 
                                backdrop-blur-md
                                text-neutral-900 
                                px-3 
                                py-1.5 
                                rounded-lg 
                                text-xs 
                                font-semibold
                                z-10
                                shadow-sm
                                pointer-events-none
                            ">
                                {image.label}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Navigation Arrows - Only show if more than 1 image */}
            {images.length > 1 && (
                <>
                    {currentIndex > 0 && (
                        <button
                            onClick={handlePrev}
                            className="
                                absolute 
                                top-1/2 
                                -translate-y-1/2 
                                left-2 
                                bg-white/80 
                                hover:bg-white
                                dark:bg-neutral-800/80
                                dark:hover:bg-neutral-800
                                text-neutral-900
                                dark:text-white
                                rounded-full 
                                p-2 
                                opacity-0 
                                group-hover:opacity-100 
                                transition 
                                z-10
                                shadow-sm
                            "
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    {currentIndex < images.length - 1 && (
                        <button
                            onClick={handleNext}
                            className="
                                absolute 
                                top-1/2 
                                -translate-y-1/2 
                                right-2 
                                bg-white/80 
                                hover:bg-white 
                                dark:bg-neutral-800/80
                                dark:hover:bg-neutral-800
                                text-neutral-900
                                dark:text-white
                                rounded-full 
                                p-2 
                                opacity-0 
                                group-hover:opacity-100 
                                transition 
                                z-10
                                shadow-sm
                            "
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}

                    {/* Dots Indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 pointer-events-none">
                        {images.slice(0, 5).map((_, index) => (
                            <div
                                key={index}
                                className={`
                                    w-1.5 h-1.5 rounded-full transition-all shadow-sm
                                    ${index === currentIndex ? 'bg-white scale-110' : 'bg-white/60'}
                                `}
                            />
                        ))}
                        {images.length > 5 && (
                            <div className={`w-1 h-1 rounded-full bg-white/60 self-center`} />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ListingCardCarousel;
