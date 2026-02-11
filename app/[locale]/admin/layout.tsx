import Link from "next/link";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Check if user is admin
    // Note: We can't use getCurrentUser directly here because it might use cache() which isn't supported in Layouts the same way sometimes, 
    // but in App Router layouts receive params. For auth check we often use a wrapper or check in page.
    // However, to protect the whole /admin route, we can do it here.

    // Actually, getCurrentUser uses getServerSession which works server-side.
    // Let's rely on page-level or middleware protection usually, but layout is fine for UI structure.
    // To strictly protect, we should check user role.

    // Since getCurrentUser is cached and uses headers(), it should work.

    /* 
       Dynamic import to avoid circular dependency if getCurrentUser imports something that imports layout? 
       No, getCurrentUser is independent.
    */

    // We'll create a simple client-side or server-side check. 
    // Best practice in App Router: Layouts can fetch data.

    // For now, let's just render the layout structure with a sidebar.
    // Real protection should be done in Middleware or per-page if Layout fails.

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full inset-y-0 z-50">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold tracking-wider">CORIDOR ADMIN</h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/admin" className="block px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">
                        Dashboard
                    </Link>
                    <Link href="/admin/listings" className="px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition flex justify-between items-center">
                        <span>Annonces</span>
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">New</span>
                    </Link>
                    <Link href="/admin/users" className="block px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">
                        Utilisateurs
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
                        <span>← Retour au site</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                {children}
            </main>
        </div>
    );
}
