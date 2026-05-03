import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "../../../../prisma/config"
import ProjectClient from "@/components/project-client"

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
    <ProjectClient
      projectId={projectId}
      projectName={project.name}
      projectDescription={project.description}
      indexStatus={indexStatus}
    />
  )
}
