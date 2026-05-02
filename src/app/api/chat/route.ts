// Fase 4: API Route /api/chat con Ollama e Streaming
// Endpoint streaming con AI SDK v4, iniezione sicura userId nei tool

import { streamText } from "ai"
import { ollama } from "ollama-ai-provider-v2"
import { auth } from "@/lib/auth"
import { createTools } from "@/lib/tools"

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
1. readChapter - Legge un file Markdown
   Esempio: quando l'utente chiede "leggi il mio outline", usa readChapter con path="outline.md"

2. writeChapter - Scrive/aggiorna un file Markdown
   Esempio: quando l'utente chiede "salva questo capitolo", usa writeChapter con path, content e frontmatter

3. listCharacters - Elenca tutti i personaggi
   Esempio: quando l'utente chiede "elenca i personaggi", usa listCharacters

4. getCharacterProfile - Legge profilo specifico
   Esempio: quando l'utente chiede "dimmi del protagonista", usa getCharacterProfile con name="protagonista"

5. saveNote - Salva una nota
   Esempio: quando l'utente chiede "salva questa idea", usa saveNote con filename, content e category

6. searchProject - Cerca nel progetto
   Esempio: quando l'utente chiede "cerca il nome Marco", usa searchProject con query="Marco"

RICORDA: Invoca i tool con i parametri corretti. Non dire "non posso" - usa i tool!`

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
  let messages
  let projectId
  try {
    const body = await req.json()
    messages = body.messages
    projectId = body.projectId
    
    if (!messages || !Array.isArray(messages)) {
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

  // 3. Crea tool con userId iniettato
  const tools = createTools(userId)

  // 4. Streaming con gestione errori Ollama
  try {
    const result = streamText({
      model: ollama(OLLAMA_MODEL),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(projectId ? [{ 
          role: "system" as const, 
          content: `Contesto progetto: ${projectId}. Usa i tool per accedere ai file.` 
        }] : []),
        ...messages
      ],
      tools,
      onError: (error) => {
        console.error("[AI Stream Error]:", error)
      }
    })

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
    
    return response

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
