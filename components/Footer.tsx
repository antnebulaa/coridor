'use client';

import { usePathname } from 'next/navigation';
import Container from './Container';

const Footer = () => {
    const pathname = usePathname();

    if (pathname !== '/') {
        return null;
    }

    return (
        <div className="hidden md:block border-t border-border bg-background z-10 fixed bottom-0 w-full md:relative md:bottom-auto">
            <div className="py-4">
                <Container>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
                        <div className="text-sm text-muted-foreground">
                            © 2025 Airbnb Clone, Inc.
                        </div>
                        <div className="flex flex-row items-center gap-4 text-sm text-muted-foreground">
                            <div className="cursor-pointer hover:underline">Privacy</div>
                            <div className="cursor-pointer hover:underline">Terms</div>
                            <div className="cursor-pointer hover:underline">Sitemap</div>
                        </div>
                    </div>
                </Container>
            </div>
        </div>
    );
};

export default Footer;
