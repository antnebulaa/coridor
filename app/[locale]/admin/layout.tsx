import AdminSidebar from "./components/AdminSidebar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-gray-100">
            <AdminSidebar />

            {/* Main Content — offset for desktop sidebar + top bar on mobile */}
            <main className="flex-1 md:ml-64 pt-14 p-4 md:p-8">
                {children}
            </main>
        </div>
    );
}
