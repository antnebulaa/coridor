'use client';

import { usePathname } from "next/navigation";
import Footer from "./Footer";

const ClientFooter = () => {
    const pathname = usePathname();
    const isHomepage = pathname === '/';

    if (isHomepage) {
        return null;
    }

    return <Footer />;
}

export default ClientFooter;
