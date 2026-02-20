'use client';

import { useRouter } from "@/i18n/navigation";
import { ChevronLeft } from "lucide-react";

const AccountBackButton = () => {
    const router = useRouter();

    return (
        <div className="md:hidden mb-6 flex flex-col gap-1">
            <button
                onClick={() => router.back()}
                className="
                    inline-flex
                    items-center
                    justify-center
                    p-2
                    rounded-full
                    hover:bg-neutral-100
                    transition
                    -ml-2
                    bg-neutral-100
                "
            >
                <ChevronLeft size={24} />
            </button>
        </div>
    );
};

export default AccountBackButton;
