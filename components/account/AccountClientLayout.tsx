'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Container from "@/components/Container";

interface AccountClientLayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
}

const AccountClientLayout: React.FC<AccountClientLayoutProps> = ({
    children,
    sidebar
}) => {
    const pathname = usePathname();
    const isMainPage = pathname === '/account';

    return (
        <Container>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-y-10 md:gap-10">
                <div className={`
                    col-span-1
                    ${!isMainPage ? 'hidden md:block' : 'block'}
                `}>
                    {sidebar}
                </div>
                <div className={`
                    col-span-3
                    ${isMainPage ? 'hidden md:block' : 'block'}
                `}>
                    {!isMainPage && (
                        <div className="md:hidden mb-6">
                            <Link
                                href="/account"
                                className="
                                    inline-flex 
                                    items-center 
                                    justify-center 
                                    p-2 
                                    rounded-full 
                                    hover:bg-neutral-100 
                                    transition
                                    -ml-2
                                "
                            >
                                <ChevronLeft size={24} />
                            </Link>
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </Container>
    );
}

export default AccountClientLayout;
