'use client';

import { usePathname } from "next/navigation";
import Footer from "./Footer";

const ClientFooter = () => {
    const pathname = usePathname();
    const isHomepage = pathname === '/';
    const isAdmin = pathname?.includes('/admin');

    if (isHomepage || isAdmin) {
        return null;
    }

    return <Footer />;
}

export default ClientFooter;
