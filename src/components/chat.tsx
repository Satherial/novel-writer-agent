"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import {
  ChapterWorkflowModal,
  CharacterWorkflowModal,
  DialogWorkflowModal,
  ReviewWorkflowModal,
} from "./workflow-modals";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}


interface ChatProps {
  projectId?: string;
  selectedFile?: string | null;
}

export default function Chat({ projectId, selectedFile }: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const { data: session } = useSession();

  // Track if history has been loaded to prevent overwriting new messages
  const hasLoadedHistory = useRef(false);
  // Counter for unique message IDs to avoid duplicate keys
  const messageIdCounter = useRef(0);
  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `${Date.now()}-${messageIdCounter.current}`;
  };

  // Load chat history from database on mount only
  useEffect(() => {
    if (session?.user?.id && !hasLoadedHistory.current) {
      loadChatHistory();
      hasLoadedHistory.current = true;
    }
  }, [session?.user?.id, projectId]);

  const loadChatHistory = async () => {
    try {
      const url = new URL("/api/chat/history", window.location.origin);
      if (projectId) {
        url.searchParams.append("projectId", projectId);
      }

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        // Only set messages if we don't have any yet (prevent overwriting streaming response)
        setMessages((prev) => (prev.length === 0 ? data.messages || [] : prev));
      }
    } catch (error) {
      console.error("[Chat] Error loading history:", error);
    }
  };

  // Reset chat history (only for dashboard)
  const handleResetChat = async () => {
    if (!confirm("Sei sicuro di voler cancellare la cronologia della chat?")) {
      return;
    }

    try {
      const url = new URL("/api/chat/history", window.location.origin);
      // No projectId = dashboard chat

      const response = await fetch(url.toString(), {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([]); // Clear local state
        hasLoadedHistory.current = false; // Reset flag so we can reload if needed
        console.log("[Chat] Reset:", data.message);
      } else {
        throw new Error("Failed to reset chat");
      }
    } catch (error) {
      console.error("[Chat] Error resetting chat:", error);
      setError("Errore durante la cancellazione della cronologia");
    }
  };

  // Handle workflow submission from modals
  const handleWorkflowSubmit = async (workflowId: string, formData: any) => {
    if (!projectId) {
      setError("Seleziona un progetto per usare i workflow");
      return;
    }

    setWorkflowLoading(workflowId);
    setError(null);

    // Generate optimized prompt based on form data
    let optimizedPrompt = "";
    switch (workflowId) {
      case "chapter-generation":
        optimizedPrompt = `Scrivi il Capitolo ${formData.chapterNum}${formData.title ? ` - "${formData.title}"` : ""} per il romanzo.

Tono: ${formData.tone}
${formData.keyPoints ? `\nPunti chiave da trattare:\n${formData.keyPoints}` : ""}

Per favore, scrivi un capitolo completo con inizio, sviluppo e conclusione. Mantieni uno stile narrativo coerente con il genere del romanzo.`;
        break;

      case "character-generation":
        optimizedPrompt = `Crea una scheda personaggio completa per "${formData.name}".

Ruolo: ${formData.role}
${formData.age ? `Età: ${formData.age}\n` : ""}${formData.gender ? `Sesso/Genere: ${formData.gender}\n` : ""}
${formData.traits ? `Caratteristiche distintive:\n${formData.traits}\n` : ""}

Per favore, crea una scheda dettagliata che includa:
- Nome completo e soprannomi
- Aspetto fisico dettagliato
- Personalità e tratti caratteriali
- Background/storia personale
- Motivazioni e obiettivi
- Relazioni con altri personaggi
- Arco narrativo previsto`;
        break;

      case "dialog-generation":
        optimizedPrompt = `Genera un dialogo tra ${formData.char1} e ${formData.char2}.

Tema/Argomento: ${formData.topic}
Tensione emotiva: ${formData.tension}
${formData.location ? `Luogo: ${formData.location}\n` : ""}

Per favore, crea un dialogo realistico e coinvolgente che:
- Rifletta la personalità di entrambi i personaggi
- Sveli informazioni importanti sulla trama o sui personaggi
- Mantenga un tono naturale e credibile
- Usi tagli di dialogo appropriati ("..." per pause, "—" per interruzioni)`;
        break;

      case "text-review":
        const focusAreas = Object.entries(formData.focus)
          .filter(([_, v]) => v)
          .map(([k]) => {
            switch (k) {
              case "grammar": return "grammatica e ortografia";
              case "style": return "stile e scorrevolezza";
              case "flow": return "struttura e ritmo";
              case "dialogue": return "dialoghi";
              default: return k;
            }
          })
          .join(", ");
        const intensityLabels = ["leggero", "moderato", "intenso", "aggressivo"];
        optimizedPrompt = `Revisiona e migliora il testo del file selezionato.

Focus revisione: ${focusAreas}
Livello di intervento: ${intensityLabels[formData.intensity - 1]}
${formData.notes ? `\nNote specifiche:\n${formData.notes}` : ""}

Per favore:
1. Leggi attentamente il testo
2. Identifica i punti da migliorare secondo i focus indicati
3. Proponi una versione revisionata del testo
4. Spiega le principali modifiche effettuate`;
        break;
    }

    // Add user message with the optimized prompt
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: optimizedPrompt,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Also set it in input for immediate sending
    setInput(optimizedPrompt);

    // Trigger the workflow API
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          filePath: selectedFile,
          options: formData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Workflow failed");
      }

      // Add confirmation message
      const confirmMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: `🚀 **${data.workflow}** avviato!\n\n${data.data?.message || "Sto elaborando la richiesta..."}`,
      };
      setMessages((prev) => [...prev, confirmMessage]);
    } catch (err: any) {
      // Just log the error - the chat will still work with the prompt
      console.error("[Workflow] Error:", err);
    } finally {
      setWorkflowLoading(null);
    }
  };

  // Auto-scroll to bottom quando arrivano nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Create empty assistant message first so UI updates immediately
      const assistantMessageId = generateMessageId();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          projectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Read the stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      const decoder = new TextDecoder();
      let assistantContent = "";
      let chunkCount = 0;
      console.log("[Chat] Starting to read stream...");

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(
            "[Chat] Stream complete, total chunks:",
            chunkCount,
            "content length:",
            assistantContent.length,
          );
          break;
        }

        chunkCount++;
        const text = decoder.decode(value, { stream: true });
        console.log("[Chat] Chunk", chunkCount, ":", text.substring(0, 50));
        assistantContent += text;

        // Update UI with new content - update the assistant message we added earlier
        setMessages((prev) => {
          const newMessages = [...prev];
          const messageIdx = newMessages.findIndex(
            (msg) => msg.id === assistantMessageId,
          );
          if (messageIdx !== -1) {
            newMessages[messageIdx].content = assistantContent;
          }
          return newMessages;
        });
      }

      console.log("[Chat] Final content length:", assistantContent.length);
    } catch (err: any) {
      setError(err.message || "Errore durante la richiesta");
      console.error("[Chat] Error:", err);
      // Remove the empty assistant message if there was an error
      setMessages((prev) => prev.filter((msg) => msg.content !== ""));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-800">
          🤖 Assistente scrittura creativa
          {projectId && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              (progetto attivo)
            </span>
          )}
        </h2>
        {/* Reset button only for dashboard chat */}
        {!projectId && messages.length > 0 && (
          <button
            onClick={handleResetChat}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Cancella cronologia chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Nuova chat
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p className="text-sm">
              Inizia una conversazione con l'assistente AI
            </p>
            <p className="text-xs mt-1">
              Prova: "Leggi il mio outline" o "Elenca i personaggi"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {/* Contenuto messaggio */}
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>

              {/* Timestamp */}
              <div
                className={`text-[10px] mt-1 ${
                  message.role === "user" ? "text-blue-200" : "text-gray-400"
                }`}
              >
                {message.role === "user" ? "Tu" : "AI"}
              </div>
            </div>
          </div>
        ))}

        {/* Stato typing durante streaming */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="animate-pulse text-sm text-gray-600">
                Sto scrivendo
              </span>
              <span className="flex gap-1">
                <span
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></span>
                <span
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></span>
                <span
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></span>
              </span>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-600">
              ⚠️ Errore: {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Workflow AI - Unica sezione consolidata */}
      {projectId && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <p className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-1">
            <span>🚀</span> Workflow AI
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveModal("chapter")}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>📝</span>
              <span>Scrivi Capitolo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("character")}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>👤</span>
              <span>Crea Personaggio</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("dialog")}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>💭</span>
              <span>Genera Dialogo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("review")}
              disabled={isLoading || !selectedFile}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors ${
                !selectedFile
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 hover:border-blue-300"
              }`}
            >
              <span>🔍</span>
              <span>Revisiona Testo</span>
            </button>
          </div>
          {!selectedFile && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              💡 Seleziona un file per usare "Revisiona Testo"
            </p>
          )}
        </div>
      )}

      {/* Workflow Modals */}
      {projectId && (
        <>
          <ChapterWorkflowModal
            isOpen={activeModal === "chapter"}
            onClose={() => setActiveModal(null)}
            onSubmit={(data) => handleWorkflowSubmit("chapter-generation", data)}
            projectId={projectId}
          />
          <CharacterWorkflowModal
            isOpen={activeModal === "character"}
            onClose={() => setActiveModal(null)}
            onSubmit={(data) => handleWorkflowSubmit("character-generation", data)}
            projectId={projectId}
          />
          <DialogWorkflowModal
            isOpen={activeModal === "dialog"}
            onClose={() => setActiveModal(null)}
            onSubmit={(data) => handleWorkflowSubmit("dialog-generation", data)}
            projectId={projectId}
          />
          <ReviewWorkflowModal
            isOpen={activeModal === "review"}
            onClose={() => setActiveModal(null)}
            onSubmit={(data) => handleWorkflowSubmit("text-review", data)}
            projectId={projectId}
            selectedFile={selectedFile}
          />
        </>
      )}

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 p-4 border-t border-gray-200 bg-white"
      >
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Chiedi qualcosa all'assistente..."
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "..." : "Invia"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Shift+Enter per nuova riga • Enter per inviare
        </p>
      </form>
    </div>
  );
}
