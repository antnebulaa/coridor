import AccountSidebar from "@/components/account/AccountSidebar";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import { redirect } from "next/navigation";
import AccountClientLayout from "@/components/account/AccountClientLayout";

export default async function AccountLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    return (
        <ClientOnly>
            <AccountClientLayout sidebar={<AccountSidebar currentUser={currentUser} />}>
                {children}
            </AccountClientLayout>
        </ClientOnly>
    );
}
