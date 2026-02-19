'use client';

import { useRouter } from 'next/navigation';

const Logo = () => {
    const router = useRouter();

    return (
        <div
            onClick={() => router.push('/')}
            className="hidden md:block cursor-pointer text-[16px] text-[#151515]"
            style={{ fontFamily: "'Boldonse', sans-serif" }}
        >
            CORIDOR
        </div>
    );
};

export default Logo;
