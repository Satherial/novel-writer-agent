"use client"

import { useState, useRef, useEffect } from "react"
import { AIMessage } from "@/lib/ai-sdk"

interface AIChatMessage extends AIMessage {
  id: string
  suggestions?: string[]
  actions?: Array<{
    type: "create_file" | "edit_file" | "search"
    description: string
    data?: any
  }>
}

interface AIChatInterfaceProps {
  projectId: string
  currentFile?: string
}

export default function AIChatInterface({ projectId, currentFile }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"loading" | "available" | "unavailable" | "error">("loading")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Check AI service status on mount
  useEffect(() => {
    checkAIStatus()
  }, [projectId])

  const checkAIStatus = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/ai/chat`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data.status)
        
        if (data.status === "available" && !data.modelAvailable) {
          setStatus("error")
        }
      } else {
        setStatus("unavailable")
      }
    } catch (error) {
      setStatus("unavailable")
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: AIChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)
    setSuggestions([])

    try {
      const response = await fetch(`/api/projects/${projectId}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history: messages.map(({ id, suggestions, actions, ...msg }) => msg),
          currentFile
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Chat request failed")
      }

      const data = await response.json()
      
      const aiMessage: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response.message,
        timestamp: new Date(),
        suggestions: data.response.suggestions || [],
        actions: data.response.actions || []
      }

      setMessages(prev => [...prev, aiMessage])
      
      if (data.response.suggestions && data.response.suggestions.length > 0) {
        setSuggestions(data.response.suggestions)
      }

    } catch (error: any) {
      const errorMessage: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Errore: ${error.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  const handleActionClick = async (action: any) => {
    // TODO: Implementare azioni (create_file, edit_file, search)
    console.log("Action clicked:", action)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (status === "loading") {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        borderRadius: '0.5rem', 
        border: '1px solid #e5e7eb' 
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Verifica stato servizio AI...</div>
        </div>
      </div>
    )
  }

  if (status === "unavailable") {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        borderRadius: '0.5rem', 
        border: '1px solid #e5e7eb' 
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ color: '#dc2626', marginBottom: '1rem' }}>
            🤖 Servizio AI non disponibile
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Assicurati che Ollama sia in esecuzione su http://localhost:11434
          </div>
          <button
            onClick={checkAIStatus}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Riprova
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '0.5rem', 
      border: '1px solid #e5e7eb',
      height: '600px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
          🤖 Writing Assistant
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: status === "available" ? '#10b981' : '#ef4444'
          }} />
          <span style={{ color: status === "available" ? '#10b981' : '#ef4444' }}>
            {status === "available" ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤖</div>
            <div>Ciao! Sono il tuo writing assistant.</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Chiedimi aiuto per il tuo romanzo, suggerimenti per i personaggi, 
              idee per la trama o qualsiasi altro cosa ti serva!
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.role === "user" ? "flex-end" : "flex-start"
              }}
            >
              <div style={{
                maxWidth: '70%',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: message.role === "user" ? '#3b82f6' : '#f3f4f6',
                color: message.role === "user" ? 'white' : '#111827'
              }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </div>
                
                {/* Actions */}
                {message.actions && message.actions.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {message.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleActionClick(action)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          backgroundColor: message.role === "user" ? '#1d4ed8' : '#e5e7eb',
                          color: message.role === "user" ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        {action.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: '#f3f4f6',
              color: '#6b7280'
            }}>
              Sto pensando...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.5rem', color: '#6b7280' }}>
            Suggerimenti:
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Chiedi al tuo writing assistant..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: loading || !input.trim() ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          Invia
        </button>
      </div>
    </div>
  )
}
