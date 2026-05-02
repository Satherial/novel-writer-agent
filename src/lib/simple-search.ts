import { readFileRaw, getAllMarkdownFiles } from "./project-fs"

// Ricerca full-text avanzata senza sqlite-vec
export interface SearchResult {
  filePath: string
  content: string
  score: number
  lineStart: number
  lineEnd: number
}

// Estrai snippet con contesto
function extractSnippet(text: string, query: string, contextLines: number = 3): string {
  const lines = text.split("\n")
  const queryLower = query.toLowerCase()
  
  // Trova tutte le linee che contengono la query
  const matchingLines: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(queryLower)) {
      matchingLines.push(i)
    }
  }
  
  if (matchingLines.length === 0) {
    return text.substring(0, 200) + (text.length > 200 ? "..." : "")
  }
  
  // Prendi il primo match e aggiungi contesto
  const firstMatch = matchingLines[0]
  const start = Math.max(0, firstMatch - contextLines)
  const end = Math.min(lines.length - 1, firstMatch + contextLines)
  
  return lines.slice(start, end + 1).join("\n")
}

// Calcola score di pertinenza
function calculateRelevanceScore(text: string, query: string): number {
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)
  
  let score = 0
  
  // Match esatto della query
  if (textLower.includes(queryLower)) {
    score += 10
  }
  
  // Match delle parole singole
  for (const word of queryWords) {
    const occurrences = (textLower.match(new RegExp(word, "g")) || []).length
    score += occurrences * 2
  }
  
  // Bonus per match all'inizio del testo
  if (textLower.startsWith(queryLower)) {
    score += 5
  }
  
  return score
}

// Ricerca full-text migliorata
export async function searchFiles(
  userId: string,
  projectId: string,
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  if (!query || query.length < 2) {
    return []
  }
  
  try {
    const files = await getAllMarkdownFiles(userId, projectId)
    const results: SearchResult[] = []
    
    for (const filePath of files) {
      try {
        const content = await readFileRaw(userId, projectId, filePath)
        const score = calculateRelevanceScore(content, query)
        
        if (score > 0) {
          // Trova posizione del match per snippet
          const lines = content.split("\n")
          let lineStart = 0
          let lineEnd = 0
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(query.toLowerCase())) {
              lineStart = Math.max(0, i - 1)
              lineEnd = Math.min(lines.length - 1, i + 2)
              break
            }
          }
          
          const snippet = extractSnippet(content, query)
          
          results.push({
            filePath,
            content: snippet,
            score,
            lineStart: lineStart + 1, // 1-based per UI
            lineEnd: lineEnd + 1,
          })
        }
      } catch (error) {
        console.error(`[SEARCH] Error reading ${filePath}:`, error)
      }
    }
    
    // Ordina per score decrescente e limita risultati
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      
  } catch (error) {
    console.error("[SEARCH] Search error:", error)
    return []
  }
}

// Ricerca fuzzy (per errori di battitura)
export async function fuzzySearch(
  userId: string,
  projectId: string,
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  // Implementazione semplice di Levenshtein distance
  function levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))
    
    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i
    }
    
    for (let j = 0; j <= b.length; j++) {
      matrix[j][0] = j
    }
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        )
      }
    }
    
    return matrix[b.length][a.length]
  }
  
  try {
    const files = await getAllMarkdownFiles(userId, projectId)
    const results: SearchResult[] = []
    
    for (const filePath of files) {
      try {
        const content = await readFileRaw(userId, projectId, filePath)
        const words = content.toLowerCase().split(/\s+/)
        
        // Cerca parole simili
        for (const word of words) {
          const distance = levenshteinDistance(query.toLowerCase(), word)
          if (distance <= 2 && word.length >= 3) { // Max 2 caratteri di differenza
            const score = Math.max(1, 5 - distance)
            const snippet = extractSnippet(content, word)
            
            results.push({
              filePath,
              content: snippet,
              score,
              lineStart: 1,
              lineEnd: 10,
            })
            break
          }
        }
      } catch (error) {
        console.error(`[FUZZY] Error reading ${filePath}:`, error)
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      
  } catch (error) {
    console.error("[FUZZY] Search error:", error)
    return []
  }
}
