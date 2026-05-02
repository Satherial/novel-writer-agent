import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../prisma/config";
import CreateProjectForm from "@/components/create-project-form";
import ProjectList from "@/components/project-list";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch progetti dell'utente
  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}>
            <button 
              type="submit" 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </form>
        </div>
        <p className="text-gray-600 mb-8">
          Benvenuto, <span className="font-medium">{session.user.email}</span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista progetti */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">I tuoi Progetti</h2>
              <ProjectList projects={projects} />
            </div>
          </div>

          {/* Sidebar con form creazione */}
          <div>
            <CreateProjectForm />
          </div>
        </div>
      </div>
    </main>
  );
}
