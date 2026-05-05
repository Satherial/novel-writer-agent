// Fase 4: API Route /api/chat con Ollama e Streaming
// Endpoint streaming con AI SDK v4, iniezione sicura userId nei tool

import { streamText } from "ai";
import { ollama } from "ollama-ai-provider-v2";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { tool } from "ai";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral:7b";

// System prompt per l'assistente scrittura creativa
// IMPORTANTE: Questo è ESTREMAMENTE DETTAGLIATO per forzare Mistral 7B a usare i tool correttamente
const SYSTEM_PROMPT = `# Sei un assistente esperto di scrittura creativa per romanzi

## IL TUO RUOLO PRINCIPALE:
Aiuti l'utente a scrivere romanzi fornendo suggerimenti creativi e costruttivi.

## IMPORTANTE - CONCETTO DI PROGETTO:
- Ogni "progetto" è un romanzo COMPLETO e INDIPENDENTE dagli altri
- Gli utenti possono avere MULTIPLE storie/romanzi diversi, ognuno in un progetto separato
- NON assumere mai che i progetti siano "capitoli" dello stesso romanzo
- Ogni progetto è una storia a sé stante con i propri personaggi, trama e ambientazione

## REGOLE CRITICHE - DEVI SEGUIRLE RIGOROSAMENTE:
1. Rispondi SEMPRE in italiano
2. Sii incoraggiante ma onesto
3. QUANDO L'UTENTE CHIEDE INFORMAZIONI SUL PROGETTO, DEVI USARE I TOOL - NON INVENTARE MAI LE RISPOSTE
4. Se non conosci l'informazione, chiedi all'utente oppure usa i tool disponibili
5. MAI MAI MAI inventare descrizioni basate sul nome del progetto (es. "test5" non è un futuristico distopico, potrebbe essere qualsiasi cosa!)

## GESTIONE PROGETTI:
- I progetti con isArchived=true sono ARCHIVIATI e NON devono essere considerati di default
- Quando elenchi progetti, mostra SOLO quelli attivi (isArchived=false)
- Se l'utente chiede ESPLICITAMENTE "mostra anche gli archiviati" o "includi archiviati", allora includili
- Per archiviare un progetto: usa archiveProject(projectId)
- Per RIPRISTINARE un progetto archiviato: usa unarchiveProject(projectId)
- Per ELIMINARE definitivamente un progetto: usa deleteProject(projectId) - ATTENZIONE: azione irreversibile!
- Per creare un nuovo progetto: usa createProject(name, description)

## QUANDO L'UTENTE CHIEDE "DI COSA PARLANO I PROGETTI" O INFORMAZIONI GENERALI SUI PROGETTI:
1. Chiama PRIMA listUserProjects per ottenere l'elenco dei progetti con i loro ID
2. Poi per OGNI progetto trovato, chiama getProjectDetails con il projectId per leggere i file
3. Analizza il contenuto dei file letti per capire di cosa parla ogni storia
4. Rispondi descrivendo i romanzi basandoti ESCLUSIVAMENTE sui contenuti letti dai file
5. NON fare supposizioni generiche - devi leggere i file reali per dare una risposta accurata
6. SE UN PROGETTO HA FILE VUOTI O SOLO TEMPLATE (es. "# Outline...", "Aggiungi qui..."), DILO CHIARAMENTE: "Questo progetto ha solo un outline vuoto/Template, non c'è ancora contenuto"

## QUANDO USARE I TOOL - ISTRUZIONI ESPLICITE:

### SITUAZIONE 1: L'utente chiede "elenca i miei progetti" O simile
→ USA SUBITO: listUserProjects (zero parametri)
→ NON inventare progetti! Chiama il tool!

### SITUAZIONE 1.5: L'utente chiede "di cosa parlano i progetti", "di cosa tratta il progetto X" O "descrivimi le mie storie"
→ OBBLIGATORIO: Chiama listUserProjects per ottenere gli ID dei progetti
→ Poi per OGNI progetto trovato: chiama getProjectDetails(projectId) per LEGGERE I FILE
→ BASA LA RISPOSTA ESCLUSIVAMENTE sui contenuti letti dai file
→ NON inventare trame, generi o descrizioni! DEVI LEGGERE I FILE REALI!

### SITUAZIONE 2: L'utente chiede "leggi il capitolo X" O "cosa c'è nel file Y"
→ USA SUBITO: readProjectFile (con path=nome del file)
→ NON dire "non posso leggere" - usa il tool!

### SITUAZIONE 3: L'utente chiede "lista i file del progetto" O "cosa ho scritto"
→ USA SUBITO: listProjectFiles (zero parametri)
→ NON inventare - interroga i file reali!

### SITUAZIONE 4: L'utente cerca "un personaggio" O "la parola X nel progetto"
→ USA SUBITO: searchProject (con query=testo da cercare)
→ NON fare ricerche mentali - usa il tool!

## WORKFLOW OBBLIGATORIO:
1. Leggi la richiesta dell'utente
2. Identificare quale tool serve (vedi SITUAZIONI sopra)
3. CHIAMARE IL TOOL IMMEDIATAMENTE con i parametri corretti
4. Basare la risposta sui dati reali del tool
5. Se il tool ritorna errore, spiegare gentilmente all'utente

## TOOL DISPONIBILI (ELENCO FINALE):
- listUserProjects(): elenca i progetti dell'utente (sempre disponibile)
- getProjectDetails(projectId): LEGGE I FILE di un progetto specifico dalla dashboard (SEMPRE DISPONIBILE - usa questo per capire di cosa parla un progetto!)
- listProjectFiles(): elenca i file del progetto corrente (in un progetto)
- readProjectFile(path): legge il contenuto di un file (in un progetto)
- searchProject(query): cerca testo nei file del progetto (in un progetto)
- getCurrentDate(): ottiene la data attuale (sempre disponibile)

## RICORDATI ANCORA:
❌ NON inventare liste di progetti
❌ NON inventare il contenuto di file
❌ NON inventare risultati di ricerche
✅ USA I TOOL quando richiesto
✅ SEMPRE leggi i dati reali prima di rispondere`;

