import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "../../../../prisma/config"

export default async function SimpleProjectPage({ 
  params 
}: { 
  params: Promise<{ projectId: string }> 
}) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login")
  }

  const { projectId } = await params
  const userId = session.user.id

  // Verifica accesso progetto
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
  })

  if (!project) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header progetto */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          {project.description && (
            <p className="text-gray-600 mb-4">{project.description}</p>
          )}
          
          {/* Pulsanti test */}
          <div className="flex gap-4 mb-4">
            <a 
              href="/dashboard" 
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              ← Torna alla Dashboard
            </a>
            
            <button 
              onClick={() => alert("Test bottone funzionante!")}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Bottone
            </button>
          </div>
        </div>

        {/* Contenuto progetto */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Contenuto Progetto</h2>
          <p className="text-gray-500">Questo è un test per verificare che i pulsanti funzionano.</p>
          <p>Project ID: {projectId}</p>
          <p>User ID: {userId}</p>
          <p>Project Name: {project.name}</p>
        </div>
      </div>
    </main>
  )
}
