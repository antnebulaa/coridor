'use client';

import { useRouter } from 'next/navigation';
import { Boldonse } from 'next/font/google';

const font = Boldonse({
    weight: '400',
    subsets: ['latin'],
    adjustFontFallback: false,
});

const Logo = () => {
    const router = useRouter();

    return (
        <div
            onClick={() => router.push('/')}
            className={`
                hidden
                md:block
                cursor-pointer
                text-lg
                text-[#FE3C08]
                ${font.className}
            `}
        >
            CORIDOR
        </div>
    );
};

export default Logo;
