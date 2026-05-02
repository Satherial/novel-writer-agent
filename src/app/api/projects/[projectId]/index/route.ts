import { auth } from "@/lib/auth"
import { verifyProjectAccess } from "@/lib/project-fs"
import { getAllMarkdownFiles } from "@/lib/project-fs"
import { prisma } from "../../../../../../prisma/config"
import { NextResponse } from "next/server"

// POST - Indicizzazione semplificata (solo lista file)
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
    // Lista tutti i file Markdown
    const files = await getAllMarkdownFiles(userId, projectId)
    
    return NextResponse.json({ 
      message: "Project scanned successfully",
      files: files.length,
      indexed: true
    })
  } catch (error) {
    console.error("[API] Error scanning project:", error)
    return NextResponse.json(
      { error: "Failed to scan project" },
      { status: 500 }
    )
  }
}

// GET - Stato indicizzazione progetto
export async function GET(
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
    // Per ora, ritorna sempre "indicizzato" basato sui file presenti
    const files = await getAllMarkdownFiles(userId, projectId)
    
    return NextResponse.json({
      indexed: true,
      indexedFiles: files.length,
      message: `Trovati ${files.length} file Markdown`
    })
  } catch (error) {
    console.error("[API] Error scanning project:", error)
    return NextResponse.json(
      { error: "Failed to scan project" },
      { status: 500 }
    )
  }
}
