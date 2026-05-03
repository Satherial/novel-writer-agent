"use client"

import type { FormEvent } from "react"

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  loading: boolean
  error: string
  projectName: string
  projectDescription: string
  onProjectNameChange: (value: string) => void
  onProjectDescriptionChange: (value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export default function CreateProjectModal({
  open,
  onClose,
  loading,
  error,
  projectName,
  projectDescription,
  onProjectNameChange,
  onProjectDescriptionChange,
  onSubmit,
}: CreateProjectModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-create-project-title"
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 id="modal-create-project-title" className="text-lg font-semibold text-gray-900">
            Crea nuovo progetto
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Chiudi"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome del progetto *
            </label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              placeholder="Il mio romanzo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={3}
            />
          </div>

          <div>
            <label htmlFor="project-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione (opzionale)
            </label>
            <textarea
              id="project-desc"
              value={projectDescription}
              onChange={(e) => onProjectDescriptionChange(e.target.value)}
              placeholder="Una breve descrizione del progetto..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || projectName.length < 3}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? "Creazione..." : "Crea progetto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
