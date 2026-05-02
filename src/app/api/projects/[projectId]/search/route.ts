import { auth } from "@/lib/auth"
import { searchFiles, fuzzySearch } from "@/lib/simple-search"
import { verifyProjectAccess } from "@/lib/project-fs"
import { NextResponse } from "next/server"

// POST - Ricerca semantica nei file del progetto
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const userId = session.user.id

  // Verifica accesso al progetto
  const hasAccess = await verifyProjectAccess(userId, projectId)
  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { query, limit = 10 } = body

    if (!query || typeof query !== "string" || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      )
    }

    // Esegui ricerca full-text migliorata
    const results = await searchFiles(userId, projectId, query, limit)

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[API] Error searching:", error)
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    )
  }
}
