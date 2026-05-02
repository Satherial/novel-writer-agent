import { z } from "zod"
import { readMarkdownFile } from "@/lib/project-fs"
import { ToolResult } from "./types"

// Schema parametri
export const readChapterSchema = z.object({
  projectId: z.string().describe("ID del progetto"),
  path: z.string().describe("Percorso relativo al file, es: 'chapters/01-inizio.md' o 'outline.md'")
})

export type ReadChapterParams = z.infer<typeof readChapterSchema>

// Factory function che crea il tool configurato per un userId specifico
export function createReadChapterTool(userId: string) {
  return {
    description: "Legge un capitolo del romanzo dato il percorso relativo. Restituisce il contenuto e il frontmatter.",
    inputSchema: readChapterSchema,
    execute: async (args: ReadChapterParams): Promise<ToolResult> => {
      const { projectId, path } = args
      try {
        const result = await readMarkdownFile(userId, projectId, path)
        
        return { 
          success: true, 
          message: `Capitolo letto: ${path}`, 
          data: {
            content: result.content,
            frontmatter: result.data,
            path: result.path
          }
        }
      } catch (error: any) {
        return { 
          success: false, 
          message: error.message || `Errore nella lettura di ${path}` 
        }
      }
    }
  }
}
