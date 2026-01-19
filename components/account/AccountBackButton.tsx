'use client';

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";

const AccountBackButtonContent = () => {
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl');
    const backHref = returnUrl ? decodeURIComponent(returnUrl) : '/account';

    return (
        <div className="md:hidden mb-6 flex flex-col gap-1">
            <Link
                href={backHref}
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
            </Link>
            {/* DEBUG INFO - TO REMOVE */}
            <div className="text-[10px] text-red-500 font-mono break-all">
                URL: {returnUrl || 'NULL'} <br />
                HREF: {backHref}
            </div>
        </div>
    );
};

const AccountBackButton = () => {
    return (
        <Suspense fallback={<div className="h-10 mb-6" />}>
            <AccountBackButtonContent />
        </Suspense>
    );
};

export default AccountBackButton;
