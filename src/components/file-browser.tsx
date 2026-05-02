"use client"

import { useState, useEffect } from "react"

interface FileItem {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  modified?: string
}

interface FileBrowserProps {
  projectId: string
  onFileSelect: (filePath: string) => void
  selectedFile?: string
}

export default function FileBrowser({ projectId, onFileSelect, selectedFile }: FileBrowserProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentDir, setCurrentDir] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadFiles(currentDir)
  }, [projectId, currentDir])

  const loadFiles = async (dir: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/files?dir=${encodeURIComponent(dir)}`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
      } else {
        console.error("Failed to load files")
      }
    } catch (error) {
      console.error("Error loading files:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileClick = (file: FileItem) => {
    if (file.type === "file") {
      onFileSelect(file.path)
    } else {
      // Toggle directory expansion
      const newExpanded = new Set(expandedDirs)
      if (newExpanded.has(file.path)) {
        newExpanded.delete(file.path)
      } else {
        newExpanded.add(file.path)
      }
      setExpandedDirs(newExpanded)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i]
  }

  const getFileIcon = (file: FileItem) => {
    if (file.type === "directory") {
      return expandedDirs.has(file.path) ? "📂" : "📁"
    }
    
    if (file.name.endsWith(".md")) return "📝"
    if (file.name.endsWith(".txt")) return "📄"
    return "📄"
  }

  const renderFileTree = (items: FileItem[], depth: number = 0) => {
    return items.map((file) => (
      <div key={file.path}>
        <div
          onClick={() => handleFileClick(file)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.5rem',
            paddingLeft: `${0.5 + depth * 1.5}rem`,
            cursor: 'pointer',
            borderRadius: '0.25rem',
            backgroundColor: selectedFile === file.path ? '#e0e7ff' : 'transparent'
          }}
          onMouseEnter={(e) => {
            if (selectedFile !== file.path) {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedFile !== file.path) {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
        >
          <span style={{ marginRight: '0.5rem' }}>
            {getFileIcon(file)}
          </span>
          <span style={{ 
            flex: 1, 
            fontSize: '0.875rem',
            fontWeight: selectedFile === file.path ? '500' : 'normal'
          }}>
            {file.name}
          </span>
          {file.type === "file" && file.size && (
            <span style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280',
              marginLeft: '0.5rem'
            }}>
              {formatFileSize(file.size)}
            </span>
          )}
        </div>
      </div>
    ))
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '0.5rem', 
      border: '1px solid #e5e7eb',
      height: '400px',
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
          📁 File del Progetto
        </h3>
        <button
          onClick={() => loadFiles(currentDir)}
          disabled={isLoading}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '0.25rem',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? "..." : "🔄"}
        </button>
      </div>

      {/* File List */}
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
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            Caricamento file...
          </div>
        ) : files.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            Nessun file trovato
          </div>
        ) : (
          renderFileTree(files)
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid #e5e7eb',
        fontSize: '0.75rem',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: '0 0 0.5rem 0.5rem'
      }}>
        {files.length} elementi
      </div>
    </div>
  )
}
