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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const projectsWithArchived = projects.map(({ userId, ...p }) => ({
      ...p,
      isArchived: p.isArchived || p.path?.includes("/_archived/") || false,
    }))

    return NextResponse.json({ projects: projectsWithArchived })
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
    // Gestisce sia JSON che form-encoded
    let name: string
    let description: string | undefined
    
    const contentType = request.headers.get("content-type")
    
    if (contentType?.includes("application/json")) {
      const body = await request.json()
      name = body.name
      description = body.description
    } else {
      // Form-encoded data
      const formData = await request.formData()
      name = formData.get("name") as string
      description = formData.get("description") as string | undefined
    }

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
    console.log(`[API] Creating project in database: ${projectId}`)
    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        path: projectId,
      },
    })
    console.log(`[API] Project created in database: ${project.id}`)

    // Crea struttura filesystem
    console.log(`[API] Creating filesystem structure for user: ${session.user.id}, project: ${projectId}`)
    await createProjectStructure(session.user.id, projectId)
    console.log(`[API] Filesystem structure created successfully`)

    // Se è una richiesta form-encoded, fai redirect
    const requestContentType = request.headers.get("content-type")
    if (!requestContentType?.includes("application/json")) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}
