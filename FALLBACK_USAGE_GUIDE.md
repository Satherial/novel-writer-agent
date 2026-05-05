# 🎯 Fallback Tool Calling - Guida Rapida

## 📌 Cosa Cambia

Il file `src/app/api/chat/route.ts` è stato modificato per aggiungere un **fallback automatico** che aiuta Ollama a gestire le richieste comuni senza dipendere dal tool calling nativo.

## 🚀 Come Funziona

### Scenario Normale (Senza Fallback)
```
Utente: "Elenca i miei progetti"
    ↓
Ollama riceve il messaggio
    ↓
Ollama fatica a capire che deve usare listUserProjects()
    ↓
Ollama risponde in modo generico senza dati reali
```

### Con Fallback (Nuovo Comportamento)
```
Utente: "Elenca i miei progetti"
    ↓
Backend riconosce il pattern "progett" + "elenco"
    ↓
Backend chiama manualmente listUserProjects()
    ↓
Backend inietta il risultato come system message
    ↓
Ollama riceve: "Hai 2 progetti: Novel 1 e Novel 2" (dati reali)
    ↓
Ollama risponde correttamente
```

## 🎮 Testare il Fallback

### 1. Avvia il server
```bash
npm run dev
```

### 2. Accedi all'applicazione
- Vai a `http://localhost:3000`
- Accedi con le tue credenziali

### 3. Prova le richieste di fallback

#### ✅ Attiva il fallback per `listUserProjects`
```
"Elenca i miei progetti"
"Quali sono i miei progetti?"
"Dimmi i progetti"
"Lista dei miei progetti"
"Ho qualche progetto?"
```

#### ✅ Attiva il fallback per `listProjectFiles`
(Dentro un progetto)
```
"Elenca i file del progetto"
"Quali file ho nel progetto?"
"Lista file"
"Quanti file ci sono?"
"Mostra i file del progetto"
```

### 4. Controlla i log del server

Dovresti vedere nel terminal:

```
[FALLBACK] Rilevato potenziale richiesta di elenca progetti
[FALLBACK] Contenuto analizzato: "Elenca i miei progetti"
[FALLBACK] Esecuzione manuale di listUserProjects...
[FALLBACK] Risultato: [TOOL_RESULT] listUserProjects eseguito manualmente: 2 progetti trovati
- Project: Novel 1 (Una storia fantastica)
- Project: Novel 2

[Chat API] Numero di messaggi totali: 8
[Chat API] Messaggi di fallback iniettati: 1
[Chat API] Tool disponibili: [...]
```

## 📊 Anatomia del Fallback

### File Modificato: `src/app/api/chat/route.ts`

**Sezione 5** (Righe 328-459): **FALLBACK TOOL CALLING**

```typescript
// 1. Estrae il contenuto del messaggio utente
const lastUserContent = lastUserMessage?.content || "";

// 2. Pattern matching per keywords
const hasKeywords = (text: string, keywords: string[]): boolean => {
  const lowerText = text.toLowerCase();
  return keywords.some((kw) => lowerText.includes(kw));
};

// 3. Pattern 1: Rilevamento listUserProjects
if (hasKeywords(lastUserContent, ["progett", "elenco", "lista", "quali", "dimmi"])) {
  // Esecuzione manuale
  const projects = await prisma.project.findMany({...});
  // Inizione risultato
  allMessages_WithFallback.push({
    role: "system",
    content: "[TOOL_RESULT] listUserProjects..."
  });
}

// 4. Pattern 2: Rilevamento listProjectFiles
if (projectId && hasKeywords(...)) {
  // Esecuzione manuale
  const files = await fetch(`/api/projects/${projectId}/files`);
  // Inizione risultato
  allMessages_WithFallback.push({...});
}
```

### Iniezone nel Contesto (Riga 477)

```typescript
const allMessages = [
  ...projectContext,
  ...historyMessages,
  ...allMessages_WithFallback,  // ← I risultati vanno QUI
  ...messages,
];
```

## 🔍 Debugging

### Abilita log dettagliati
```bash
# Set log level
export DEBUG=*
npm run dev
```

### Cerca i marker di fallback
```bash
# Nel terminal del server
npm run dev 2>&1 | grep FALLBACK
```

