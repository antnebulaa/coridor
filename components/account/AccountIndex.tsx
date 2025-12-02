'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const AccountIndex = () => {
    const router = useRouter();

    useEffect(() => {
        if (window.innerWidth >= 768) {
            router.replace('/account/personal-info');
        }
    }, [router]);

    return null;
}

export default AccountIndex;
