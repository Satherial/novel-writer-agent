import { auth } from "@/lib/auth"
import { prisma } from "../../../../../../prisma/config"
import { NextResponse } from "next/server"
import * as fs from "fs/promises"
import * as path from "path"

// POST - Archivia un progetto
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

  try {
    // Verifica proprietà progetto
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (project.isArchived) {
      return NextResponse.json({ error: "Project already archived" }, { status: 409 })
    }

    // Crea cartella _archived se non esiste
    const archivedDir = path.join(process.cwd(), "data", "projects", userId, "_archived")
    await fs.mkdir(archivedDir, { recursive: true })

    // Sposta cartella progetto in _archived
    const projectName = path.basename(project.path)
    const oldPath = path.join(process.cwd(), "data", "projects", userId, projectName)
    const newPath = path.join(archivedDir, projectName)

    await fs.rename(oldPath, newPath)

    // Aggiorna DB
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        isArchived: true,
        path: `_archived/${projectName}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Project "${project.name}" archived successfully`,
      project: updated,
    })
  } catch (error: any) {
    console.error("[API] Error archiving project:", error)
    return NextResponse.json(
      { error: error.message || "Failed to archive project" },
      { status: 500 }
    )
  }
}

// DELETE - Ripristina un progetto archiviato
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

  try {
    // Verifica proprietà progetto
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (!project.isArchived) {
      return NextResponse.json({ error: "Project is not archived" }, { status: 409 })
    }

    // Sposta cartella da _archived a root
    const projectName = path.basename(project.path)
    const archivedPath = path.join(process.cwd(), "data", "projects", userId, "_archived", projectName)
    const newPath = path.join(process.cwd(), "data", "projects", userId, projectName)

    await fs.rename(archivedPath, newPath)

    // Aggiorna DB
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        isArchived: false,
        path: projectName,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Project "${project.name}" restored successfully`,
      project: updated,
    })
  } catch (error: any) {
    console.error("[API] Error restoring project:", error)
    return NextResponse.json(
      { error: error.message || "Failed to restore project" },
      { status: 500 }
    )
  }
}
