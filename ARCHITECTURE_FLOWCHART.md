# 📊 Architettura del Fallback Tool Calling

## Diagrama del Flusso Generale

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chat API: POST /api/chat                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   1. Verifica Autenticazione                     │
│              (session.user.id → userId strategy)                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      2. Parse Request Body                       │
│          messages, projectId, saveToDb (defaults: true)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   3. Carica Chat History                         │
│    (Prisma: ultimi 50 messaggi per userId/projectId)            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   4. Salva User Message                          │
│        (Prisma: crea record con role='user')                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                  ╔═════════════════════════╗
                  ║  🆕 FALLBACK LOGIC      ║  ← NUOVO!
                  ║  (Righe 328-459)        ║
                  ╚═════════════════════════╝
                              ↓
        ┌──────────────────────────────────────────┐
        │ Estrai lastUserMessage.content           │
        └──────────────────────────────────────────┘
                              ↓
        ┌──────────────────────────────────────────┐
        │ Pattern 1: listUserProjects?             │
        │ hasKeywords(                             │
        │   text,                                  │
        │   ["progett", "elenco", "lista", ...]    │
        │ )                                        │
        └──────────────────────────────────────────┘
              YES ↓                    NO ↓
        ┌──────────────┐        ┌──────────────┐
        │ Prisma Query │        │ Check PATTERN│
        │ findMany()   │        │ 2: file+?    │
        │              │        │              │
        │ → projects[] │        └──────────────┘
        └──────────────┘              YES ↓
              ↓                   ┌──────────────┐
        ┌──────────────┐          │ Fetch Query  │
        │ Format       │          │ /api/..      │
        │ result as:   │          │              │
        │ [TOOL_RESULT]│          │ → files[]    │
        └──────────────┘          └──────────────┘
              ↓                         ↓
        ┌──────────────┐          ┌──────────────┐
        │ Push to      │          │ Format       │
        │ allMessages_ │          │ result as:   │
        │ WithFallback │          │ [TOOL_RESULT]│
        │ array        │          └──────────────┘
        └──────────────┘                ↓
              ↓                   ┌──────────────┐
              └───────────────────→ Push to array │
                                  └──────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              5. Create Chat Tools (con userId)                   │
│              (tool functions disponibili)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            6. Assembla Final Message Array                       │
│ const allMessages = [                                            │
│   ...projectContext,            // Se projectId presente        │
│   ...historyMessages,           // Chat history                 │
│   ...allMessages_WithFallback,  // 🆕 Risultati tool fallback  │
│   ...messages                   // Nuovo messaggio utente       │
│ ]                                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              7. streamText (AI SDK v4)                           │
│  - Model: Ollama (mistral:7b default)                           │
│  - System prompt: Custom creative writing assistant            │
│  - Messages: allMessages (con fallback data!)                  │
│  - Tools: Disponibili per tool calling                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           8. Stream Response to Client                           │
│           (text stream + tool results)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         9. Save Assistant Response (async)                       │
│         (Prisma: record con role='assistant')                  │
└─────────────────────────────────────────────────────────────────┘
```

## Pattern 1: listUserProjects Flow

```
Messaggio Utente: "Quali progetti ho?"
          ↓
Pattern Matching:
  ✓ Contiene "progett"
  ✓ Contiene "quali"
  ✓ Non richiede projectId
          ↓
🔄 FALLBACK TRIGGER
          ↓
┌────────────────────────────────────────────────────┐
│ Esecuzione Manuale                                  │
│                                                     │
│ const projects = await prisma.project.findMany({   │
│   where: { userId },                               │
│   select: {                                         │
│     id: true,                                       │
│     name: true,                                     │
│     description: true                              │
│   },                                                │
│   orderBy: { createdAt: "desc" }                   │
│ });                                                 │
└────────────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────────────┐
│ Formattazione Risultato                            │
│                                                     │
│ [TOOL_RESULT] listUserProjects eseguito            │
│ manualmente: 3 progetti trovati                    │
│ - Project: Novel 1 (Un grande romanzo)            │
│ - Project: Novel 2 (Racconto)                      │
│ - Project: Novel 3                                 │
└────────────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────────────┐
│ Iniezone nel Contesto                              │
│                                                     │
│ allMessages_WithFallback.push({                    │
│   role: "system",                                   │
│   content: "[TOOL_RESULT] ..."                     │
│ })                                                  │
└────────────────────────────────────────────────────┘
          ↓
Ollama riceve il messaggio + i dati reali
          ↓
Ollama risponde: "Vedo che hai 3 progetti..."
```

## Pattern 2: listProjectFiles Flow

```
Messaggio Utente: "Elenca i file del progetto"
projectId: "proj_123"
          ↓
Pattern Matching:
  ✓ Contiene "file"
  ✓ Contiene "elenca"
  ✓ projectId presente
          ↓
🔄 FALLBACK TRIGGER
          ↓
