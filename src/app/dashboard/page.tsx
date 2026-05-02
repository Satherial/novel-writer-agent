import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../prisma/config";
import CreateProjectFormSimple from "@/components/create-project-form-simple";

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Dashboard</h1>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}>
            <button 
              type="submit" 
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#dc2626', 
                color: 'white', 
                borderRadius: '0.5rem', 
                border: 'none',
                cursor: 'pointer'
              }}
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
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>I tuoi Progetti</h2>
              
              {projects.length === 0 ? (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem 0' }}>
                  Nessun progetto ancora creato.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  {projects.map((project) => (
                    <a
                      key={project.id}
                      href={`/projects/${project.id}`}
                      style={{ 
                        display: 'block', 
                        padding: '1.5rem', 
                        backgroundColor: 'white', 
                        borderRadius: '0.5rem', 
                        border: '1px solid #e5e7eb',
                        textDecoration: 'none',
                        color: 'inherit',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    >
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>{project.name}</h3>
                      {project.description && (
                        <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '1rem' }}>
                          {project.description}
                        </p>
                      )}
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        Creato: {new Date(project.createdAt).toLocaleDateString("it-IT")}
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar con form creazione */}
          <div>
            <CreateProjectFormSimple />
          </div>
        </div>
      </div>
    </main>
  );
}
