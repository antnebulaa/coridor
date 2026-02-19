'use client';

import { useRouter } from 'next/navigation';
import localFont from 'next/font/local';

const font = localFont({
    src: '../../public/fonts/Boldonse-Regular.ttf',
    weight: '400',
    display: 'swap',
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
                text-[16px]
                text-[#151515]
                ${font.className}
            `}
        >
            CORIDOR
        </div>
    );
};

export default Logo;
