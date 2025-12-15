'use client';

import Modal from "./Modal";
import ListingCardCarousel from "../listings/ListingCardCarousel";

interface ImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: {
        url: string;
        label?: string;
    }[];
}

const ImageModal: React.FC<ImageModalProps> = ({
    isOpen,
    onClose,
    images
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={() => { }}
            title="Photos"
            actionLabel=""
            widthClass="w-full md:w-5/6 lg:w-4/6 xl:w-3/5 h-full md:h-[80vh]"
            body={
                <div className="w-full h-[60vh] md:h-[75vh] relative overflow-hidden rounded-xl">
                    <ListingCardCarousel images={images} />
                </div>
            }
        />
    );
};

export default ImageModal;
