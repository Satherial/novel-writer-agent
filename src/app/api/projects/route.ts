import { auth } from "@/lib/auth"
import { prisma } from "../../../../prisma/config"
import { createProjectStructure, getUserPath } from "@/lib/project-fs"
import * as path from "path"
import { NextResponse } from "next/server"

// GET - Lista progetti dell'utente
export async function GET(request: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("[API] Error listing projects:", error)
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 })
  }
}

// POST - Crea nuovo progetto
export async function POST(request: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== "string" || name.length < 3) {
      return NextResponse.json(
        { error: "Project name must be at least 3 characters" },
        { status: 400 }
      )
    }

    // Genera projectId da nome (sanitizzato)
    const projectId = name
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50)

    // Verifica unicità nel DB
    const existing = await prisma.project.findUnique({
      where: {
        userId_name: {
          userId: session.user.id,
          name,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Project with this name already exists" },
        { status: 409 }
      )
    }

    // Crea nel database
    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        path: projectId,
      },
    })

    // Crea struttura filesystem
    await createProjectStructure(session.user.id, projectId)

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}
