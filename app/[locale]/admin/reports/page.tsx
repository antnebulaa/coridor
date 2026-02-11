
import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "next/navigation";
import prisma from "@/libs/prismadb";
import ReportsClient from "./ReportsClient";

export default async function AdminReportsPage() {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        redirect('/');
    }

    const reports = await prisma.report.findMany({
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            reporter: true,
            listing: {
                select: {
                    id: true,
                    title: true
                }
            },
            targetUser: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });

    // Serialize dates
    const safeReports = reports.map((report) => ({
        ...report,
        createdAt: report.createdAt.toISOString(),
        reporter: {
            ...report.reporter,
            createdAt: report.reporter.createdAt.toISOString(),
            updatedAt: report.reporter.updatedAt.toISOString(),
            emailVerified: report.reporter.emailVerified?.toISOString() || null
        },
        // listing and targetUser don't need Date serialization as we only selected basic fields
    }));

    return (
        <div className="w-full">
            <ReportsClient reports={safeReports as any} />
        </div>
    );
}
