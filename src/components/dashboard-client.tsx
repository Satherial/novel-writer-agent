"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Chat from "@/components/chat"

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

export default function DashboardClient({ projects, userId }: DashboardClientProps) {
  const [showChat, setShowChat] = useState(true)
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${showChat ? "mr-[400px]" : ""}`}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Gestisci i tuoi progetti di scrittura creativa
          </p>
        </div>

        {/* Projects section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Section header with create button */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              I tuoi Progetti ({projects.length})
            </h2>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuovo Progetto
            </button>
          </div>

          {/* Projects list */}
          <div className="p-6">
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-2">Nessun progetto ancora creato</p>
                <button
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
                    className="group block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-gray-400">
                          Creato: {new Date(project.createdAt).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Chat slide panel */}
      <div className={`fixed right-0 top-[64px] bottom-0 w-[400px] bg-white border-l border-gray-200 shadow-lg transform transition-transform duration-300 z-40 ${showChat ? "translate-x-0" : "translate-x-full"}`}>
        <div className="h-full flex flex-col">
          {/* Chat toggle button (visible when panel closed) */}
          <button
            onClick={() => setShowChat(!showChat)}
            className="absolute -left-12 top-4 w-10 h-10 bg-white border border-gray-200 rounded-l-lg shadow-md flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-gray-50"
          >
            {showChat ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            )}
          </button>

          {/* Chat header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">AI Assistant</h3>
                <p className="text-xs text-gray-500">Sola lettura (Dashboard)</p>
              </div>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat component */}
          <div className="flex-1 overflow-hidden">
            <Chat />
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Crea Nuovo Progetto</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome del progetto *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Il mio romanzo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione (opzionale)
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Una breve descrizione del progetto..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading || newProjectName.length < 3}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {loading ? "Creazione..." : "Crea Progetto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
