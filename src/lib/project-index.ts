// Vector indexing per ricerca semantica dei file
// Usa sqlite-vec per embeddings locali

import { readFileRaw } from "./project-fs"

// Configurazione per Ollama embeddings
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text"

export interface DocumentChunk {
  id: string
  projectId: string
  filePath: string
  content: string
  embedding?: number[]
  startLine: number
  endLine: number
}

// Genera embedding via Ollama
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_EMBEDDING_MODEL,
      prompt: text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.embedding
}

// Suddividi testo in chunks per indexing
export function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 100): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + maxChunkSize

    // Cerca un punto di interruzione naturale (fine paragrafo/frase)
    if (end < text.length) {
      const nextNewline = text.indexOf("\n\n", end - overlap)
      const nextPeriod = text.indexOf(". ", end - overlap)

      if (nextNewline !== -1 && nextNewline < end + 100) {
        end = nextNewline + 2
      } else if (nextPeriod !== -1 && nextPeriod < end + 100) {
        end = nextPeriod + 2
      }
    } else {
      end = text.length
    }

    chunks.push(text.slice(start, end).trim())
    start = end - overlap
  }

  return chunks.filter(chunk => chunk.length > 50) // Ignora chunk troppo piccoli
}

// Ottieni line numbers per un chunk nel testo originale
export function getLineNumbers(text: string, chunk: string, searchStart: number = 0): { start: number; end: number } {
  const chunkIndex = text.indexOf(chunk, searchStart)
  if (chunkIndex === -1) return { start: 0, end: 0 }

  const beforeChunk = text.slice(0, chunkIndex)
  const startLine = beforeChunk.split("\n").length
  const endLine = startLine + chunk.split("\n").length - 1

  return { start: startLine, end: endLine }
}

// Indicizza un file Markdown
export async function indexFile(
  userId: string,
  projectId: string,
  filePath: string
): Promise<DocumentChunk[]> {
  const content = await readFileRaw(userId, projectId, filePath)
  const chunks = chunkText(content)

  const documentChunks: DocumentChunk[] = []
  let searchStart = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const { start, end } = getLineNumbers(content, chunk, searchStart)
    searchStart = content.indexOf(chunk, searchStart) + chunk.length

    // Genera embedding per il chunk
    let embedding: number[] | undefined
    try {
      embedding = await generateEmbedding(chunk)
    } catch (error) {
      console.error(`[INDEX] Failed to generate embedding for ${filePath} chunk ${i}:`, error)
      // Continua senza embedding, il search sarà fallback
    }

    documentChunks.push({
      id: `${projectId}:${filePath}:${i}`,
      projectId,
      filePath,
      content: chunk,
      embedding,
      startLine: start,
      endLine: end,
    })
  }

  console.log(`[INDEX] Indexed ${filePath}: ${documentChunks.length} chunks`)
  return documentChunks
}

// Ricerca full-text fallback (quando embeddings non disponibili)
export async function searchText(
  userId: string,
  projectId: string,
  query: string,
  filePaths?: string[]
): Promise<Array<{ filePath: string; snippet: string; lineStart: number; lineEnd: number; score: number }>> {
  const pathsToSearch = filePaths || await getAllMarkdownPaths(userId, projectId)
  const results: Array<{ filePath: string; snippet: string; lineStart: number; lineEnd: number; score: number }> = []

  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3)

  for (const filePath of pathsToSearch) {
    try {
      const content = await readFileRaw(userId, projectId, filePath)
      const lines = content.split("\n")

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineLower = line.toLowerCase()

        // Calcola score basato sulle parole chiave
        let score = 0
        if (lineLower.includes(queryLower)) {
          score += 10 // Match esatto
        }
        for (const word of queryWords) {
          if (lineLower.includes(word)) {
            score += 2 // Match parola singola
          }
        }

        if (score > 0) {
          // Estrai snippet con contesto
          const contextStart = Math.max(0, i - 2)
          const contextEnd = Math.min(lines.length, i + 3)
          const snippet = lines.slice(contextStart, contextEnd).join("\n")

          results.push({
            filePath,
            snippet,
            lineStart: contextStart + 1,
            lineEnd: contextEnd,
            score,
          })
        }
      }
    } catch (error) {
      console.error(`[SEARCH] Error reading ${filePath}:`, error)
    }
  }

  // Ordina per score decrescente
  return results.sort((a, b) => b.score - a.score).slice(0, 20)
}

// Helper per ottenere tutti i path Markdown
async function getAllMarkdownPaths(userId: string, projectId: string): Promise<string[]> {
  const { getAllMarkdownFiles } = await import("./project-fs")
  return getAllMarkdownFiles(userId, projectId)
}

// Ricerca semantica (richiede embeddings e sqlite-vec)
// TODO: Implementare quando sqlite-vec è configurato nel DB
export async function searchSemantic(
  userId: string,
  projectId: string,
  query: string,
  limit: number = 10
): Promise<Array<{ filePath: string; snippet: string; score: number }>> {
  // Per ora, fallback a ricerca testuale
  // In futuro: generare embedding della query e fare KNN search su sqlite-vec
  console.log("[SEARCH] Semantic search not yet implemented, using text search fallback")
  const textResults = await searchText(userId, projectId, query)
  return textResults.map(r => ({
    filePath: r.filePath,
    snippet: r.snippet,
    score: r.score / 10, // Normalizza score
  })).slice(0, limit)
}

// Re-indicizza tutto il progetto
export async function reindexProject(
  userId: string,
  projectId: string
): Promise<{ indexed: number; chunks: number }> {
  const { getAllMarkdownFiles } = await import("./project-fs")
  const files = await getAllMarkdownFiles(userId, projectId)

  let totalChunks = 0

  for (const filePath of files) {
    try {
      const chunks = await indexFile(userId, projectId, filePath)
      totalChunks += chunks.length
    } catch (error) {
      console.error(`[INDEX] Failed to index ${filePath}:`, error)
    }
  }

  console.log(`[INDEX] Reindexed project ${projectId}: ${files.length} files, ${totalChunks} chunks`)
  return { indexed: files.length, chunks: totalChunks }
}
