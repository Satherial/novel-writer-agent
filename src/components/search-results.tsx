"use client"

interface SearchResult {
  filePath: string
  content: string
  score: number
}

interface SearchResultsProps {
  results: SearchResult[]
}

export default function SearchResults({ results }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        Nessun risultato trovato.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Risultati ({results.length})</h3>
      
      {results.map((result, index) => (
        <div key={`${result.filePath}-${index}`} className="bg-white p-4 rounded-lg shadow border">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-blue-600">{result.filePath}</h4>
            <span className="text-xs text-gray-400">
              Score: {result.score.toFixed(4)}
            </span>
          </div>
          
          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
            <pre className="whitespace-pre-wrap font-sans">
              {result.content.length > 300 
                ? result.content.substring(0, 300) + "..."
                : result.content
              }
            </pre>
          </div>
        </div>
      ))}
    </div>
  )
}
