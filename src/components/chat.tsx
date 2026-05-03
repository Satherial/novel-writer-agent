"use client"

import { useState, useRef, useEffect, FormEvent } from "react"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatProps {
  projectId?: string
}

export default function Chat({ projectId }: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-scroll to bottom quando arrivano nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          projectId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // Leggi lo stream di testo
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          assistantContent += decoder.decode(value, { stream: true })
          
          // Aggiorna il messaggio dell'assistente in tempo reale
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1]
            if (lastMsg?.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...lastMsg, content: assistantContent },
              ]
            }
            return [
              ...prev,
              {
                id: (Date.now() + 1).toString(),
                role: "assistant" as const,
                content: assistantContent,
              },
            ]
          })
        }
      }
    } catch (err: any) {
      setError(err.message || "Errore durante la richiesta")
      console.error("[Chat] Error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h2 className="text-sm font-semibold text-gray-700">
          🤖 Assistente Scrittura Creativa
          {projectId && <span className="ml-2 text-xs text-gray-500">(Progetto attivo)</span>}
        </h2>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[500px]">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p className="text-sm">Inizia una conversazione con l'assistente AI</p>
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
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>

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
              <span className="animate-pulse text-sm text-gray-600">Sto scrivendo</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
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

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Chiedi qualcosa all'assistente..."
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "..." : "Invia"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Shift+Enter per nuova riga • Enter per inviare
        </p>
      </form>
    </div>
  )
}
