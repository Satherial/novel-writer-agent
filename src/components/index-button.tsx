"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface IndexButtonProps {
  projectId: string
}

export default function IndexButton({ projectId }: IndexButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleIndex = async () => {
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/projects/${projectId}/index`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Indexing failed")
      }

      // Ricarica la pagina per vedere lo stato aggiornato
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleIndex}
        disabled={loading}
        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
      >
        {loading ? "Indicizzazione..." : "Indicizza Progetto"}
      </button>
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
    </div>
  )
}