┌────────────────────────────────────────────────────┐
│ Esecuzione Manuale                                  │
│                                                     │
│ const baseUrl = process.env.NEXTAUTH_URL || ...   │
│ const res = await fetch(                           │
│   `${baseUrl}/api/projects/${projectId}/files`,   │
│   {                                                 │
│     headers: { Cookie: `...${userId}` }            │
│   }                                                 │
│ );                                                  │
│                                                     │
│ const data = await res.json();                     │
│ const files = data.files || [];                    │
└────────────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────────────┐
│ Formattazione Risultato                            │
│                                                     │
│ [TOOL_RESULT] listProjectFiles eseguito            │
│ manualmente: 4 file trovati                        │
│ - capitolo_1.md (45.2 KB)                          │
│ - capitolo_2.md (52.1 KB)                          │
│ - personaggi.json (3.5 KB)                         │
│ - trama.txt (12.8 KB)                              │
└────────────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────────────┐
│ Iniezone nel Contesto                              │
│                                                     │
│ allMessages_WithFallback.push({                    │
│   role: "system",                                   │
│   content: "[TOOL_RESULT] ..."                     │
│ })                                                  │
└────────────────────────────────────────────────────┘
          ↓
Ollama riceve il messaggio + i dati reali
          ↓
Ollama risponde: "Nel tuo progetto hai 4 file..."
```

## Gestione Errori

```
Durante Fallback:

try {
  // Esecuzione pattern
} catch (error) {
  console.error("[FALLBACK] Errore: " + error.message);
  
  allMessages_WithFallback.push({
    role: "system",
    content: "[TOOL_RESULT] ... fallito: " + error.message
  });
}

          ↓
          
Ollama riceve il messaggio di errore
          ↓
Ollama risponde: "Mi dispiace, ho avuto un errore..."
(comunque gracefully degraded)
```

## Logging Visuale

```
┌────────────────────────────────────────────────────┐
│         [Chat API] RICHIESTA CHAT                  │
├────────────────────────────────────────────────────┤
│ Utente: abc123                                      │
│ Progetto: proj_456 (oppure: dashboard)             │
│ Numero di messaggi totali: 8                       │
│ Messaggi di fallback iniettati: 1        ← NUOVO   │
│ Tool disponibili: [getCurrentDate,                │
│                    listUserProjects,              │
│                    listProjectFiles,              │
│                    searchProject]                 │
│ Modello usato: mistral:7b                         │
│ Ultimo messaggio utente: "Elenca i..."            │
└────────────────────────────────────────────────────┘

               ↓

Se fallback attivato:
┌────────────────────────────────────────────────────┐
│  [FALLBACK] Rilevato potenziale richiesta di       │
│             elenca progetti                        │
│  [FALLBACK] Contenuto analizzato: "Elenca i..."   │
│  [FALLBACK] Esecuzione manuale di                 │
│             listUserProjects...                    │
│  [FALLBACK] Risultato: [TOOL_RESULT] ...          │
│             listUserProjects eseguito              │
│             manualmente: 3 progetti trovati        │
└────────────────────────────────────────────────────┘
```

## Comparazione: Prima vs Dopo

### PRIMA (Senza Fallback)

```
User: "Elenca i miei progetti"
  ↓
Ollama: "Mi spiace, non posso fare quella cosa"
        OR
        "I tuoi progetti potrebbero essere..."
        (senza dati reali)
```

### DOPO (Con Fallback)

```
User: "Elenca i miei progetti"
  ↓
Backend pattern matching: ✓ MATCH
  ↓
Prisma query: 3 projects found
  ↓
System message injected with real data
  ↓
Ollama: "Hai 3 progetti: Novel 1, Novel 2, Novel 3"
        (con dati reali!)
```

## Sequenza Temporale

```
Request ricevuta
     ↓ (1ms)
Auth check
     ↓ (2ms)
Parse body
     ↓ (1ms)
Load history (~50ms se DB)
     ↓ (5ms)
Save user message (~10ms se DB)
     ↓ (0ms)
Pattern matching ← FALLBACK START
     ↓ (50-100ms se attivato, query DB/API)
Create tools
     ↓ (1ms)
streamText start
     ↓ (200-500ms)
First token
     ↓ (...)
Stream complete
     ↓ (5-10ms)
Save assistant message (~10ms se DB)
     ↓
Response sent to client

TOTALE: ~300-700ms (vs ~250ms senza fallback)
Overhead: ~50-100ms (accettabile)
```

## Matrice di Decisione

```
┌────────────┬─────────────────┬────────────────────┐
│ Scenario   │ Pattern Match?  │ Fallback Attivato? │
├────────────┼─────────────────┼────────────────────┤
│ "progett"  │ ✓ Match         │ ✓ Esecuzione       │
│ "file"     │ ✓ Match (p2)    │ ✓ Se projectId     │
│ "storia"   │ ✗ No match      │ ✗ No fallback      │
│ "aiuto"    │ ✗ No match      │ ✗ No fallback      │
│ "lista"    │ ✗ No (needs p2) │ ✗ No fallback      │
└────────────┴─────────────────┴────────────────────┘
```
