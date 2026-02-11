'use client';

import { Button } from "@/components/ui/Button";

interface EditSectionFooterProps {
    label?: string;
    onClick: () => void;
    disabled?: boolean;
}

const EditSectionFooter: React.FC<EditSectionFooterProps> = ({
    label = "Enregistrer",
    onClick,
    disabled
}) => {
    return (
        <div className="
            fixed 
            bottom-0 
            left-0 
            w-full 
            bg-white 
            border-t 
            border-neutral-200 
            px-4
            pt-4
            pb-[42px] 
            z-50 
            md:sticky
            md:bottom-0
            md:bg-white/90
            md:backdrop-blur-sm
            md:border-t
            md:border-neutral-200
            md:py-4
            md:px-0
            md:mt-4 
            md:flex 
            md:justify-end
        ">
            <div className="w-full md:w-auto">
                <Button
                    disabled={disabled}
                    label={label}
                    onClick={onClick}
                />
            </div>
        </div>
    );
}

export default EditSectionFooter;