// Tool factory with userId injection for secure project access
function createChatTools(userId: string, projectId: string | null) {
  // Base tools (always available)
  const toolsRecord: Record<string, any> = {};

  toolsRecord.getCurrentDate = tool({
    description: "Get current date and time",
    parameters: z.object({}),
    execute: (async () => {
      return { currentDate: new Date().toISOString() };
    }) as any,
  } as any);

  // List all user projects (available everywhere, especially dashboard)
  toolsRecord.listUserProjects = tool({
    description: "Elenca tutti i progetti dell'utente (attivi e archiviati). I progetti archiviati hanno isArchived=true",
    parameters: z.object({}),
    execute: (async () => {
      console.log("[Tool] listUserProjects called for userId:", userId);
      try {
        const { prisma } = await import("../../../../prisma/config");
        const projects = await prisma.project.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            description: true,
            path: true,
            isArchived: true,
          },
          orderBy: { createdAt: "desc" },
        });
        console.log(
          "[Tool] listUserProjects returned:",
          projects.length,
          "projects",
        );
        return {
          success: true,
          count: projects.length,
          activeCount: projects.filter((p: any) => !p.isArchived).length,
          archivedCount: projects.filter((p: any) => p.isArchived).length,
          projects: projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            isArchived: p.isArchived,
          })),
        };
      } catch (error: any) {
        console.error("[Tool] listUserProjects error:", error.message);
        return { error: error.message };
      }
    }) as any,
  } as any);

  // Tool to get details of a specific project (works from dashboard too)
  toolsRecord.getProjectDetails = tool({
    description: "Ottieni i dettagli e il contenuto di un progetto specifico dato il suo ID. Usa questo per leggere i file di un progetto quando sei nella dashboard.",
    parameters: z.object({
      projectId: z.string().describe("ID del progetto da esplorare"),
      maxFiles: z.number().optional().describe("Numero massimo di file da leggere (default: 5)"),
    }),
    execute: (async ({ projectId: targetProjectId, maxFiles = 5 }: { projectId: string; maxFiles?: number }) => {
      console.log("[Tool] getProjectDetails called for projectId:", targetProjectId);
      try {
        const { prisma } = await import("../../../../prisma/config");
        
        // Verify project belongs to user
        const project = await prisma.project.findFirst({
          where: { id: targetProjectId, userId },
          select: { id: true, name: true, description: true, path: true },
        });
        
        if (!project) {
          return { error: "Progetto non trovato o accesso negato" };
        }
        
        // List files in project
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const filesRes = await fetch(
          `${baseUrl}/api/projects/${targetProjectId}/files`,
          { headers: { Cookie: `next-auth.session-token=${userId}` } },
        );
        
        if (!filesRes.ok) {
          return { 
            project: { id: project.id, name: project.name, description: project.description },
            error: "Impossibile leggere i file del progetto" 
          };
        }
        
        const filesData = await filesRes.json();
        const files = filesData.files || [];
        
        // Read content of first N files (prioritize .md and .txt files)
        const filesToRead = files
          .filter((f: any) => f.type === "file")
          .sort((a: any, b: any) => {
            // Prioritize markdown and text files
            const aIsText = a.name.endsWith(".md") || a.name.endsWith(".txt");
            const bIsText = b.name.endsWith(".md") || b.name.endsWith(".txt");
            return bIsText ? 1 : aIsText ? -1 : 0;
          })
          .slice(0, maxFiles);
        
        const fileContents = [];
        for (const file of filesToRead) {
          try {
            const fileRes = await fetch(
              `${baseUrl}/api/projects/${targetProjectId}/files?path=${encodeURIComponent(file.path)}`,
              { headers: { Cookie: `next-auth.session-token=${userId}` } },
            );
            if (fileRes.ok) {
              const fileData = await fileRes.json();
              fileContents.push({
                name: file.name,
                path: file.path,
                content: fileData.content?.substring(0, 2000) || "", // Limit content length
              });
            }
          } catch (e: any) {
            console.warn("[Tool] Failed to read file:", file.path, e.message);
          }
        }
        
        return {
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
          },
          totalFiles: files.length,
          filesRead: fileContents.length,
          fileContents,
        };
      } catch (error: any) {
        console.error("[Tool] getProjectDetails error:", error.message);
        return { error: error.message };
      }
    }) as any,
  } as any);

  // Tool to create a new project (dashboard only)
  toolsRecord.createProject = tool({
    description: "Crea un nuovo progetto di romanzo. Disponibile solo nella dashboard.",
    parameters: z.object({
      name: z.string().describe("Nome del progetto (senza spazi, usa trattini)"),
      description: z.string().optional().describe("Descrizione opzionale del progetto"),
    }),
    execute: (async ({ name, description }: { name: string; description?: string }) => {
      console.log("[Tool] createProject called:", name);
      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const res = await fetch(
          `${baseUrl}/api/projects`,
          {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              Cookie: `next-auth.session-token=${userId}` 
            },
            body: JSON.stringify({ name, description }),
          },
        );
        if (!res.ok) {
          const error = await res.json();
          return { error: error.error || "Errore nella creazione del progetto" };
        }
        const data = await res.json();
        return {
          success: true,
          project: {
            id: data.id,
            name: data.name,
            description: data.description,
          },
          message: `Progetto "${name}" creato con successo!`,
        };
      } catch (error: any) {
        console.error("[Tool] createProject error:", error.message);
        return { error: error.message };
      }
    }) as any,
  } as any);

  // Tool to archive a project (dashboard only)
  toolsRecord.archiveProject = tool({
    description: "Archivia un progetto spostandolo nella cartella _archived. Disponibile solo nella dashboard.",
    parameters: z.object({
      projectId: z.string().describe("ID del progetto da archiviare"),
    }),
    execute: (async ({ projectId: targetProjectId }: { projectId: string }) => {
      console.log("[Tool] archiveProject called for projectId:", targetProjectId);
      try {
        const { prisma } = await import("../../../../prisma/config");

        // Verify project belongs to user
        const project = await prisma.project.findFirst({
          where: { id: targetProjectId, userId },
          select: { id: true, name: true, path: true, isArchived: true },
        });

        if (!project) {
          return { error: "Progetto non trovato o accesso negato" };
        }

        // Check if already archived
        if (project.isArchived) {
          return { error: "Il progetto è già archiviato" };
        }

        const fs = await import("fs/promises");
        const path = await import("path");

        // Create archived folder if not exists
        const archivedDir = path.join(process.cwd(), "data", "projects", userId, "_archived");
        await fs.mkdir(archivedDir, { recursive: true });

        // Move project folder to _archived
        const oldPath = path.join(process.cwd(), "data", "projects", userId, project.path);
        const projectName = path.basename(project.path);
        const newPath = path.join(archivedDir, projectName);

        await fs.rename(oldPath, newPath);

        // Update database
        await prisma.project.update({
          where: { id: targetProjectId },
          data: { path: `_archived/${projectName}`, isArchived: true },
        });
        
        return {
          success: true,
          message: `Progetto "${project.name}" archiviato con successo!`,
          projectId: targetProjectId,
          archivedPath: newPath,
        };
      } catch (error: any) {
        console.error("[Tool] archiveProject error:", error.message);
        return { error: error.message };
      }
    }) as any,
  } as any);

  // Tool to unarchive a project (dashboard only)
  toolsRecord.unarchiveProject = tool({
    description: "Ripristina un progetto archiviato, spostandolo dalla cartella _archived alla cartella principale. Disponibile solo nella dashboard.",
    parameters: z.object({
      projectId: z.string().describe("ID del progetto da ripristinare"),
    }),
    execute: (async ({ projectId: targetProjectId }: { projectId: string }) => {
      console.log("[Tool] unarchiveProject called for projectId:", targetProjectId);
      try {
        const { prisma } = await import("../../../../prisma/config");

        // Verify project belongs to user
        const project = await prisma.project.findFirst({
          where: { id: targetProjectId, userId },
          select: { id: true, name: true, path: true, isArchived: true },
        });

        if (!project) {
          return { error: "Progetto non trovato o accesso negato" };
        }

        // Check if not archived
        if (!project.isArchived) {
          return { error: "Il progetto non è archiviato" };
        }

        const fs = await import("fs/promises");
        const path = await import("path");

        // Move project folder from _archived to root
        const projectName = path.basename(project.path);
        const archivedPath = path.join(process.cwd(), "data", "projects", userId, "_archived", projectName);
        const newPath = path.join(process.cwd(), "data", "projects", userId, projectName);

        await fs.rename(archivedPath, newPath);

        // Update database
        await prisma.project.update({
          where: { id: targetProjectId },
          data: { path: projectName, isArchived: false },
        });

        return {
          success: true,
          message: `Progetto "${project.name}" ripristinato con successo!`,
          projectId: targetProjectId,
        };
      } catch (error: any) {
        console.error("[Tool] unarchiveProject error:", error.message);
        return { error: error.message };
      }
    }) as any,
  } as any);

  // Tool to delete a project permanently (dashboard only)
  toolsRecord.deleteProject = tool({
    description: "Elimina definitivamente un progetto e tutti i suoi file. ATTENZIONE: azione irreversibile! Disponibile solo nella dashboard.",
    parameters: z.object({
      projectId: z.string().describe("ID del progetto da eliminare"),
    }),
    execute: (async ({ projectId: targetProjectId }: { projectId: string }) => {
      console.log("[Tool] deleteProject called for projectId:", targetProjectId);
      try {
        const { prisma } = await import("../../../../prisma/config");

        // Verify project belongs to user
        const project = await prisma.project.findFirst({
          where: { id: targetProjectId, userId },
          select: { id: true, name: true, path: true },
        });

        if (!project) {
          return { error: "Progetto non trovato o accesso negato" };
        }

        const fs = await import("fs/promises");
        const path = await import("path");

        // Delete project folder
        const projectPath = path.join(process.cwd(), "data", "projects", userId, project.path);
        await fs.rm(projectPath, { recursive: true, force: true });

        // Delete from database (cascades to chatMessages and fileLocks)
        await prisma.project.delete({
          where: { id: targetProjectId },
        });

        return {
          success: true,
          message: `Progetto "${project.name}" eliminato definitivamente!`,
          projectId: targetProjectId,
        };
      } catch (error: any) {
        console.error("[Tool] deleteProject error:", error.message);
        return { error: error.message };
      }
    }) as any,
  } as any);

  // Project-specific tools (only when projectId is provided)
  if (projectId) {
    toolsRecord.readProjectFile = tool({
      description: "Leggi un file specifico del progetto",
      parameters: z.object({
        path: z
          .string()
          .describe("Percorso del file relativo alla root del progetto"),
      }),
      execute: (async ({ path }: { path: string }) => {
        console.log(
          "[Tool] readProjectFile called: path=",
          path,
          "projectId=",
          projectId,
        );
        try {
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const res = await fetch(
            `${baseUrl}/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`,
            {
              headers: { Cookie: `next-auth.session-token=${userId}` },
            },
          );
          if (!res.ok) {
            console.warn("[Tool] readProjectFile: file not found:", path);
            return { error: `File non trovato: ${path}` };
          }
          const data = await res.json();
          console.log(
            "[Tool] readProjectFile: successfully read file:",
            path,
            "bytes=",
            data.content?.length || 0,
          );
          return {
            success: true,
            path,
            content: data.content || "",
          };
        } catch (error: any) {
          console.error("[Tool] readProjectFile error:", error.message);
          return { error: error.message };
        }
      }) as any,
    } as any);

    toolsRecord.listProjectFiles = tool({
      description: "Elenca tutti i file del progetto",
      parameters: z.object({}),
      execute: (async () => {
        console.log("[Tool] listProjectFiles called for projectId:", projectId);
        try {
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const res = await fetch(
            `${baseUrl}/api/projects/${projectId}/files`,
            {
              headers: { Cookie: `next-auth.session-token=${userId}` },
            },
          );
          if (!res.ok) {
            console.warn("[Tool] listProjectFiles: failed to fetch files");
            return { error: "Impossibile leggere i file del progetto" };
          }
          const data = await res.json();
          console.log(
            "[Tool] listProjectFiles returned:",
            data.files?.length || 0,
            "files",
          );
          return {
            success: true,
            files: data.files || [],
          };
        } catch (error: any) {
          console.error("[Tool] listProjectFiles error:", error.message);
          return { error: error.message };
        }
      }) as any,
    } as any);

    toolsRecord.searchProject = tool({
      description: "Cerca testo nei file del progetto",
      parameters: z.object({
        query: z.string().describe("Testo da cercare"),
      }),
      execute: (async ({ query }: { query: string }) => {
        console.log(
          "[Tool] searchProject called: query=",
          query,
          "projectId=",
          projectId,
        );
        try {
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const res = await fetch(`${baseUrl}/api/projects/${projectId}/files`);
          if (!res.ok) {
            console.warn("[Tool] searchProject: failed to fetch files");
            return { error: "Impossibile cercare nel progetto" };
          }
          const data = await res.json();
          const files = data.files || [];

          // Simple search in file names and content
          const results = files
            .filter(
              (f: any) =>
                f.path?.toLowerCase().includes(query.toLowerCase()) ||
                f.content?.toLowerCase().includes(query.toLowerCase()),
            )
            .slice(0, 10);

          console.log(
            "[Tool] searchProject found:",
            results.length,
            "matches in",
            files.length,
            "files",
          );
          return {
            success: true,
            results,
            totalFiles: files.length,
          };
        } catch (error: any) {
          console.error("[Tool] searchProject error:", error.message);
          return { error: error.message };
        }
      }) as any,
    } as any);
  }

  return toolsRecord;
}

