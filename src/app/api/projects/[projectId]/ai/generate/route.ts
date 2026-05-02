import { auth } from "@/lib/auth"
import { verifyProjectAccess } from "@/lib/project-fs"
import { createWritingAssistant, getProjectContext } from "@/lib/ai-sdk"
import { NextResponse } from "next/server"

// POST - Genera contenuti con AI
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
    const { prompt, type, currentFile } = body

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required and must be a string" },
        { status: 400 }
      )
    }

    if (!type || !["chapter", "character", "dialogue", "description"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be one of: chapter, character, dialogue, description" },
        { status: 400 }
      )
    }

    // Ottieni contesto del progetto
    const context = await getProjectContext(userId, projectId)
    if (currentFile) {
      context.currentFile = currentFile
    }

    // Crea writing assistant
    const assistant = createWritingAssistant(context)

    // Genera contenuto
    const content = await assistant.generateContent(prompt, type as any)

    return NextResponse.json({
      content,
      type,
      prompt,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[AI] Generate error:", error)
    
    // Gestione errori specifici
    if (error instanceof Error) {
      if (error.message.includes("Ollama")) {
        return NextResponse.json(
          { error: "Ollama non è disponibile. Assicurati che Ollama sia in esecuzione." },
          { status: 503 }
        )
      }
      
      if (error.message.includes("comunicazione")) {
        return NextResponse.json(
          { error: "Errore di comunicazione con il servizio AI" },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    )
  }
}
