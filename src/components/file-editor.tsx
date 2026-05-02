"use client"

import { useState, useEffect, useRef } from "react"
import { marked } from "marked"
import DOMPurify from "dompurify"

interface FileEditorProps {
  projectId: string
  filePath: string
  onSave?: (content: string) => void
  onClose?: () => void
}

export default function FileEditor({ 
  projectId, 
  filePath, 
  onSave,
  onClose 
}: FileEditorProps) {
  const [content, setContent] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isPreview, setIsPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [previewHTML, setPreviewHTML] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load file content on mount
  useEffect(() => {
    loadFile()
  }, [projectId, filePath])

  const loadFile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/files?path=${encodeURIComponent(filePath)}`)
      if (response.ok) {
        const data = await response.json()
        setContent(data.file.content)
        setOriginalContent(data.file.content)
      } else {
        console.error("Failed to load file")
      }
    } catch (error) {
      console.error("Error loading file:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (content !== originalContent) {
        handleSave()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [content, originalContent])

  // Update stats
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length
    const chars = content.length
    setWordCount(words)
    setCharCount(chars)
  }, [content])

  // Handle tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const end = e.currentTarget.selectionEnd
      const newContent = content.substring(0, start) + '  ' + content.substring(end)
      setContent(newContent)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2
        }
      }, 0)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: filePath,
          content
        })
      })

      if (!response.ok) {
        throw new Error("Failed to save file")
      }

      setOriginalContent(content)
      setLastSaved(new Date())
      onSave?.(content)
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    const updatePreview = async () => {
      const html = await marked(content)
      setPreviewHTML(DOMPurify.sanitize(html))
    }
    updatePreview()
  }, [content])

  const insertMarkdown = (syntax: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const selectedText = content.substring(start, end)
      const newText = content.substring(0, start) + syntax + selectedText + syntax + content.substring(end)
      setContent(newText)
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.selectionStart = start + syntax.length
          textareaRef.current.selectionEnd = start + syntax.length + selectedText.length
        }
      }, 0)
    }
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '0.5rem', 
      border: '1px solid #e5e7eb',
      height: '80vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
            📝 {filePath}
          </h3>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {wordCount} parole • {charCount} caratteri
          </div>
          {lastSaved && (
            <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
              Salvato: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Markdown Toolbar */}
          <div style={{ display: 'flex', gap: '0.25rem', marginRight: '1rem' }}>
            <button
              onClick={() => insertMarkdown('**')}
              title="Grassetto"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.875rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              **B**
            </button>
            <button
              onClick={() => insertMarkdown('*')}
              title="Corsivo"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.875rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              *I*
            </button>
            <button
              onClick={() => insertMarkdown('`')}
              title="Code"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.875rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              {'</>'}
            </button>
            <button
              onClick={() => insertMarkdown('# ')}
              title="Header"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.875rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              H1
            </button>
          </div>

          {/* View Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f3f4f6',
            borderRadius: '0.375rem',
            padding: '0.125rem'
          }}>
            <button
              onClick={() => setIsPreview(false)}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: !isPreview ? '#3b82f6' : 'transparent',
                color: !isPreview ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Edit
            </button>
            <button
              onClick={() => setIsPreview(true)}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: isPreview ? '#3b82f6' : 'transparent',
                color: isPreview ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Preview
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: isSaving ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {isSaving ? "Salvataggio..." : "Salva"}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Chiudi
            </button>
          )}
        </div>
      </div>

      {/* Editor/Preview */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#6b7280'
          }}>
            Caricamento file...
          </div>
        ) : !isPreview ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Inizia a scrivere in Markdown..."
            style={{
              width: '100%',
              height: '100%',
              padding: '1.5rem',
              border: 'none',
              resize: 'none',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              outline: 'none'
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              padding: '1.5rem',
              overflow: 'auto',
              fontSize: '0.875rem',
              lineHeight: '1.6'
            }}
            dangerouslySetInnerHTML={{ __html: previewHTML }}
          />
        )}
      </div>
    </div>
  )
}