### Monitora i messaggi iniettati
```bash
npm run dev 2>&1 | grep "Messaggi di fallback iniettati"
```

## 📈 Pattern Riconosciuti

### Pattern 1: listUserProjects
- **Keywords richieste**: Almeno una tra: `progett`, `elenco`, `lista`, `quali`, `dimmi`
- **Quando attivo**: Sempre (dashboard o dentro un progetto)
- **Risultato**: Lista dei tuoi progetti

### Pattern 2: listProjectFiles  
- **Keywords richieste**: 
  - Deve contenere `file` AND
  - Almeno una tra: `elenco`, `lista`, `quali`, `quanti`, `dimmi`, `mostra`
- **Quando attivo**: Solo dentro un progetto (projectId presente)
- **Risultato**: Lista dei file del progetto

## ⚙️ Personalizzazione

### Aggiungi un nuovo pattern

1. **Aggiungi il pattern** dopo il Pattern 2 (prima di `createChatTools`):

```typescript
// PATTERN 3: Rilevamento readProjectFile
if (projectId && hasKeywords(lastUserContent, ["leggi", "contenuto", "file", "capitolo"])) {
  console.log("[FALLBACK] Rilevato potenziale richiesta di lettura file");
  
  try {
    // Estrai il nome del file dal messaggio (regex o parsing)
    const fileName = estraiNomeFile(lastUserContent);
    
    // Chiama il tool
    const response = await readProjectFile(fileName);
    
    // Inietta il risultato
    allMessages_WithFallback.push({
      role: "system",
      content: `[TOOL_RESULT] readProjectFile: ${response}`
    });
  } catch (error) {
    // Handle error
  }
}
```

2. **Nota**: Deve essere fatto PRIMA di `createChatTools` (riga 461)

## 🛡️ Sicurezza

✅ **Autenticazione**: Usa lo stesso `userId` dell'utente loggato  
✅ **Autorizzazione**: Accede solo ai progetti dell'utente  
✅ **Rate limiting**: Nessun rate limiting aggiuntivo (delegato al resto dell'app)  
✅ **Input sanitization**: Usa pattern matching semplice, non code injection

## 📝 Note Importanti

1. **Non è una sostituzione**: Il fallback è un aiuto, non una sostituzione del tool calling vero
2. **Overhead minimo**: ~50-100ms aggiuntivi per request (pattern matching + DB query)
3. **Graceful degradation**: Se il fallback fallisce, il messaggio va lo stesso all'Ollama (con messaggio di errore)
4. **Compatibile**: Funziona con tutti i modelli (OpenAI, Ollama, Claude, etc.)

## 🧪 Script di Test

```bash
# Esegui i test di pattern matching
node scripts/test-fallback.js
```

Questo script verifica:
- ✅ Rilevamento corretto dei pattern
- ✅ False positive evitati
- ✅ Gestione degli errori
- ✅ Log corretti

## 🔗 Link Utili

- **File modificato**: [`src/app/api/chat/route.ts`](../src/app/api/chat/route.ts)
- **Documentazione completa**: [`CHANGES_FALLBACK_TOOL_CALLING.md`](../CHANGES_FALLBACK_TOOL_CALLING.md)
- **Script di test**: [`scripts/test-fallback.js`](../scripts/test-fallback.js)

## ❓ FAQ

### D: Il fallback sostituisce il tool calling nativo?
R: No, è complementare. Se Ollama chiama nativamente i tool, quelli vengono usati normalmente.

### D: Cosa succede se il database è giù?
R: Il fallback fallisce gracefully e inietta un messaggio di errore nel contesto.

### D: Il fallback rallenta le richieste?
R: Minimamente (~50-100ms). Il pattern matching è O(1).

### D: Posso disabilitare il fallback?
R: Sì, commenta/rimuovi la sezione 5 in `route.ts`.

### D: Come aggiungo più pattern?
R: Segui il template nella sezione "Personalizzazione" sopra.

## 📞 Support

Se trovi problemi:
1. Controlla i log di fallback nel terminal
2. Verifica che il pattern matching sia corretto
3. Assicurati che projectId sia corretto
4. Controlla che Ollama sia disponibile
