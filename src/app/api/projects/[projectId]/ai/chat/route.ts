import { auth } from "@/lib/auth"
import { verifyProjectAccess } from "@/lib/project-fs"
import { createWritingAssistant, getProjectContext } from "@/lib/ai-sdk"
import { NextResponse } from "next/server"
import { AIMessage } from "@/lib/ai-sdk"

// POST - Chat con AI writing assistant
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
    const { message, history, currentFile } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
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

    // Processa la chat
    const response = await assistant.chat(message, history as AIMessage[])

    return NextResponse.json({
      response: {
        message: response.message,
        suggestions: response.suggestions || [],
        actions: response.actions || []
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[AI] Chat error:", error)
    
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
      { error: "Failed to process chat request" },
      { status: 500 }
    )
  }
}

// GET - Ottieni stato del servizio AI
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
    // Testa connessione con Ollama
    const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
    const model = process.env.OLLAMA_MODEL || "llama3.2"
    
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })

    if (!response.ok) {
      return NextResponse.json({
        status: "unavailable",
        error: "Ollama service not reachable",
        ollamaUrl,
        model
      }, { status: 503 })
    }

    const data = await response.json()
    const models = data.models || []
    const modelAvailable = models.some((m: any) => m.name === model)

    return NextResponse.json({
      status: "available",
      ollamaUrl,
      model,
      modelAvailable,
      availableModels: models.map((m: any) => m.name)
    })

  } catch (error) {
    console.error("[AI] Status check error:", error)
    return NextResponse.json({
      status: "error",
      error: "Failed to check AI service status"
    }, { status: 500 })
  }
}
