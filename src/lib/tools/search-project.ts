import { z } from "zod"
import { getAllMarkdownFiles, readFileRaw } from "@/lib/project-fs"
import { ToolResult } from "./types"

// Schema parametri
export const searchProjectSchema = z.object({
  projectId: z.string().describe("ID del progetto"),
  query: z.string().describe("Termine di ricerca (case-insensitive)"),
  maxResults: z.number().default(10).describe("Numero massimo di risultati")
})

export type SearchProjectParams = z.infer<typeof searchProjectSchema>

interface SearchResult {
  path: string
  snippet: string
  matches: number
}

// Factory function
export function createSearchProjectTool(userId: string) {
  return {
    description: "Cerca testo in tutti i file Markdown del progetto. Ritorna i file che contengono il termine con snippet.",
    inputSchema: searchProjectSchema,
    execute: async (args: SearchProjectParams): Promise<ToolResult> => {
      const { projectId, query, maxResults } = args
      
      try {
        // Ottieni tutti i file Markdown
        const files = await getAllMarkdownFiles(userId, projectId)
        const results: SearchResult[] = []
        const lowerQuery = query.toLowerCase()
        
        for (const filePath of files) {
          try {
            const content = await readFileRaw(userId, projectId, filePath)
            const lowerContent = content.toLowerCase()
            
            if (lowerContent.includes(lowerQuery)) {
              // Trova la posizione del match per estrarre uno snippet
              const index = lowerContent.indexOf(lowerQuery)
              const start = Math.max(0, index - 50)
              const end = Math.min(content.length, index + query.length + 50)
              const snippet = content.slice(start, end).trim()
              
              // Conta il numero di match
              const matches = (lowerContent.match(new RegExp(lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
              
              results.push({
                path: filePath,
                snippet: snippet.length > 100 ? snippet.slice(0, 100) + "..." : snippet,
                matches
              })
              
              if (results.length >= maxResults) break
            }
          } catch {
            // Ignora file che non riescono a leggere
            continue
          }
        }
        
        return { 
          success: true, 
          message: `${results.length} risultati per "${query}"`, 
          data: { 
            query,
            results,
            totalFilesSearched: files.length
          }
        }
      } catch (error: any) {
        return { 
          success: false, 
          message: error.message || "Errore nella ricerca" 
        }
      }
    }
  }
}
