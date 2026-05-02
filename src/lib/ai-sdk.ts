// AI Tool SDK per NovelCraft AI
// Integrazione con Ollama per writing assistance

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral:7b"

export interface AIMessage {
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: Date
}

export interface AIContext {
  projectId: string
  userId: string
  currentFile?: string
  projectOutline?: string
  recentFiles?: string[]
}

export interface AIResponse {
  message: string
  suggestions?: string[]
  actions?: Array<{
    type: "create_file" | "edit_file" | "search"
    description: string
    data?: any
  }>
}

// Client Ollama per chat
class OllamaClient {
  private baseUrl: string
  private model: string

  constructor(baseUrl: string = OLLAMA_BASE_URL, model: string = OLLAMA_MODEL) {
    this.baseUrl = baseUrl
    this.model = model
  }

  async chat(messages: AIMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const data = await response.json()
      return data.message?.content || "Risposta non disponibile"
    } catch (error) {
      console.error("[AI] Ollama chat error:", error)
      throw new Error("Errore di comunicazione con Ollama")
    }
  }

  async generate(prompt: string, options?: {
    max_tokens?: number
    temperature?: number
  }): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            max_tokens: options?.max_tokens || 1000,
            temperature: options?.temperature || 0.7
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const data = await response.json()
      return data.response || "Contenuto non disponibile"
    } catch (error) {
      console.error("[AI] Ollama generate error:", error)
      throw new Error("Errore nella generazione del contenuto")
    }
  }
}

// Writing Assistant con contesto del progetto
export class WritingAssistant {
  private ollama: OllamaClient
  private context: AIContext

  constructor(context: AIContext) {
    this.ollama = new OllamaClient()
    this.context = context
  }

  // Costruisce il prompt di sistema con contesto del progetto
  private buildSystemPrompt(): string {
    return `Sei un assistente di scrittura esperto per romanzi. 

CONTESTO PROGETTO:
- Project ID: ${this.context.projectId}
- User ID: ${this.context.userId}
${this.context.currentFile ? `- File corrente: ${this.context.currentFile}` : ''}
${this.context.projectOutline ? `- Outline del progetto: ${this.context.projectOutline}` : ''}

IL TUO RUOLO:
1. Aiuta l'utente a scrivere il suo romanzo
2. Fornisci suggerimenti creativi e costruttivi
3. Mantieni coerenza con il contesto del progetto
4. Suggerisci azioni concrete quando appropriato

REGOLE:
- Rispondi in italiano
- Sii encouraging ma onesto
- Fai domande per capire meglio le necessità
- Suggerisci miglioramenti specifici
- Mantieni un tono professionale ma amichevole`
  }

  // Chat con contesto del progetto
  async chat(message: string, history?: AIMessage[]): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt()
    
    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...(history || []),
      { role: "user", content: message, timestamp: new Date() }
    ]

    try {
      const response = await this.ollama.chat(messages)
      
      // Analizza la risposta per suggerimenti e azioni
      const suggestions = this.extractSuggestions(response)
      const actions = this.extractActions(response)

      return {
        message: response,
        suggestions,
        actions
      }
    } catch (error) {
      console.error("[AI] Writing assistant chat error:", error)
      throw error
    }
  }

  // Genera contenuto basato su un prompt
  async generateContent(prompt: string, type: "chapter" | "character" | "dialogue" | "description"): Promise<string> {
    const systemPrompt = this.buildSystemPrompt()
    
    const enhancedPrompt = `${systemPrompt}

TIPO DI CONTENUTO: ${type.toUpperCase()}
PROMPT: ${prompt}

Genera contenuto di alta qualità seguendo le indicazioni.`

    try {
      return await this.ollama.generate(enhancedPrompt, {
        max_tokens: type === "chapter" ? 2000 : 800,
        temperature: 0.8
      })
    } catch (error) {
      console.error("[AI] Content generation error:", error)
      throw error
    }
  }

  // Estrae suggerimenti dalla risposta AI
  private extractSuggestions(response: string): string[] {
    const suggestions: string[] = []
    
    // Cerca pattern come "Suggerimento:" o "Consiglio:"
    const patterns = [
      /suggerimento[:\s]*([^.!?]*[.!?])/gi,
      /consiglio[:\s]*([^.!?]*[.!?])/gi,
      /potresti[:\s]*([^.!?]*[.!?])/gi
    ]

    patterns.forEach(pattern => {
      const matches = response.match(pattern)
      if (matches) {
        suggestions.push(...matches.map(m => m.trim()))
      }
    })

    return suggestions.slice(0, 3) // Max 3 suggerimenti
  }

  // Estrae azioni suggerite dalla risposta AI
  private extractActions(response: string): Array<{
    type: "create_file" | "edit_file" | "search"
    description: string
    data?: any
  }> {
    const actions: Array<{
      type: "create_file" | "edit_file" | "search"
      description: string
      data?: any
    }> = []

    // Pattern per riconoscere suggerimenti di azioni
    if (response.includes("crea un nuovo") || response.includes("nuovo file")) {
      actions.push({
        type: "create_file",
        description: "Crea un nuovo file per il progetto"
      })
    }

    if (response.includes("cerca") || response.includes("trova")) {
      actions.push({
        type: "search",
        description: "Cerca contenuti nel progetto"
      })
    }

    return actions
  }
}

// Factory function per creare Writing Assistant
export function createWritingAssistant(context: AIContext): WritingAssistant {
  return new WritingAssistant(context)
}

// Funzioni di utilità per l'integrazione
export async function getProjectContext(userId: string, projectId: string): Promise<AIContext> {
  try {
    // Import delle funzioni del filesystem
    const { readFileRaw, getAllMarkdownFiles } = await import("./project-fs")
    const { prisma } = await import("../../prisma/config")

    // Ottieni informazioni progetto dal database
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userId
      }
    })

    if (!project) {
      throw new Error("Project not found")
    }

    // Ottieni tutti i file Markdown del progetto
    const files = await getAllMarkdownFiles(userId, projectId)
    
    // Leggi l'outline del progetto se esiste
    let projectOutline = ""
    try {
      projectOutline = await readFileRaw(userId, projectId, "outline.md")
    } catch (error) {
      // Outline non trovato, non è un errore critico
      console.log(`[AI] No outline.md found for project ${projectId}`)
    }

    // Limita i file recenti agli ultimi 5 per evitare context troppo lungo
    const recentFiles = files.slice(0, 5)

    return {
      projectId,
      userId,
      projectOutline,
      recentFiles,
      currentFile: undefined // Sarà impostato dal chiamante se necessario
    }

  } catch (error) {
    console.error("[AI] Error getting project context:", error)
    // Fallback a contesto minimo in caso di errore
    return {
      projectId,
      userId,
      recentFiles: [],
      projectOutline: ""
    }
  }
}
