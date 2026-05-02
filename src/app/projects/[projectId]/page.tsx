import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "../../../../prisma/config"
import SearchClient from "@/components/search-client"
import IndexProjectButton from "@/components/index-project-button"
import AIChatInterface from "@/components/ai-chat-interface"
import AIContentGenerator from "@/components/ai-content-generator"
import ProjectWorkspace from "@/components/project-workspace"
import OutlineManager from "@/components/outline-manager"
import CharacterTools from "@/components/character-tools"

interface SearchResult {
  filePath: string
  content: string
  score: number
}

export default async function ProjectPage({ 
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

  // Stato indicizzazione
  let indexStatus = { indexed: false, indexedFiles: 0 }
  try {
    const { vectorTableExists } = await import("@/lib/vector-db")
    const exists = await vectorTableExists(projectId)
    
    // Conta file indicizzati
    if (exists) {
      const tableName = `vectors_${projectId.replace(/[^a-zA-Z0-9_]/g, '_')}`
      try {
        const result = await prisma.$queryRawUnsafe(`
          SELECT COUNT(DISTINCT file_path) as count
          FROM ${tableName}
          WHERE project_id = ${projectId}
        `) as Array<{ count: number }>
        
        indexStatus = { indexed: true, indexedFiles: result[0]?.count || 0 }
      } catch (error) {
        console.error("Error counting indexed files:", error)
      }
    }
  } catch (error) {
    console.error("Failed to check index status:", error)
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
          <div className="flex items-center gap-4 text-sm">
            <a 
              href="/dashboard" 
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
            >
              ← Dashboard
            </a>
            
            <span className={`px-2 py-1 rounded ${
              indexStatus.indexed 
                ? "bg-green-100 text-green-700" 
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {indexStatus.indexed 
                ? `Indicizzato (${indexStatus.indexedFiles} file)` 
                : "Non indicizzato"
              }
            </span>
            {!indexStatus.indexed && (
              <IndexProjectButton projectId={projectId} />
            )}
          </div>
        </div>

        {/* Workspace, Ricerca e AI Tools */}
        <div className="space-y-8">
          {/* File Editor Workspace */}
          <ProjectWorkspace projectId={projectId} />
          
          {/* Outline, Characters, Ricerca e AI Tools */}
          <div className="space-y-8">
            {/* Outline Manager */}
            <OutlineManager projectId={projectId} />
            
            {/* Character Tools */}
            <CharacterTools projectId={projectId} />
            
            {/* Ricerca e AI Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sidebar ricerca */}
              <div>
                <div className="space-y-6">
                  <SearchClient projectId={projectId} />
                  <AIContentGenerator projectId={projectId} />
                </div>
              </div>
              
              {/* AI Chat e Risultati ricerca */}
              <div className="space-y-6">
                <AIChatInterface projectId={projectId} />
                <div id="search-results">
                  <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="text-lg font-semibold mb-4">Ricerca</h3>
                    <p className="text-gray-500">Usa la ricerca semantica per trovare contenuti nei tuoi documenti.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
