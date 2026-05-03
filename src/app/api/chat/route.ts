// Fase 4: API Route /api/chat con Ollama e Streaming
// Endpoint streaming con AI SDK v4, iniezione sicura userId nei tool

import { streamText } from "ai"
import { ollama } from "ollama-ai-provider-v2"
import { auth } from "@/lib/auth"
import { createTools } from "@/lib/tools"
import { z } from "zod"
import { tool } from "ai"

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral:7b"

// System prompt per l'assistente scrittura creativa
const SYSTEM_PROMPT = `Sei un assistente esperto di scrittura creativa per romanzi.

IL TUO RUOLO:
- Aiuta l'utente a scrivere il suo romanzo
- Fornisci suggerimenti creativi e costruttivi
- Mantieni coerenza con il contesto del progetto

REGOLE IMPORTANTI:
- Rispondi in italiano
- Sii encouraging ma onesto
- Fai domande per capire meglio le necessità
- Suggerisci miglioramenti specifici

USO DEI TOOL:
Devi SEMPRE usare i tool quando l'utente chiede di:
- Leggere file (outline, capitoli, personaggi)
- Scrivere o modificare contenuto
- Cercare informazioni nel progetto
- Elencare elementi (personaggi, capitoli)

TOOL DISPONIBILI:
1. listUserProjects - Elenca tutti i progetti dell'utente (sempre disponibile, utile in dashboard)
   Esempio: quando l'utente chiede "elenca i miei progetti", USA listUserProjects

2. readProjectFile - Legge un file specifico del progetto (solo quando sei in un progetto)
   Esempio: quando l'utente chiede "leggi il capitolo 1", usa readProjectFile con path="capitolo-01.md"

3. listProjectFiles - Elenca tutti i file del progetto corrente
   Esempio: quando l'utente chiede "cosa c'è nel progetto", usa listProjectFiles

4. searchProject - Cerca nel progetto corrente
   Esempio: quando l'utente chiede "cerca il nome Marco", usa searchProject con query="Marco"

RICORDA: Invoca i tool con i parametri corretti. Non dire "non posso" - usa i tool!`

// Tool factory with userId injection for secure project access
function createChatTools(userId: string, projectId: string | null) {
  // Base tools (always available)
  const baseTools = {
    getCurrentDate: tool({
      description: "Get current date and time",
      parameters: z.object({}),
      execute: async () => {
        return { currentDate: new Date().toISOString() }
      }
    }),

    // List all user projects (available everywhere, especially dashboard)
    listUserProjects: tool({
      description: "Elenca tutti i progetti dell'utente",
      parameters: z.object({}),
      execute: async () => {
        try {
          const { prisma } = await import("../../../../prisma/config")
          const projects = await prisma.project.findMany({
            where: { userId },
            select: { 
              id: true, 
              name: true, 
              description: true, 
              updatedAt: true 
            },
            orderBy: { updatedAt: "desc" }
          })
          return { 
            success: true, 
            count: projects.length,
            projects: projects.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
              lastUpdated: p.updatedAt.toISOString()
            }))
          }
        } catch (error: any) {
          return { error: error.message }
        }
      }
    })
  }

  // Project-specific tools (only when projectId is provided)
  const projectTools = projectId ? {
    // Read project files via API
    readProjectFile: tool({
      description: "Leggi un file specifico del progetto",
      parameters: z.object({
        path: z.string().describe("Percorso del file relativo alla root del progetto")
      }),
      execute: async ({ path }: { path: string }) => {
        try {
          const res = await fetch(`${process.env.NEXTAUTH_URL || ""}/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`, {
            headers: { "Cookie": `next-auth.session-token=${userId}` }
          })
          if (!res.ok) return { error: `File non trovato: ${path}` }
          const data = await res.json()
          return { 
            success: true, 
            path,
            content: data.content || ""
          }
        } catch (error: any) {
          return { error: error.message }
        }
      }
    }),

    // List project files
    listProjectFiles: tool({
      description: "Elenca tutti i file del progetto",
      parameters: z.object({}),
      execute: async () => {
        try {
          const res = await fetch(`${process.env.NEXTAUTH_URL || ""}/api/projects/${projectId}/files`, {
            headers: { "Cookie": `next-auth.session-token=${userId}` }
          })
          if (!res.ok) return { error: "Impossibile leggere i file del progetto" }
          const data = await res.json()
          return { 
            success: true, 
            files: data.files || []
          }
        } catch (error: any) {
          return { error: error.message }
        }
      }
    }),

    // Search project (simple implementation)
    searchProject: tool({
      description: "Cerca testo nei file del progetto",
      parameters: z.object({
        query: z.string().describe("Testo da cercare")
      }),
      execute: async ({ query }: { query: string }) => {
        try {
          const res = await fetch(`${process.env.NEXTAUTH_URL || ""}/api/projects/${projectId}/files`)
          if (!res.ok) return { error: "Impossibile cercare nel progetto" }
          const data = await res.json()
          const files = data.files || []
          
          // Simple search in file names and content
          const results = files.filter((f: any) => 
            f.path?.toLowerCase().includes(query.toLowerCase()) ||
            f.content?.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 10)
          
          return { 
            success: true, 
            results,
            totalFiles: files.length
          }
        } catch (error: any) {
          return { error: error.message }
        }
      }
    })
  } : {}

  return { ...baseTools, ...projectTools }
}

