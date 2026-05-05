# Redesign Azioni Rapide e Workflow AI Chat

Semplificare le azioni rapide e i workflow nella colonna chat del progetto, eliminando duplicazioni e aggiungendo form modali per parametrizzare i prompt prima dell'invio.

## Problemi Attuali

1. **Duplicazione**: Quick Actions e Workflow buttons fanno le stesse cose (es. entrambi hanno "Genera dialogo", "Descrivi scena")
2. **Azioni fittizie**: I Quick Actions solo impostano testo nell'input, non eseguono nulla
3. **Workflow non agentici**: I workflow API solo restituiscono prompt predefiniti, non eseguono workflow reali
4. **Mancano parametri**: Nessun modo per l'utente di specificare dettagli prima di avviare un'azione

## Soluzione Proposta

### 1. Consolidare in un'unica sezione "Workflow AI"

Eliminare la doppia sezione (Quick Actions + Workflow) e avere una sola sezione pulita:

**Workflow Essenziali (4 azioni totali):**
| Workflow | Descrizione | Requisito |
|----------|-------------|-----------|
| 📝 **Scrivi Capitolo** | Genera contenuto per un capitolo | File outline/capitolo selezionato |
| 👤 **Crea Personaggio** | Crea scheda personaggio dettagliata | Nessuno (usa outline progetto) |
| 💭 **Genera Dialogo** | Crea dialogo tra personaggi | 2+ personaggi specificati in form |
| 🔍 **Revisiona Testo** | Migliora stile e correggi errori | File selezionato |

### 2. Form Modali per ogni Workflow

Ogni workflow apre una modale con campi specifici:

**Scrivi Capitolo:**
- Numero capitolo (input number)
- Titolo capitolo (input text)
- Punti chiave da trattare (textarea)
- Tono (dropdown: epico, intimo, drammatico, etc.)

**Crea Personaggio:**
- Nome personaggio (input)
- Ruolo nella storia (dropdown: protagonista, antagonista, secondario)
- Età/Sesso (optional)
- Caratteristiche distintive (textarea)

**Genera Dialogo:**
- Personaggio 1 (select da personaggi esistenti)
- Personaggio 2 (select)
- Tema/argomento dialogo (input)
- Tensione emotiva (dropdown: calma, tesa, conflittuale)

**Revisiona Testo:**
- Focus revisione (checkbox: grammatica, stile, scorrevolezza, dialoghi)
- Livello di intervento (slider: leggero/moderato/aggressivo)

### 3. Workflow Agentici Reali

Implementare workflow che effettivamente eseguono azioni multi-step:

**chapter-generation (agentico):**
1. Legge l'outline del progetto
2. Legge capitoli precedenti per contesto
3. Chiama Ollama con prompt strutturato + contesto
4. Salva il capitolo generato in `chapters/capitolo_X.md`
5. Restituisce riepilogo in chat

**character-generation (agentico):**
1. Legge outline per comprendere ambientazione
2. Genera scheda personaggio completa
3. Salva in `characters/nome_personaggio.md`
4. Aggiunge riferimento in outline se necessario

**dialog-generation (agentico):**
1. Legge schede personaggi specificati
2. Genera dialogo coerente con caratteri
3. Può salvare in `notes/dialoghi/` o restituire in chat

**text-review (agentico):**
1. Legge file selezionato
2. Analizza con Ollama per miglioramenti
3. Propone modifiche inline o crea versione `_revised.md`

### 4. UI Semplificata

```
┌─ 🤖 Assistente Scrittura ─────────────┐
│                                       │
│  [Area messaggi chat]                 │
│                                       │
├─ 🚀 Workflow AI ──────────────────────┤
│  ┌─────────┐ ┌─────────┐             │
│  │ 📝      │ │ 👤      │             │
│  │ Scrivi  │ │ Crea    │             │
│  │Capitolo │ │Personagg│             │
│  └─────────┘ └─────────┘             │
│  ┌─────────┐ ┌─────────┐             │
│  │ 💭      │ │ 🔍      │             │
│  │Genera   │ │Revisiona│             │
│  │Dialogo  │ │ Testo   │             │
│  └─────────┘ └─────────┘             │
│                                       │
│  Suggerimento: Prova "Scrivi un      │
│  capitolo dove il protagonista..."    │
│                                       │
├─ Input messaggio ────────────────────┤
│  [                    ] [Invia]      │
└───────────────────────────────────────┘
```

## File da Modificare

- `src/components/chat.tsx` - Redesign UI azioni, aggiunta modali
- `src/app/api/workflows/[workflowId]/route.ts` - Implementazione workflow agentici
- `src/components/workflow-modals.tsx` (nuovo) - Componenti modali workflow

## Note Implementazione

- I workflow agentici usano i tool CRUD già implementati (`writeProjectFile`, `readProjectFile`, etc.)
- Ogni workflow è una sequenza di chiamate API che l'utente può vedere progresso in chat
- Le modali usano Preline UI (già presente nel progetto)
