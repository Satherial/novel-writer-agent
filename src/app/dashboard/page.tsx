import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-8">
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
        <p className="text-gray-500">
          ID Utente: {session.user.id}
        </p>
        <div className="mt-8 p-6 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Progetti</h2>
          <p className="text-gray-500">Nessun progetto ancora creato.</p>
        </div>
      </div>
    </main>
  );
}
