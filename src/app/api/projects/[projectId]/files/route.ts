import { auth } from "@/lib/auth"
import { 
  readMarkdownFile, 
  writeMarkdownFile, 
  createFile, 
  deleteFile, 
  listFiles,
  fileExists,
  safeResolve,
  PathTraversalError,
} from "@/lib/project-fs"
import { acquireLockIfNeeded, releaseLock, canModify } from "@/lib/project-lock"
import { prisma } from "../../../../../../prisma/config"
import { NextResponse } from "next/server"

// Verifica che l'utente abbia accesso al progetto
async function verifyProjectAccess(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
  })
  return project !== null
}

// GET - Lista file o leggi file specifico
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

  // Verifica accesso
  const hasAccess = await verifyProjectAccess(userId, projectId)
  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get("path")

    if (filePath) {
      // Leggi file specifico
      const file = await readMarkdownFile(userId, projectId, filePath)
      return NextResponse.json({ file })
    } else {
      // Lista file in directory
      const dir = searchParams.get("dir") || "."
      const files = await listFiles(userId, projectId, dir)
      return NextResponse.json({ files })
    }
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    console.error("[API] Error reading files:", error)
    return NextResponse.json({ error: "Failed to read files" }, { status: 500 })
  }
}

// POST - Crea nuovo file
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

  // Verifica accesso
  const hasAccess = await verifyProjectAccess(userId, projectId)
  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { path: filePath, content = "", frontmatter } = body

    if (!filePath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 })
    }

    const result = await createFile(userId, projectId, filePath, content, frontmatter)
    return NextResponse.json({ result }, { status: 201 })
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    console.error("[API] Error creating file:", error)
    return NextResponse.json({ error: "Failed to create file" }, { status: 500 })
  }
}

// PUT - Aggiorna file esistente (con lock)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const userId = session.user.id

  // Verifica accesso
  const hasAccess = await verifyProjectAccess(userId, projectId)
  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { path: filePath, content, frontmatter } = body

    if (!filePath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 })
    }

    // Verifica e acquisisci lock
    const canMod = await canModify(projectId, filePath, "user")
    if (!canMod.allowed) {
      return NextResponse.json({ error: canMod.reason }, { status: 423 })
    }

    // Acquisisci lock automatico se necessario
    await acquireLockIfNeeded(projectId, filePath, "user")

    try {
      const result = await writeMarkdownFile(userId, projectId, filePath, content, frontmatter)
      return NextResponse.json({ result })
    } finally {
      // Rilascia lock
      await releaseLock(projectId, filePath, "user")
    }
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    console.error("[API] Error updating file:", error)
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 })
  }
}

// DELETE - Elimina file
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const userId = session.user.id

  // Verifica accesso
  const hasAccess = await verifyProjectAccess(userId, projectId)
  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get("path")

    if (!filePath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 })
    }

    const result = await deleteFile(userId, projectId, filePath)
    return NextResponse.json({ result })
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    console.error("[API] Error deleting file:", error)
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 })
  }
}