// POST /api/chat - Chat streaming con AI
export async function POST(req: Request) {
  // 1. Verifica autenticazione
  const session = await auth();

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;

  // 2. Parse body
  let messages: any[] = [];
  let projectId: string | null = null;
  let saveToDb = true;

  try {
    const body = await req.json();
    messages = body.messages || [];
    projectId = body.projectId || null;
    saveToDb = body.saveToDb !== false; // default to true

    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'messages' array" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Load chat history from database (for context/memory)
  let historyMessages: any[] = [];
  if (saveToDb) {
    try {
      const { prisma } = await import("../../../../prisma/config");
      const dbMessages = await prisma.chatMessage.findMany({
        where: {
          userId,
          projectId: projectId || null,
        },
        orderBy: { createdAt: "asc" },
        take: 50, // Last 50 messages for context
      });

      historyMessages = dbMessages.map((msg: any) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content || "",
      }));
    } catch (error) {
      console.error("[Chat] Error loading history:", error);
    }
  }

  // 4. Save user message to database
  const lastUserMessage = messages[messages.length - 1];
  if (saveToDb && lastUserMessage?.role === "user") {
    try {
      const { prisma } = await import("../../../../prisma/config");
      await prisma.chatMessage.create({
        data: {
          userId,
          projectId: projectId || null,
          role: "user",
          content: lastUserMessage.content,
        } as any,
      });
    } catch (error) {
      console.error("[Chat] Error saving user message:", error);
    }
  }

  // 5. FALLBACK TOOL CALLING - Pattern matching per quando Ollama non chiama i tool
  // Analizzo l'ultimo messaggio utente per rilevare richieste comuni di tool
  const lastUserContent = lastUserMessage?.content || "";
  const allMessages_WithFallback: any[] = [];

  // Helper function per il pattern matching (case-insensitive)
  const hasKeywords = (text: string, keywords: string[]): boolean => {
    const lowerText = text.toLowerCase();
    return keywords.some((kw) => lowerText.includes(kw));
  };

  // PATTERN 1: Rilevamento listUserProjects
  // Patterns: "elenca progetti", "lista progetti", "quali sono i miei progetti", "dimmi i progetti"
  if (
    hasKeywords(lastUserContent, [
      "progett",
      "elenco",
      "lista",
      "quali",
      "dimmi",
    ])
  ) {
    console.log("[FALLBACK] Rilevato potenziale richiesta di elenca progetti");
    console.log(
      `[FALLBACK] Contenuto analizzato: "${lastUserContent.substring(0, 100)}"`,
    );

    // Chiama manualmente listUserProjects
    try {
      console.log("[FALLBACK] Esecuzione manuale di listUserProjects...");
      const { prisma } = await import("../../../../prisma/config");
      const projects = await prisma.project.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const projectsFormatted = projects
        .map(
          (p: any) =>
            `- Project: ${p.name}${p.description ? ` (${p.description})` : ""}`,
        )
        .join("\n");

      const toolResultMessage = `[TOOL_RESULT] listUserProjects eseguito manualmente: ${projects.length} progetti trovati\n${projectsFormatted || "Nessun progetto trovato"}`;
      console.log("[FALLBACK] Risultato:", toolResultMessage);

      allMessages_WithFallback.push({
        role: "system" as const,
        content: toolResultMessage,
      });
    } catch (error: any) {
      console.error(
        "[FALLBACK] Errore nell'esecuzione manuale di listUserProjects:",
        error.message,
      );
      const errorMessage = `[TOOL_RESULT] listUserProjects fallito: ${error.message}`;
      allMessages_WithFallback.push({
        role: "system" as const,
        content: errorMessage,
      });
    }
  }

  // PATTERN 2: Rilevamento listProjectFiles
  // Patterns: "file" + ("elenca", "lista", "quali", "quanti") quando projectId è presente
  if (
    projectId &&
    hasKeywords(lastUserContent, ["file"]) &&
    hasKeywords(lastUserContent, [
      "elenco",
      "lista",
      "quali",
      "quanti",
      "dimmi",
      "mostra",
    ])
  ) {
    console.log(
      "[FALLBACK] Rilevato potenziale richiesta di elenca file progetto",
    );
    console.log(
      `[FALLBACK] Contenuto analizzato: "${lastUserContent.substring(0, 100)}"`,
    );
    console.log(`[FALLBACK] ProjectId: ${projectId}`);

    // Chiama manualmente listProjectFiles
    try {
      console.log("[FALLBACK] Esecuzione manuale di listProjectFiles...");
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/projects/${projectId}/files`, {
        headers: { Cookie: `next-auth.session-token=${userId}` },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const files = data.files || [];

      const filesFormatted = files
        .map(
          (f: any) =>
            `- ${f.path}${f.size ? ` (${(f.size / 1024).toFixed(1)} KB)` : ""}`,
        )
        .join("\n");

      const toolResultMessage = `[TOOL_RESULT] listProjectFiles eseguito manualmente: ${files.length} file trovati\n${filesFormatted || "Nessun file trovato"}`;
      console.log("[FALLBACK] Risultato:", toolResultMessage);

      allMessages_WithFallback.push({
        role: "system" as const,
        content: toolResultMessage,
      });
    } catch (error: any) {
      console.error(
        "[FALLBACK] Errore nell'esecuzione manuale di listProjectFiles:",
        error.message,
      );
      const errorMessage = `[TOOL_RESULT] listProjectFiles fallito: ${error.message}`;
      allMessages_WithFallback.push({
        role: "system" as const,
        content: errorMessage,
      });
    }
  }

  // PATTERN 3: Rilevamento "di cosa parlano i progetti" - chiama getProjectDetails per ogni progetto
  // Patterns: "di cosa", "di cosa parla", "cosa contiene", "descrivimi" + "progetti", "storie"
  if (
    !projectId && // Dashboard mode
    hasKeywords(lastUserContent, [
      "di cosa", "di cosa parla", "cosa contiene", "descrivimi", "raccontami", "quali sono",
    ]) &&
    hasKeywords(lastUserContent, [
      "progetti", "storie", "romani", "romanzo", "testi", "lavori"
    ])
  ) {
    console.log("[FALLBACK] Rilevato richiesta DESCRIZIONE CONTENUTI progetti");
    console.log(`[FALLBACK] Contenuto: "${lastUserContent.substring(0, 100)}"`);

    // Prima ottiene la lista progetti
    try {
      console.log("[FALLBACK] Esecuzione manuale listUserProjects...");
      const { prisma } = await import("../../../../prisma/config");
      const projects = await prisma.project.findMany({
        where: { userId },
        select: { id: true, name: true, description: true },
      });

      if (projects.length === 0) {
        allMessages_WithFallback.push({
          role: "system" as const,
          content: "[TOOL_RESULT] Nessun progetto trovato. L'utente non ha ancora creato progetti.",
        });
      } else {
        console.log(`[FALLBACK] Trovati ${projects.length} progetti, leggo i contenuti...`);
        
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const projectsWithContent = [];

        // Per ogni progetto, chiama manualmente getProjectDetails
        for (const project of projects) {
          try {
            console.log(`[FALLBACK] Leggo file del progetto: ${project.name} (${project.id})`);
            
            const filesRes = await fetch(
              `${baseUrl}/api/projects/${project.id}/files`,
              { headers: { Cookie: `next-auth.session-token=${userId}` } },
            );
            
            if (!filesRes.ok) {
              projectsWithContent.push({
                ...project,
                error: "Impossibile leggere i file",
                fileContents: [],
              });
              continue;
            }
            
            const filesData = await filesRes.json();
            const files = filesData.files || [];
            
            // Leggi i primi file di testo
            const fileContents = [];
            const textFiles = files
              .filter((f: any) => f.type === "file" && (f.name.endsWith('.md') || f.name.endsWith('.txt')))
              .slice(0, 3);
            
            for (const file of textFiles) {
              try {
                const fileRes = await fetch(
                  `${baseUrl}/api/projects/${project.id}/files?path=${encodeURIComponent(file.path)}`,
                  { headers: { Cookie: `next-auth.session-token=${userId}` } },
                );
                if (fileRes.ok) {
                  const fileData = await fileRes.json();
                  fileContents.push({
                    file: file.name,
                    content: fileData.content?.substring(0, 1500) || "",
                  });
                }
              } catch (e: any) {
                console.warn(`[FALLBACK] Errore lettura file ${file.name}:`, e.message);
              }
            }
            
            projectsWithContent.push({
              ...project,
              totalFiles: files.length,
              filesRead: fileContents.length,
              fileContents,
            });
            
          } catch (e: any) {
            console.error(`[FALLBACK] Errore lettura progetto ${project.id}:`, e.message);
            projectsWithContent.push({
              ...project,
              error: e.message,
              fileContents: [],
            });
          }
        }

        // Formatta il risultato per l'LLM
        const formattedResults = projectsWithContent.map(p => {
          const contentSummary = p.fileContents && p.fileContents.length > 0
            ? `FILE LETTI (${p.fileContents.length}):\n${p.fileContents.map((fc: any) =>
                `- ${fc.file}:\n${fc.content.substring(0, 500)}...`
              ).join('\n')}`
            : 'error' in p && p.error
              ? `ERRORE: ${p.error}`
              : "NESSUN FILE DI TESTO TROVATO (solo outline vuoto o template)";
          
          return `\n=== PROGETTO: ${p.name} ===\nID: ${p.id}\nDescrizione DB: ${p.description || "N/A"}\nFile totali: ${'totalFiles' in p ? p.totalFiles || 0 : 0}\n${contentSummary}`;
        }).join("\n");

        const toolResultMessage = `[TOOL_RESULT] getProjectDetails eseguito manualmente per ${projects.length} progetti.\n${formattedResults}`;
        
        console.log("[FALLBACK] Risultato formattato inviato all'LLM");
        
        allMessages_WithFallback.push({
          role: "system" as const,
          content: toolResultMessage,
        });
        
        // Aggiungi anche un messaggio di istruzione per l'LLM
        allMessages_WithFallback.push({
          role: "system" as const,
          content: "[ISTRUZIONE] SOPRA trovi i contenuti REALI dei file di ogni progetto. DESCRIVI ogni storia basandoti ESCLUSIVAMENTE sui contenuti letti. NON inventare generi, trame o descrizioni! Se un progetto ha solo un outline vuoto o template, dillo chiaramente.",
        });
      }
    } catch (error: any) {
      console.error("[FALLBACK] Errore nel fallback getProjectDetails:", error.message);
      allMessages_WithFallback.push({
        role: "system" as const,
        content: `[TOOL_RESULT] Errore nel leggere i progetti: ${error.message}`,
      });
    }
  }

  // 6. Crea tool con userId e projectId iniettati (read-only access to project files)
  const tools = createChatTools(userId, projectId);

  // 7. Streaming con gestione errori Ollama
  try {
    // Combine history + current messages for AI context
    // IMPORTANTE: NON mettere system prompt in allMessages, è già nel parametro system di streamText
    const allMessages = [
      // Se c'è un projectId, aggiungi SOLO il contesto progetto come user message, non come system
      ...(projectId
        ? [
            {
              role: "user" as const,
              content: `[CONTESTO: Sei in un progetto con ID: ${projectId}. Hai accesso ai file tramite i tool listProjectFiles, readProjectFile, searchProject]`,
            },
          ]
        : []),
      ...historyMessages,
      ...allMessages_WithFallback, // Inietta i risultati dei tool eseguiti manualmente
      ...messages,
    ];

    // Log DETTAGLIATO per debug tool calling
    console.log("\n" + "=".repeat(60));
    console.log("[Chat API] RICHIESTA CHAT");
    console.log("=".repeat(60));
    console.log("[Chat API] Utente:", userId);
    console.log(
      "[Chat API] Progetto:",
      projectId || "dashboard (nessun progetto)",
    );
    console.log("[Chat API] Numero di messaggi:", allMessages.length);
    console.log("[Chat API] Tool disponibili:", Object.keys(tools));
    console.log("[Chat API] Modello usato:", OLLAMA_MODEL);
    console.log(
      "[Chat API] Ultimo messaggio utente:",
      messages[messages.length - 1]?.content?.substring(0, 100),
    );
    console.log("=".repeat(60) + "\n");

    // Stream the response directly
    // Nota: il parametro 'system' viene passato SEPARATAMENTE dalle messages per evitare duplicazione
    const result = await streamText({
      model: ollama(OLLAMA_MODEL),
      system: SYSTEM_PROMPT,
      messages: allMessages,
      tools,
      toolChoice: "auto", // Forza Mistral a considerare SEMPRE i tool quando pertinente
      onStepFinish: async (step) => {
        // Log tool calls se accadono
        if (step.toolCalls && step.toolCalls.length > 0) {
          console.log("[Chat API] ⚡ TOOL CALL RILEVATO!");
          step.toolCalls.forEach((call: any) => {
            console.log(`  - Tool: ${call.toolName}`);
            console.log(`    Parametri: ${JSON.stringify(call.args)}`);
          });
        }

        // Log della risposta finale
        if (step.text) {
          console.log(
            "[Chat API] Risposta generata:",
            step.text.substring(0, 150) + "...",
          );
        }

        // After the full response is done, save to database
        if (saveToDb && step.finishReason === "stop" && step.text) {
          try {
            const { prisma } = await import("../../../../prisma/config");
            await prisma.chatMessage.create({
              data: {
                userId,
                projectId: projectId || null,
                role: "assistant",
                content: step.text,
              } as any,
            });
            console.log(
              `[Chat API] Saved assistant message (${step.text.length} chars)`,
            );
          } catch (error) {
            console.error("[Chat] Error saving assistant message:", error);
          }
        }
      },
    });

    // Return the stream response directly
    return result.toTextStreamResponse({
      headers: {
        "X-Project-Id": projectId || "",
      },
    });
  } catch (error: any) {
    console.error("[Chat API Error]:", error);

    // Gestione specifica errori Ollama
    if (
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("fetch failed")
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Ollama non disponibile. Verifica che sia avviato con 'ollama serve'",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    if (error.message?.includes("model")) {
      return new Response(
        JSON.stringify({
          error: `Modello '${OLLAMA_MODEL}' non trovato. Esegui: ollama pull ${OLLAMA_MODEL}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// TODO: PRODUZIONE - Estrarre /api/chat in microservizio standalone
// 1. Separare in repo diverso: novelcraft-ai-service
// 2. Usare WebSocket o SSE per streaming cross-domain
// 3. Aggiungere API key authentication tra frontend e service
// 4. Deploy su container/VPS dedicato per scalabilità Ollama
