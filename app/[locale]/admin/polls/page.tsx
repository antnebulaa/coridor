import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "next/navigation";
import prisma from "@/libs/prismadb";
import PollManagementClient from "./PollManagementClient";

const AdminPollsPage = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    redirect('/');
  }

  // Fetch all polls with response counts and creator info
  const polls = await prisma.neighborhoodPoll.findMany({
    include: {
      _count: { select: { responses: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' }
  });

  // Serialize dates
  const safePolls = polls.map(poll => ({
    id: poll.id,
    title: poll.title,
    description: poll.description,
    category: poll.category,
    status: poll.status,
    option1: poll.option1,
    option2: poll.option2,
    option3: poll.option3,
    createdAt: poll.createdAt.toISOString(),
    closedAt: poll.closedAt?.toISOString() || null,
    createdBy: poll.createdBy,
    responseCount: poll._count.responses,
  }));

  return <PollManagementClient polls={safePolls} />;
};

export default AdminPollsPage;
