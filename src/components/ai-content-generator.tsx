"use client"

import { useState } from "react"

interface AIContentGeneratorProps {
  projectId: string
  currentFile?: string
}

type ContentType = "chapter" | "character" | "dialogue" | "description"

const CONTENT_TYPES = [
  { value: "chapter", label: "Capitolo", description: "Genera un nuovo capitolo" },
  { value: "character", label: "Personaggio", description: "Sviluppa un personaggio" },
  { value: "dialogue", label: "Dialogo", description: "Crea un dialogo" },
  { value: "description", label: "Descrizione", description: "Descrivi scene o ambienti" }
] as const

const PROMPT_TEMPLATES = {
  chapter: [
    "Scrivi un capitolo introduttivo che presenti il protagonista e l'ambientazione",
    "Crea un capitolo con un momento di tensione e suspense",
    "Sviluppa un capitolo focale sulla crescita del personaggio principale",
    "Scrivi un capitolo con un colpo di scena inaspettato"
  ],
  character: [
    "Crea un nuovo personaggio antieroe con un passato misterioso",
    "Sviluppa un personaggio femminile forte e indipendente",
    "Descrivi un mentore saggio con segreti nascosti",
    "Crea un villain complesso con motivazioni comprensibili"
  ],
  dialogue: [
    "Scrivi un dialogo di confronto tra due personaggi con visioni opposte",
    "Crea una conversazione rivelatrice tra protagonisti",
    "Sviluppa un dialogo comico che alleggerisca la tensione",
    "Scrivi un dialogo di addio emozionante tra personaggi legati"
  ],
  description: [
    "Descrivi una città medievale affascinante e misteriosa",
    "Crea una descrizione dettagliata di una foresta incantata",
    "Sviluppa la descrizione di un castello antico e maestoso",
    "Descrivi un mercato vibrante e pieno di vita"
  ]
}

export default function AIContentGenerator({ projectId, currentFile }: AIContentGeneratorProps) {
  const [contentType, setContentType] = useState<ContentType>("chapter")
  const [prompt, setPrompt] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showTemplates, setShowTemplates] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return

    setLoading(true)
    setError("")
    setGeneratedContent("")

    try {
      const response = await fetch(`/api/projects/${projectId}/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          type: contentType,
          currentFile
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Generation failed")
      }

      const data = await response.json()
      setGeneratedContent(data.content)

    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateClick = (template: string) => {
    setPrompt(template)
    setShowTemplates(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent)
  }

  const currentTemplates = PROMPT_TEMPLATES[contentType]

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '1.5rem', 
      borderRadius: '0.5rem', 
      border: '1px solid #e5e7eb' 
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
        ✨ AI Content Generator
      </h3>

      {/* Content Type Selection */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
          Tipo di contenuto:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setContentType(type.value)}
              style={{
                padding: '0.75rem',
                border: `1px solid ${contentType === type.value ? '#3b82f6' : '#d1d5db'}`,
                borderRadius: '0.375rem',
                backgroundColor: contentType === type.value ? '#eff6ff' : 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                {type.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {type.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Input */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500' }}>
            Prompt:
          </label>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            style={{
              fontSize: '0.75rem',
              color: '#3b82f6',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {showTemplates ? "Nascondi template" : "Mostra template"}
          </button>
        </div>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Descrivi cosa vuoi generare..."
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            resize: 'vertical',
            minHeight: '100px',
            fontSize: '0.875rem'
          }}
        />
      </div>

      {/* Template Suggestions */}
      {showTemplates && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.5rem', color: '#6b7280' }}>
            Suggerimenti per {CONTENT_TYPES.find(t => t.value === contentType)?.label}:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {currentTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => handleTemplateClick(template)}
                style={{
                  padding: '0.5rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                {template}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: loading || !prompt.trim() ? '#9ca3af' : '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '1rem'
        }}
      >
        {loading ? "Generazione in corso..." : "Genera Contenuto"}
      </button>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          marginBottom: '1rem'
        }}>
          Errore: {error}
        </div>
      )}

      {/* Generated Content */}
      {generatedContent && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '0.5rem' 
          }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>
              Contenuto Generato:
            </h4>
            <button
              onClick={handleCopy}
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
              📋 Copia
            </button>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rm',
            whiteSpace: 'pre-wrap',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {generatedContent}
          </div>
        </div>
      )}
    </div>
  )
}
