import { PrismaClient } from "@prisma/client"
import { readFileRaw } from "./project-fs"

const prisma = new PrismaClient()

// Configurazione embeddings
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text"

// Inizializza estensione sqlite-vec
export async function initializeVectorExtension() {
  try {
    // Carica estensione sqlite-vec
    await prisma.$executeRaw`SELECT load_extension('vec0')`
    console.log("[VECTOR] sqlite-vec extension loaded")
  } catch (error) {
    console.error("[VECTOR] Failed to load sqlite-vec extension:", error)
    throw error
  }
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

// Crea tabella vettoriale per un progetto
export async function createVectorTable(projectId: string) {
  const tableName = `vectors_${projectId.replace(/[^a-zA-Z0-9_]/g, '_')}`
  
  try {
    await prisma.$executeRaw`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${prisma.$queryRawUnsafe(tableName)} 
      USING vec0(
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding FLOAT[1536] 
      )
    `
    console.log(`[VECTOR] Created vector table: ${tableName}`)
  } catch (error) {
    console.error(`[VECTOR] Failed to create table ${tableName}:`, error)
    throw error
  }
}

// Indicizza un file nel vettore
export async function indexFile(
  userId: string,
  projectId: string,
  filePath: string
): Promise<{ chunks: number }> {
  const tableName = `vectors_${projectId.replace(/[^a-zA-Z0-9_]/g, '_')}`
  
  try {
    const content = await readFileRaw(userId, projectId, filePath)
    const chunks = splitTextIntoChunks(content, 500, 50) // Chunks più piccoli per embeddings
    
    let indexedCount = 0
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      try {
        const embedding = await generateEmbedding(chunk)
        
        await prisma.$executeRaw`
          INSERT INTO ${prisma.$queryRawUnsafe(tableName)} 
          (id, project_id, file_path, content, embedding)
          VALUES (${`${projectId}:${filePath}:${i}`}, ${projectId}, ${filePath}, ${chunk}, ${embedding})
        `
        
        indexedCount++
      } catch (error) {
        console.error(`[VECTOR] Failed to index chunk ${i} of ${filePath}:`, error)
      }
    }
    
    console.log(`[VECTOR] Indexed ${filePath}: ${indexedCount}/${chunks.length} chunks`)
    return { chunks: indexedCount }
  } catch (error) {
    console.error(`[VECTOR] Failed to index ${filePath}:`, error)
    throw error
  }
}

// Suddividi testo in chunks
function splitTextIntoChunks(text: string, maxChunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + maxChunkSize

    // Cerca punti di interruzione naturali
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

  return chunks.filter(chunk => chunk.length > 50)
}

// Ricerca semantica KNN
export async function searchSemantic(
  userId: string,
  projectId: string,
  query: string,
  limit: number = 10
): Promise<Array<{ filePath: string; content: string; score: number }>> {
  const tableName = `vectors_${projectId.replace(/[^a-zA-Z0-9_]/g, '_')}`
  
  try {
    // Genera embedding della query
    const queryEmbedding = await generateEmbedding(query)
    
    // Esegui ricerca KNN
    const results = await prisma.$queryRawUnsafe(`
      SELECT 
        file_path,
        content,
        distance(embedding, ${JSON.stringify(queryEmbedding)}) as score
      FROM ${tableName}
      WHERE project_id = ${projectId}
      ORDER BY score
      LIMIT ${limit}
    `) as Array<{ file_path: string; content: string; score: number }>

    return results.map(r => ({
      filePath: r.file_path,
      content: r.content,
      score: r.score,
    }))
  } catch (error) {
    console.error(`[VECTOR] Semantic search failed for ${projectId}:`, error)
    return []
  }
}

// Reindicizza progetto completo
export async function reindexProject(
  userId: string,
  projectId: string
): Promise<{ files: number; chunks: number }> {
  const tableName = `vectors_${projectId.replace(/[^a-zA-Z0-9_]/g, '_')}`
  
  try {
    // Elimina vecchi indici
    await prisma.$executeRawUnsafe(`DELETE FROM ${tableName} WHERE project_id = ${projectId}`)
    
    // Ricrea tabella
    await createVectorTable(projectId)
    
    // Indicizza tutti i file
    const { getAllMarkdownFiles } = await import("./project-fs")
    const files = await getAllMarkdownFiles(userId, projectId)
    
    let totalChunks = 0
    
    for (const filePath of files) {
      try {
        const result = await indexFile(userId, projectId, filePath)
        totalChunks += result.chunks
      } catch (error) {
        console.error(`[VECTOR] Failed to reindex ${filePath}:`, error)
      }
    }
    
    console.log(`[VECTOR] Reindexed ${projectId}: ${files.length} files, ${totalChunks} chunks`)
    return { files: files.length, chunks: totalChunks }
  } catch (error) {
    console.error(`[VECTOR] Failed to reindex project ${projectId}:`, error)
    throw error
  }
}

// Verifica se esiste tabella vettoriale
export async function vectorTableExists(projectId: string): Promise<boolean> {
  const tableName = `vectors_${projectId.replace(/[^a-zA-Z0-9_]/g, '_')}`
  
  try {
    await prisma.$queryRawUnsafe(`SELECT 1 FROM ${tableName} LIMIT 1`)
    return true
  } catch {
    return false
  }
}

// Pulisci indici di un progetto
export async function clearVectorIndex(projectId: string): Promise<void> {
  const tableName = `vectors_${projectId.replace(/[^a-zA-Z0-9_]/g, '_')}`
  
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM ${tableName} WHERE project_id = ${projectId}`)
    console.log(`[VECTOR] Cleared vector index for ${projectId}`)
  } catch (error) {
    console.error(`[VECTOR] Failed to clear index for ${projectId}:`, error)
    throw error
  }
}
