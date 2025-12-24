import { NextResponse } from "next/server";
import { LeaseService } from "@/services/LeaseService";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function GET(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        // Protection: ideally only accessible by the Landlord of the listing or the Candidate? 
        // For dev/test now, let's keep it open or just check user existence.
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const applicationId = searchParams.get('applicationId');

        if (!applicationId) {
            return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
        }

        const leaseConfig = await LeaseService.generateLeaseConfig(applicationId);

        return NextResponse.json(leaseConfig);
    } catch (error: any) {
        console.error("Lease Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
