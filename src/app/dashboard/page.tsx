import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../prisma/config";
import DashboardClient from "@/components/dashboard-client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch progetti dell'utente
  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex h-full">
      {/* Main content - Progetti */}
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <DashboardClient projects={projects} userId={session.user.id} />
        </div>
      </div>
    </div>
  );
}