// POST /api/chat - Chat streaming con AI
export async function POST(req: Request) {
  // 1. Verifica autenticazione
  const session = await auth()
  
  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }), 
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }

  const userId = session.user.id

  // 2. Parse body
  let messages: any[] = []
  let projectId: string | null = null
  let saveToDb = true
  
  try {
    const body = await req.json()
    messages = body.messages || []
    projectId = body.projectId || null
    saveToDb = body.saveToDb !== false // default to true
    
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'messages' array" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }), 
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  // 3. Load chat history from database (for context/memory)
  let historyMessages: any[] = []
  if (saveToDb) {
    try {
      const { prisma } = await import("../../../../prisma/config")
      const dbMessages = await prisma.chatMessage.findMany({
        where: {
          userId,
          projectId: projectId || null,
        },
        orderBy: { createdAt: "asc" },
        take: 50, // Last 50 messages for context
      })
      
      historyMessages = dbMessages.map((msg: any) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content || "",
      }))
    } catch (error) {
      console.error("[Chat] Error loading history:", error)
    }
  }

  // 4. Save user message to database
  const lastUserMessage = messages[messages.length - 1]
  if (saveToDb && lastUserMessage?.role === "user") {
    try {
      const { prisma } = await import("../../../../prisma/config")
      await prisma.chatMessage.create({
        data: {
          userId,
          projectId: projectId || null,
          role: "user",
          content: lastUserMessage.content,
        } as any,
      })
    } catch (error) {
      console.error("[Chat] Error saving user message:", error)
    }
  }

  // 5. Crea tool con userId e projectId iniettati (read-only access to project files)
  const tools = createChatTools(userId, projectId)

  // 6. Streaming con gestione errori Ollama
  try {
    // Combine history + current messages for AI context
    const allMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...(projectId ? [{ 
        role: "system" as const, 
        content: `Contesto progetto: ${projectId}. Hai accesso in LETTURA ai file del progetto. Usa i tool per leggere outline, capitoli, personaggi, etc.` 
      }] : []),
      ...historyMessages,
      ...messages
    ]

    const result = streamText({
      model: ollama(OLLAMA_MODEL),
      messages: allMessages,
      tools,
      onError: (error) => {
        console.error("[AI Stream Error]:", error)
      }
    })

    // Collect assistant response to save to database
    const responseText: string[] = []

    // 5. Ritorna stream response
    // toTextStreamResponse() streamma solo il testo finale
    // I tool vengono eseguiti automaticamente da streamText()
    const response = result.toTextStreamResponse({
      headers: {
        "X-Project-Id": projectId || "",
      }
    })
    
    // Log per debug
    console.log(`[Chat API] Streaming response for project: ${projectId}, model: ${OLLAMA_MODEL}`)
    
    // Create a new response with a wrapped reader to capture the assistant's response
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const reader = response.body!.getReader()
    
    let assistantContent = ""
    
    // Process the stream
    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          // Write to the output stream
          await writer.write(value)
          
          // Try to decode and collect text (simplified - actual implementation would parse SSE)
          const text = new TextDecoder().decode(value)
          // Extract content from SSE format: data: {...}
          const lines = text.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.choices?.[0]?.delta?.content) {
                    assistantContent += parsed.choices[0].delta.content
                  }
                } catch {
                  // Not JSON, might be plain text
                  assistantContent += data
                }
              }
            }
          }
        }
        
        // Close the writer
        await writer.close()
        
        // Save assistant message to database after streaming completes
        if (saveToDb && assistantContent) {
          try {
            const { prisma } = await import("../../../../prisma/config")
            await prisma.chatMessage.create({
              data: {
                userId,
                projectId: projectId || null,
                role: "assistant",
                content: assistantContent,
              } as any,
            })
            console.log(`[Chat API] Saved assistant message (${assistantContent.length} chars)`)
          } catch (error) {
            console.error("[Chat] Error saving assistant message:", error)
          }
        }
      } catch (error) {
        console.error("[Chat] Error processing stream:", error)
        await writer.abort(error)
      }
    }
    
    // Start processing in background
    processStream()
    
    // Return the transformed stream to the client
    return new Response(readable, {
      headers: response.headers,
      status: response.status,
    })

  } catch (error: any) {
    console.error("[Chat API Error]:", error)
    
    // Gestione specifica errori Ollama
    if (error.message?.includes("ECONNREFUSED") || error.message?.includes("fetch failed")) {
      return new Response(
        JSON.stringify({ 
          error: "Ollama non disponibile. Verifica che sia avviato con 'ollama serve'" 
        }), 
        { status: 503, headers: { "Content-Type": "application/json" } }
      )
    }
    
    if (error.message?.includes("model")) {
      return new Response(
        JSON.stringify({ 
          error: `Modello '${OLLAMA_MODEL}' non trovato. Esegui: ollama pull ${OLLAMA_MODEL}` 
        }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

// TODO: PRODUZIONE - Estrarre /api/chat in microservizio standalone
// 1. Separare in repo diverso: novelcraft-ai-service
// 2. Usare WebSocket o SSE per streaming cross-domain  
// 3. Aggiungere API key authentication tra frontend e service
// 4. Deploy su container/VPS dedicato per scalabilità Ollama
