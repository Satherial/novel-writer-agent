"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Chat from "@/components/chat"
import CreateProjectModal from "@/components/create-project-modal"
import { useChatPanel } from "@/contexts/chat-panel-context"

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: Date
}

interface DashboardClientProps {
  projects: Project[]
  userId: string
}

export default function DashboardClient({ projects, userId: _userId }: DashboardClientProps) {
  const { chatOpen, setChatOpen } = useChatPanel()
  const [showModal, setShowModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDesc, setNewProjectDesc] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create project")
      }

      const data = await res.json()
      setShowModal(false)
      setNewProjectName("")
      setNewProjectDesc("")
      router.push(`/projects/${data.project.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col lg:flex-row gap-6 min-h-0">
      {/* Main content */}
      <div
        className={`flex-1 min-w-0 transition-[margin] duration-300 ${chatOpen ? "lg:mr-[400px]" : ""}`}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Gestisci i tuoi progetti di scrittura creativa
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              I tuoi progetti ({projects.length})
            </h2>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuovo progetto
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {projects.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-2">Nessun progetto ancora creato</p>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Crea il tuo primo progetto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <a
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{project.description}</p>
                        )}
                        <p className="mt-2 text-xs text-gray-400">
                          Creato: {new Date(project.createdAt).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {chatOpen && (
        <button
          type="button"
          aria-label="Chiudi chat"
          className="lg:hidden fixed inset-0 top-16 z-[85] bg-gray-900/40"
          onClick={() => setChatOpen(false)}
        />
      )}

      {/* Re-open handle (when chat is closed) */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[80] hidden lg:inline-flex items-center gap-2 rounded-l-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-md hover:bg-gray-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Apri pannello chat"
          title="Apri chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="hidden xl:inline">Chat</span>
        </button>
      )}

      {/* Chat panel */}
      <div
        className={`fixed z-[90] bg-white border-l border-gray-200 shadow-xl flex flex-col transition-transform duration-300 ease-out
          inset-x-0 top-16 bottom-0 w-full max-w-none
          lg:inset-x-auto lg:top-16 lg:right-0 lg:bottom-0 lg:w-[400px] lg:max-w-[100vw]
          ${chatOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="h-full flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0" aria-hidden>
                🤖
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">AI Assistant</h3>
                <p className="text-xs text-gray-500">Sola lettura (dashboard)</p>
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

          <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-0">
            <Chat />
          </div>
        </div>
      </div>

      <CreateProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        loading={loading}
        error={error}
        projectName={newProjectName}
        projectDescription={newProjectDesc}
        onProjectNameChange={setNewProjectName}
        onProjectDescriptionChange={setNewProjectDesc}
        onSubmit={handleCreateProject}
      />
    </div>
  )
}
