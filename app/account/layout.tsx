import Container from "@/components/Container";
import AccountSidebar from "@/components/account/AccountSidebar";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import { redirect } from "next/navigation";

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
            <Container>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                    <div className="col-span-1">
                        <AccountSidebar />
                    </div>
                    <div className="col-span-3">
                        {children}
                    </div>
                </div>
            </Container>
        </ClientOnly>
    );
}
