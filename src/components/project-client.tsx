"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Chat from "@/components/chat"
import SearchClient from "@/components/search-client"
import CodeMirror from "@uiw/react-codemirror"
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { useChatPanel } from "@/contexts/chat-panel-context"
import { useDebouncedCallback } from "@/hooks/useDebounce"
import { useFileLock } from "@/hooks/useFileLock"

// Toolbar button component
interface ToolbarButtonProps {
  icon: string
  label: string
  onClick: () => void
  title?: string
}

function ToolbarButton({ icon, label, onClick, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
    >
      <span className="font-medium">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

interface ProjectFile {
  name: string
  path: string
  type: "file" | "directory"
  children?: ProjectFile[]
}

interface Character {
  id: string
  name: string
  role: string
}

interface ProjectClientProps {
  projectId: string
  projectName: string
  projectDescription: string | null
  indexStatus: {
    indexed: boolean
    indexedFiles: number
  }
}

export default function ProjectClient({
  projectId,
  projectName,
  projectDescription,
  indexStatus,
}: ProjectClientProps) {
  const { chatOpen, setChatOpen } = useChatPanel()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [fileContent, setFileContent] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  const { locked: isSaving, withLock } = useFileLock()

  const contentRef = useRef(fileContent)
  const originalContentRef = useRef("")
  const cmRef = useRef<ReactCodeMirrorRef>(null)

  const persistContent = useCallback(
    async (newContent: string) => {
      if (!selectedFile || newContent === originalContentRef.current) return

      await withLock(async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/files`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: selectedFile,
              content: newContent,
            }),
          })

          if (res.ok) {
            originalContentRef.current = newContent
            setSaveStatus("saved")
            setTimeout(() => {
              if (contentRef.current === newContent) {
                setSaveStatus("idle")
              }
            }, 2000)
          } else {
            setSaveStatus("error")
          }
        } catch {
          console.error("Error saving file")
          setSaveStatus("error")
        }
      })
    },
    [projectId, selectedFile, withLock]
  )

  const debouncedPersist = useDebouncedCallback(persistContent, 600)

  const scheduleDebouncedSave = useCallback(
    (newContent: string) => {
      contentRef.current = newContent

      const hasChanges = newContent !== originalContentRef.current
      if (hasChanges) {
        setSaveStatus("saving")
      } else {
        setSaveStatus("idle")
      }

      debouncedPersist(newContent)
    },
    [debouncedPersist]
  )

  const insertMarkdown = useCallback(
    (before: string, after: string) => {
      const view = cmRef.current?.view
      if (!view) return

      const { from, to } = view.state.selection.main
      const selectedText = view.state.sliceDoc(from, to)
      const insert = before + selectedText + after

      view.focus()
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + insert.length },
      })
    },
    []
  )

  // Simple markdown renderer
  const renderMarkdown = (content: string): string => {
    return content
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>')
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 italic my-2">$1</blockquote>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
      .replace(/\n/g, '<br/>')
  }

  // Load project files
  useEffect(() => {
    loadFiles()
    loadCharacters()
  }, [projectId])

  const loadFiles = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files?dir=`)
      if (res.ok) {
        const data = await res.json()
        setFiles(buildFileTree(data.files || []))
      }
    } catch (error) {
      console.error("Error loading files:", error)
    } finally {
      setLoadingFiles(false)
    }
  }

  const loadCharacters = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files?dir=characters`)
      if (res.ok) {
        const data = await res.json()
        const chars = (data.files || [])
          .filter((f: any) => f.name.endsWith('.md'))
          .map((f: any) => ({
            id: f.name.replace('.md', ''),
            name: f.name.replace('.md', '').replace(/-/g, ' '),
            role: 'supporting'
          }))
        setCharacters(chars)
      }
    } catch (error) {
      console.error("Error loading characters:", error)
    }
  }

  const buildFileTree = (files: any[]): ProjectFile[] => {
    const tree: ProjectFile[] = []
    const map = new Map<string, ProjectFile>()

    files.forEach(file => {
      const parts = file.path.split('/')
      let currentPath = ''
      
      parts.forEach((part: string, index: number) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        const isLast = index === parts.length - 1
        
        if (!map.has(currentPath)) {
          const node: ProjectFile = {
            name: part,
            path: currentPath,
            type: isLast && !file.isDirectory ? 'file' : 'directory',
            children: []
          }
          map.set(currentPath, node)
          
          if (index === 0) {
            tree.push(node)
          } else {
            const parentPath = parts.slice(0, index).join('/')
            const parent = map.get(parentPath)
            if (parent && parent.children) {
              parent.children.push(node)
            }
          }
        }
      })
    })

    return tree
  }

  // Load file content when selected - store original content
  useEffect(() => {
    if (!selectedFile) {
      setFileContent("")
      originalContentRef.current = ""
      return
    }

    const loadFile = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/files?path=${encodeURIComponent(selectedFile)}`)
        if (res.ok) {
          const data = await res.json()
          const content = data.file?.content || ""
          setFileContent(content)
          contentRef.current = content
          originalContentRef.current = content
          setSaveStatus("idle")
        }
      } catch (error) {
        console.error("Error loading file:", error)
        setFileContent("")
        originalContentRef.current = ""
      }
    }

    loadFile()
  }, [selectedFile, projectId])

  const handleFileSelect = (path: string) => {
    setSelectedFile(path)
    // On mobile, close sidebar after selection
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const renderFileTree = (nodes: ProjectFile[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path} className="select-none">
        <button
          onClick={() => node.type === 'file' ? handleFileSelect(node.path) : null}
          className={`w-full text-left px-3 py-1.5 text-sm rounded-md flex items-center gap-2 transition-colors ${
            node.type === 'file'
              ? selectedFile === node.path
                ? 'bg-blue-50 text-blue-700'
                : 'hover:bg-gray-100 text-gray-700'
              : 'text-gray-600 font-medium'
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {node.type === 'directory' ? (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.children && node.children.length > 0 && (
          <div>{renderFileTree(node.children, level + 1)}</div>
        )}
      </div>
    ))
  }

  return (
    <div className="relative flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left Sidebar - Slide panel */}
      <aside
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full overflow-hidden"
        }`}
      >
        {/* Characters Section */}
        <div className="border-b border-gray-200">
          <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Personaggi
            </h3>
            <span className="text-xs text-gray-500">{characters.length}</span>
          </div>
          <div className="p-2 max-h-40 overflow-y-auto">
            {characters.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-2">Nessun personaggio</p>
            ) : (
              characters.map((char) => (
                <div
                  key={char.id}
                  className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md cursor-pointer flex items-center gap-2"
                  onClick={() => handleFileSelect(`characters/${char.id}.md`)}
                >
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium">
                    {char.name[0]?.toUpperCase()}
                  </span>
                  <span className="truncate">{char.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* File Tree Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              File del Progetto
            </h3>
          </div>
          <div className="p-2">
            {loadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            ) : files.length === 0 ? (
              <p className="text-sm text-gray-400 px-3 py-4 text-center">
                Nessun file nel progetto
              </p>
            ) : (
              renderFileTree(files)
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {/* Top bar with toggle buttons */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title={sidebarOpen ? "Nascondi sidebar" : "Mostra sidebar"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="border-l border-gray-300 h-6 mx-2"></div>
            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
              {projectName}
            </h1>
            {projectDescription && (
              <span className="text-sm text-gray-500 hidden sm:inline">- {projectDescription}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Index status */}
            <span className={`px-2 py-1 text-xs rounded-full ${
              indexStatus.indexed 
                ? "bg-green-100 text-green-700" 
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {indexStatus.indexed ? `${indexStatus.indexedFiles} file` : "Non indicizzato"}
            </span>

          </div>
        </div>

        {/* Search — stays under top bar */}
        <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="w-full max-w-2xl">
            <SearchClient projectId={projectId} />
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedFile ? (
            <div className="flex flex-col h-full">
              {/* Editor toolbar */}
              <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">{selectedFile}</span>
                  
                  {/* File lock indicator */}
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                    isSaving 
                      ? "bg-yellow-100 text-yellow-700" 
                      : saveStatus === "saved"
                        ? "bg-green-100 text-green-700"
                        : saveStatus === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                  }`}>
                    {isSaving ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>🔒 File bloccato...</span>
                      </>
                    ) : saveStatus === "saved" ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>✓ Salvato</span>
                      </>
                    ) : saveStatus === "error" ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Errore</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Modificato</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Last saved timestamp */}
                {saveStatus === "saved" && (
                  <span className="text-xs text-gray-400">
                    {new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}

                {/* View toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      showPreview
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {showPreview ? "👁️ Nascondi Preview" : "👁️ Mostra Preview"}
                  </button>
                </div>
              </div>

              {/* Markdown Toolbar */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
                <span className="text-xs text-gray-500 mr-2">Formattazione:</span>
                <ToolbarButton
                  icon="𝐁"
                  label="Grassetto"
                  onClick={() => insertMarkdown("**", "**")}
                  title="Grassetto (Ctrl+B)"
                />
                <ToolbarButton
                  icon="𝐼"
                  label="Corsivo"
                  onClick={() => insertMarkdown("*", "*")}
                  title="Corsivo (Ctrl+I)"
                />
                <ToolbarButton
                  icon="H1"
                  label="Titolo"
                  onClick={() => insertMarkdown("# ", "")}
                  title="Titolo H1"
                />
                <ToolbarButton
                  icon="H2"
                  label="Sottotitolo"
                  onClick={() => insertMarkdown("## ", "")}
                  title="Sottotitolo H2"
                />
                <ToolbarButton
                  icon="•"
                  label="Lista"
                  onClick={() => insertMarkdown("- ", "")}
                  title="Lista puntata"
                />
                <ToolbarButton
                  icon="1."
                  label="Numerata"
                  onClick={() => insertMarkdown("1. ", "")}
                  title="Lista numerata"
                />
                <ToolbarButton
                  icon="❝"
                  label="Citazione"
                  onClick={() => insertMarkdown("> ", "")}
                  title="Citazione"
                />
                <ToolbarButton
                  icon="```"
                  label="Codice"
                  onClick={() => insertMarkdown("```\n", "\n```")}
                  title="Blocco codice"
                />
                <ToolbarButton
                  icon="[Link]"
                  label="Link"
                  onClick={() => insertMarkdown("[", "](url)")}
                  title="Link"
                />
              </div>

              {/* Editor */}
              <div className={`flex-1 overflow-hidden ${showPreview ? "flex" : ""}`}>
                <div className={`relative ${showPreview ? "w-1/2" : "w-full"} h-full p-4`}>
                  {isSaving && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg pointer-events-none">
                      <div className="bg-white shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 border border-gray-200">
                        <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">🔒 File bloccato</p>
                          <p className="text-xs text-gray-500">Salvataggio in corso...</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <CodeMirror
                    ref={cmRef}
                    value={fileContent}
                    height="100%"
                    extensions={[markdown()]}
                    onChange={(value) => {
                      setFileContent(value)
                      scheduleDebouncedSave(value)
                    }}
                    className="h-full text-sm border border-gray-200 rounded-lg overflow-hidden"
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLineGutter: true,
                      highlightActiveLine: true,
                      foldGutter: false,
                    }}
                  />
                </div>
                
                {/* Preview Panel */}
                {showPreview && (
                  <div className="w-1/2 h-full p-4 border-l border-gray-200 bg-white overflow-auto">
                    <div className="prose prose-sm max-w-none">
                      <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Preview</h3>
                      <div 
                        className="markdown-preview"
                        dangerouslySetInnerHTML={{ 
                          __html: fileContent ? renderMarkdown(fileContent) : '<p class="text-gray-400 italic">Scrivi qualcosa per vedere la preview...</p>' 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  Nessun file selezionato
                </h3>
                <p className="text-gray-500 text-sm">
                  Clicca su un file nella sidebar per iniziare a modificarlo
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {chatOpen && (
        <button
          type="button"
          aria-label="Chiudi chat"
          className="lg:hidden fixed inset-0 top-16 z-[85] bg-gray-900/40"
          onClick={() => setChatOpen(false)}
        />
      )}

      {/* Right chat panel — drawer on narrow screens */}
      <aside
        className={`fixed lg:static lg:z-auto top-16 lg:top-auto bottom-0 right-0 z-[90] bg-white border-l border-gray-200 flex flex-col transition-transform duration-300 ease-out shrink-0
          w-full max-w-none sm:w-96 lg:w-96 lg:max-w-[24rem]
          ${chatOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0 lg:w-0 lg:max-w-0 lg:overflow-hidden lg:border-0"}`}
      >
        <div className="lg:hidden shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0" aria-hidden>
              🤖
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">Writing assistant</h3>
              <p className="text-xs text-gray-500">Accesso al progetto</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Chiudi pannello chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="hidden lg:flex px-4 py-3 bg-gray-50 border-b border-gray-200 items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0" aria-hidden>
              🤖
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">Writing assistant</h3>
              <p className="text-xs text-gray-500">Accesso completo al progetto</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-0">
          <Chat projectId={projectId} selectedFile={selectedFile} />
        </div>
      </aside>
    </div>
  )
}
