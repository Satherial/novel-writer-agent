"use client"

import { useState, useEffect } from "react"

interface OutlineItem {
  id: string
  title: string
  type: "chapter" | "scene" | "note"
  order: number
  indent: number
  wordCount?: number
  status?: "draft" | "in-progress" | "completed"
  children?: OutlineItem[]
}

interface OutlineManagerProps {
  projectId: string
}

export default function OutlineManager({ projectId }: OutlineManagerProps) {
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [draggedItem, setDraggedItem] = useState<OutlineItem | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  useEffect(() => {
    loadOutline()
  }, [projectId])

  const loadOutline = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/files?path=outline.md`)
      if (response.ok) {
        const data = await response.json()
        const parsed = parseOutlineMarkdown(data.file.content)
        setOutline(parsed)
      }
    } catch (error) {
      console.error("Error loading outline:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const parseOutlineMarkdown = (content: string): OutlineItem[] => {
    const lines = content.split('\n')
    const items: OutlineItem[] = []
    let order = 0

    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('---')) return

      const match = trimmed.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const title = match[2].replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
        
        let type: "chapter" | "scene" | "note" = "note"
        if (level <= 2) type = "chapter"
        else if (level <= 4) type = "scene"

        items.push({
          id: `item-${index}`,
          title,
          type,
          order: order++,
          indent: (level - 1) * 20
        })
      }
    })

    return items
  }

  const saveOutline = async () => {
    setIsSaving(true)
    try {
      const markdown = generateOutlineMarkdown(outline)
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "outline.md",
          content: markdown
        })
      })

      if (!response.ok) {
        throw new Error("Failed to save outline")
      }
    } catch (error) {
      console.error("Error saving outline:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const generateOutlineMarkdown = (items: OutlineItem[]): string => {
    let markdown = "---\ntitle: \"Outline del Romanzo\"\nupdated: " + new Date().toISOString() + "\n---\n\n# Outline\n\n"
    
    items.forEach(item => {
      const level = Math.floor(item.indent / 20) + 1
      const hashes = "#".repeat(level)
      const status = item.status ? ` [${item.status}]` : ""
      markdown += `${hashes} ${item.title}${status}\n`
    })

    return markdown
  }

  const handleDragStart = (item: OutlineItem) => {
    setDraggedItem(item)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetItem: OutlineItem) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === targetItem.id) return

    const newOutline = [...outline]
    const draggedIndex = newOutline.findIndex(item => item.id === draggedItem.id)
    const targetIndex = newOutline.findIndex(item => item.id === targetItem.id)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [removed] = newOutline.splice(draggedIndex, 1)
      newOutline.splice(targetIndex, 0, removed)
      
      // Update order
      newOutline.forEach((item, index) => {
        item.order = index
      })

      setOutline(newOutline)
      setDraggedItem(null)
    }
  }

  const addItem = (type: "chapter" | "scene" | "note", parentId?: string) => {
    const newItem: OutlineItem = {
      id: `item-${Date.now()}`,
      title: `Nuovo ${type === "chapter" ? "Capitolo" : type === "scene" ? "Scena" : "Note"}`,
      type,
      order: outline.length,
      indent: parentId ? (outline.find(item => item.id === parentId)?.indent || 0) + 20 : 0
    }

    setOutline([...outline, newItem])
  }

  const deleteItem = (itemId: string) => {
    setOutline(outline.filter(item => item.id !== itemId))
  }

  const startEditing = (item: OutlineItem) => {
    setEditingItem(item.id)
    setEditTitle(item.title)
  }

  const saveEdit = () => {
    if (editingItem && editTitle.trim()) {
      setOutline(outline.map(item => 
        item.id === editingItem ? { ...item, title: editTitle.trim() } : item
      ))
    }
    setEditingItem(null)
    setEditTitle("")
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setEditTitle("")
  }

  const getItemIcon = (type: "chapter" | "scene" | "note") => {
    switch (type) {
      case "chapter": return "📖"
      case "scene": return "🎬"
      case "note": return "📝"
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed": return "#10b981"
      case "in-progress": return "#f59e0b"
      case "draft": return "#6b7280"
      default: return "#e5e7eb"
    }
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '0.5rem', 
      border: '1px solid #e5e7eb',
      height: '500px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
          📋 Outline del Progetto
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => addItem("chapter")}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            + Capitolo
          </button>
          <button
            onClick={() => addItem("scene")}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            + Scena
          </button>
          <button
            onClick={saveOutline}
            disabled={isSaving}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: isSaving ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: isSaving ? 'not-allowed' : 'pointer'
            }}
          >
            {isSaving ? "Salvaggio..." : "Salva"}
          </button>
        </div>
      </div>

      {/* Outline Items */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        padding: '0.5rem'
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#6b7280'
          }}>
            Caricamento outline...
          </div>
        ) : outline.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            <div>Nessuna struttura definita</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Aggiungi capitoli e scene per iniziare
            </div>
          </div>
        ) : (
          <div>
            {outline.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.5rem',
                  paddingLeft: `${0.5 + item.indent / 4}px`,
                  marginBottom: '0.25rem',
                  backgroundColor: draggedItem?.id === item.id ? '#e0e7ff' : '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  cursor: 'move',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>
                  {getItemIcon(item.type)}
                </span>
                
                {editingItem === item.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    style={{
                      flex: 1,
                      padding: '0.25rem',
                      border: '1px solid #3b82f6',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    onDoubleClick={() => startEditing(item)}
                    style={{
                      flex: 1,
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    {item.title}
                  </span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(item.status)
                    }}
                  />
                  <button
                    onClick={() => deleteItem(item.id)}
                    style={{
                      padding: '0.125rem 0.25rem',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '0.125rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid #e5e7eb',
        fontSize: '0.75rem',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: '0 0 0.5rem 0.5rem',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>{outline.length} elementi</span>
        <span>Drag & drop per riordinare • Double-click per modificare</span>
      </div>
    </div>
  )
}
