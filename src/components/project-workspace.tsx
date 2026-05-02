"use client"

import { useState } from "react"
import FileBrowser from "./file-browser"
import FileEditor from "./file-editor"

interface ProjectWorkspaceProps {
  projectId: string
}

export default function ProjectWorkspace({ projectId }: ProjectWorkspaceProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath)
  }

  const handleCloseEditor = () => {
    setSelectedFile(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* File Browser */}
      <FileBrowser 
        projectId={projectId} 
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile || undefined}
      />

      {/* File Editor */}
      {selectedFile && (
        <FileEditor 
          projectId={projectId}
          filePath={selectedFile}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  )
}
