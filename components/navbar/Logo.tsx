'use client';

import { useRouter } from 'next/navigation';
import { Boldonse } from 'next/font/google';

const font = Boldonse({
    weight: '400',
    subsets: ['latin'],
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
                text-[#1F1F1F]
                ${font.className}
            `}
        >
            CORIDOR
        </div>
    );
};

export default Logo;
