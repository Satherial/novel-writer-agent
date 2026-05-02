"use client"

import { useState } from "react"

interface IndexProjectButtonProps {
  projectId: string
}

export default function IndexProjectButton({ projectId }: IndexProjectButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleIndex = async () => {
    setLoading(true)
    
    try {
      const res = await fetch(`/api/projects/${projectId}/index`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        alert("Errore: " + (data.error || "Indicizzazione fallita"))
      } else {
        alert("Progetto indicizzato con successo!")
        window.location.reload()
      }
    } catch (error) {
      alert("Errore di connessione")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleIndex}
      disabled={loading}
      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
    >
      {loading ? "Indicizzazione..." : "Indicizza Progetto"}
    </button>
  )
}
