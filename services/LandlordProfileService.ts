import prisma from "@/libs/prismadb";

/**
 * LandlordProfileService
 *
 * Manages landlord public profile data and response statistics.
 * Computes average response time and response rate from conversation
 * history, and exposes a privacy-safe public profile (no full last name,
 * email, phone, or address).
 */
export class LandlordProfileService {
  /**
   * Format a response time in minutes into a human-readable string.
   */
  static formatResponseTime(minutes: number | null | undefined): string | null {
    if (minutes == null) return null;

    if (minutes < 60) return "< 1h";
    if (minutes < 120) return "~1h";
    if (minutes < 1440) return "~" + Math.round(minutes / 60) + "h";
    if (minutes < 2880) return "~1 jour";
    return "~" + Math.round(minutes / 1440) + " jours";
  }

  /**
   * Return a privacy-safe public profile for a landlord.
   * NEVER returns full last name, email, phone, or address.
   */
  static async getPublicProfile(landlordId: string) {
    const user = await prisma.user.findUnique({
      where: { id: landlordId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        image: true,
        bio: true,
        createdAt: true,
        lastActiveAt: true,
        averageResponseTime: true,
        responseRate: true,
        _count: { select: { properties: true } },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      firstName:
        user.firstName || user.name?.split(" ")[0] || "Proprietaire",
      lastInitial: user.lastName?.charAt(0)?.toUpperCase() || "",
      avatarUrl: user.image,
      bio: user.bio,
      propertyCount: user._count.properties,
      memberSince: user.createdAt,
      averageResponseTime: user.averageResponseTime,
      responseRate: user.responseRate,
      isActive: user.lastActiveAt
        ? Date.now() - user.lastActiveAt.getTime() < 7 * 24 * 60 * 60 * 1000
        : false,
    };
  }

  /**
   * Recompute response time and response rate from the landlord's
   * conversation history (last 90 days) and persist the result.
   *
   * - Messages with a reply within 7 days count toward average response time.
   * - Messages with no reply within 7 days count against response rate but
   *   are excluded from the average.
   */
  static async refreshStats(landlordId: string): Promise<void> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // Get all conversations the landlord is part of
    const conversations = await prisma.conversation.findMany({
      where: {
        users: { some: { id: landlordId } },
      },
      select: {
        id: true,
        messages: {
          where: { createdAt: { gte: ninetyDaysAgo } },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
    });

    let totalReceived = 0;
    let totalResponded = 0;
    const responseTimes: number[] = [];
    let lastActive: Date | null = null;

    for (const conv of conversations) {
      const messages = conv.messages;

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        // Track last active
        if (msg.senderId === landlordId) {
          if (!lastActive || msg.createdAt > lastActive) {
            lastActive = msg.createdAt;
          }
        }

        // Only process messages NOT from the landlord (= messages received)
        if (msg.senderId === landlordId) continue;

        totalReceived++;

        // Find the next message from the landlord (= their reply)
        const reply = messages
          .slice(i + 1)
          .find((m) => m.senderId === landlordId);

        if (reply) {
          const deltaMs =
            reply.createdAt.getTime() - msg.createdAt.getTime();
          if (deltaMs <= sevenDaysMs) {
            totalResponded++;
            responseTimes.push(Math.round(deltaMs / 60000));
          }
          // else: no response within 7 days — counts against rate
        }
      }
    }

    const averageResponseTime =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          )
        : null;

    const responseRate =
      totalReceived > 0
        ? Math.round((totalResponded / totalReceived) * 100)
        : null;

    await prisma.user.update({
      where: { id: landlordId },
      data: {
        averageResponseTime,
        responseRate,
        ...(lastActive ? { lastActiveAt: lastActive } : {}),
      },
    });
  }
}
