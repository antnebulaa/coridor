import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId: currentUser.id },
      select: {
        badgeLevel: true,
        verifiedMonths: true,
        punctualityRate: true,
        lastVerifiedAt: true,
        verificationStatus: true,
      },
    });

    if (!tenantProfile) {
      return NextResponse.json(
        { error: "Tenant profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tenantProfile);
  } catch (error) {
    console.error("Badge Fetch Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch badge info" },
      { status: 500 }
    );
  }
}
