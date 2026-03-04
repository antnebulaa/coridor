'use client';

import { Link } from '@/i18n/navigation';

const Logo = () => {
    return (
        <Link
            href="/"
            className="hidden md:block cursor-pointer text-[16px] text-[#151515]"
            style={{ fontFamily: "'Boldonse', sans-serif" }}
        >
            CORIDOR
        </Link>
    );
};

export default Logo;
