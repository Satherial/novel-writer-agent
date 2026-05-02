"use client"

import { useState } from "react"

interface SearchResult {
  filePath: string
  content: string
  score: number
}

interface SearchInterfaceProps {
  projectId: string
  onResults: (results: SearchResult[]) => void
}

export default function SearchInterface({ projectId, onResults }: SearchInterfaceProps) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim() || query.length < 2) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/projects/${projectId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 20 }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Search failed")
      }

      const data = await res.json()
      onResults(data.results)
    } catch (err: any) {
      setError(err.message)
      onResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-4">Ricerca Semantica</h3>
      
      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca nei tuoi documenti..."
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-2 bg-red-100 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || query.length < 2}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Ricerca..." : "Cerca"}
        </button>
      </form>
    </div>
  )
}
