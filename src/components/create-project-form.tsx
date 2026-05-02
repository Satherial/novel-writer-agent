"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function CreateProjectForm() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create project")
      }

      // Successo - ricarica la pagina per vedere il nuovo progetto
      router.refresh()
      setName("")
      setDescription("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-4">Crea Nuovo Progetto</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="Il mio romanzo"
          required
          minLength={3}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Descrizione (opzionale)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="Una breve descrizione del progetto..."
          rows={2}
        />
      </div>

      <button
        type="submit"
        disabled={loading || name.length < 3}
        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Creazione..." : "Crea Progetto"}
      </button>
    </form>
  )
}
