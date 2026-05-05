import { auth } from "@/lib/auth"
import { prisma } from "../../../../../prisma/config"
import { NextResponse } from "next/server"
import * as fs from "fs/promises"
import * as path from "path"

// DELETE - Elimina definitivamente un progetto
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

    // Elimina cartella progetto
    const projectPath = path.join(process.cwd(), "data", "projects", userId, project.path)
    await fs.rm(projectPath, { recursive: true, force: true })

    // Elimina dal database (cascade a chatMessages e fileLocks)
    await prisma.project.delete({
      where: { id: projectId },
    })

    return NextResponse.json({
      success: true,
      message: `Project "${project.name}" deleted permanently`,
    })
  } catch (error: any) {
    console.error("[API] Error deleting project:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete project" },
      { status: 500 }
    )
  }
}
