"use client"

import { useState } from "react"
import SearchInterface from "@/components/search-interface"
import SearchResults from "@/components/search-results"

interface SearchResult {
  filePath: string
  content: string
  score: number
}

interface SearchClientProps {
  projectId: string
}

export default function SearchClient({ projectId }: SearchClientProps) {
  const [results, setResults] = useState<SearchResult[]>([])

  return (
    <>
      <SearchInterface projectId={projectId} onResults={setResults} />
      {results.length > 0 && (
        <div className="mt-4">
          <SearchResults results={results} />
        </div>
      )}
    </>
  )
}
