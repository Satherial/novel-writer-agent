"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function CreateProjectFormSimple() {
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

      // Successo - ricarica la pagina
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
    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Crea Nuovo Progetto</h3>
      
      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '0.375rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem 0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.375rem' 
            }}
            placeholder="Il mio romanzo"
            required
            minLength={3}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Descrizione (opzionale)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem 0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.375rem' 
            }}
            placeholder="Una breve descrizione del progetto..."
            rows={2}
          />
        </div>

        <button
          type="submit"
          disabled={loading || name.length < 3}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: loading || name.length < 3 ? '#9ca3af' : '#16a34a', 
            color: 'white', 
            borderRadius: '0.375rem', 
            border: 'none',
            cursor: loading || name.length < 3 ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? "Creazione..." : "Crea Progetto"}
        </button>
      </form>
    </div>
  )
}
