'use client';

import { usePathname } from "next/navigation";
import Container from "@/components/Container";
import AccountBackButton from "./AccountBackButton";

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
                        <AccountBackButton />
                    )}
                    {children}
                </div>
            </div>
        </Container>
    );
}

export default AccountClientLayout;
