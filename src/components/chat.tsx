"use client"

import { useState, useRef, useEffect, FormEvent } from "react"
import { useSession } from "next-auth/react"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface QuickActionButtonProps {
  icon: string
  label: string
  prompt: string
  onClick: (prompt: string) => void
  disabled?: boolean
}

function QuickActionButton({ icon, label, prompt, onClick, disabled }: QuickActionButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(prompt)}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

interface WorkflowButtonProps {
  icon: string
  label: string
  workflowId: string
  onClick: (workflowId: string) => void
  loading: string | null
  disabled?: boolean
  tooltip?: string
}

function WorkflowButton({ icon, label, workflowId, onClick, loading, disabled, tooltip }: WorkflowButtonProps) {
  const isLoading = loading === workflowId

  return (
    <button
      type="button"
      onClick={() => onClick(workflowId)}
      disabled={disabled || isLoading}
      title={tooltip}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
        isLoading
          ? "bg-blue-100 text-blue-700 border border-blue-200 cursor-wait"
          : disabled
            ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
            : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 hover:border-blue-300"
      }`}
    >
      {isLoading ? (
        <>
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Avvio...</span>
        </>
      ) : (
        <>
          <span>{icon}</span>
          <span>{label}</span>
        </>
      )}
    </button>
  )
}

interface ChatProps {
  projectId?: string
  selectedFile?: string | null
}

export default function Chat({ projectId, selectedFile }: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workflowLoading, setWorkflowLoading] = useState<string | null>(null)
  const { data: session } = useSession()

  // Track if history has been loaded to prevent overwriting new messages
  const hasLoadedHistory = useRef(false)

  // Load chat history from database on mount only
  useEffect(() => {
    if (session?.user?.id && !hasLoadedHistory.current) {
      loadChatHistory()
      hasLoadedHistory.current = true
    }
  }, [session?.user?.id, projectId])

  const loadChatHistory = async () => {
    try {
      const url = new URL("/api/chat/history", window.location.origin)
      if (projectId) {
        url.searchParams.append("projectId", projectId)
      }

      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        // Only set messages if we don't have any yet (prevent overwriting streaming response)
        setMessages(prev => prev.length === 0 ? (data.messages || []) : prev)
      }
    } catch (error) {
      console.error("[Chat] Error loading history:", error)
    }
  }

  // Trigger workflow via API
  const triggerWorkflow = async (workflowId: string) => {
    if (!projectId) {
      setError("Seleziona un progetto per usare i workflow")
      return
    }

    setWorkflowLoading(workflowId)
    setError(null)

    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          filePath: selectedFile,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Workflow failed")
      }

      // Add workflow response as system message
      const workflowMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `🚀 **${data.workflow}** attivato!\n\n${data.data?.message || ""}\n\n${data.prompt ? `💡 **Prompt suggerito:**\n\`${data.prompt}\`` : ""}`,
      }

      setMessages((prev) => [...prev, workflowMessage])

      // If there's a prompt, also set it in input
      if (data.prompt) {
        setInput(data.prompt)
      }
    } catch (err: any) {
      setError(err.message || "Errore workflow")
    } finally {
      setWorkflowLoading(null)
    }
  }

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

      // Read the stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No reader available")
      }

      const decoder = new TextDecoder()
      let assistantContent = ""
      let chunkCount = 0
      console.log("[Chat] Starting to read stream...")
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log("[Chat] Stream complete, total chunks:", chunkCount, "content length:", assistantContent.length)
          break
        }
        
        chunkCount++
        const text = decoder.decode(value, { stream: true })
        console.log("[Chat] Chunk", chunkCount, ":", text.substring(0, 50))
        assistantContent += text
        
        // Update UI with new content
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMsg = newMessages[newMessages.length - 1]
          if (lastMsg?.role === "assistant") {
            lastMsg.content = assistantContent
          }
          return newMessages
        })
      }
      
      console.log("[Chat] Final content length:", assistantContent.length)
      
    } catch (err: any) {
      setError(err.message || "Errore durante la richiesta")
      console.error("[Chat] Error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h2 className="text-sm font-semibold text-gray-800">
          🤖 Assistente scrittura creativa
          {projectId && <span className="ml-2 text-xs font-normal text-gray-500">(progetto attivo)</span>}
        </h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
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

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 mb-2">Azioni rapide:</p>
        <div className="flex flex-wrap gap-2">
          <QuickActionButton
            icon="💬"
            label="Genera dialogo"
            prompt="Genera un dialogo tra i personaggi del progetto"
            onClick={setInput}
            disabled={isLoading}
          />
          <QuickActionButton
            icon="🎬"
            label="Descrivi scena"
            prompt="Descrivi una scena ambientata nel progetto"
            onClick={setInput}
            disabled={isLoading}
          />
          <QuickActionButton
            icon="👤"
            label="Crea personaggio"
            prompt="Crea un nuovo personaggio per il romanzo"
            onClick={setInput}
            disabled={isLoading}
          />
          <QuickActionButton
            icon="📖"
            label="Genera capitolo"
            prompt="Genera un nuovo capitolo basato sull'outline"
            onClick={setInput}
            disabled={isLoading}
          />
          <QuickActionButton
            icon="✍️"
            label="Revisiona testo"
            prompt="Revisiona e migliora il testo selezionato"
            onClick={setInput}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Workflow Triggers */}
      {projectId && (
        <div className="px-4 py-2 border-t border-gray-200 bg-blue-50">
          <p className="text-xs text-blue-600 mb-2 font-medium">🚀 Workflow AI:</p>
          <div className="flex flex-wrap gap-2">
            <WorkflowButton
              icon="🤖"
              label="Genera Capitolo AI"
              workflowId="chapter-generation"
              onClick={triggerWorkflow}
              loading={workflowLoading}
              disabled={!selectedFile}
              tooltip={!selectedFile ? "Seleziona un file capitolo" : undefined}
            />
            <WorkflowButton
              icon="🎭"
              label="Genera Personaggi"
              workflowId="character-generation"
              onClick={triggerWorkflow}
              loading={workflowLoading}
            />
            <WorkflowButton
              icon="💭"
              label="Genera Dialogo"
              workflowId="dialog-generation"
              onClick={triggerWorkflow}
              loading={workflowLoading}
            />
            <WorkflowButton
              icon="🌄"
              label="Descrivi Scena"
              workflowId="scene-description"
              onClick={triggerWorkflow}
              loading={workflowLoading}
            />
            <WorkflowButton
              icon="🔍"
              label="Revisiona Testo"
              workflowId="text-review"
              onClick={triggerWorkflow}
              loading={workflowLoading}
              disabled={!selectedFile}
              tooltip={!selectedFile ? "Seleziona un file" : undefined}
            />
          </div>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="shrink-0 p-4 border-t border-gray-200 bg-white">
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
                e.preventDefault()
                handleSubmit(e)
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
  )
}
