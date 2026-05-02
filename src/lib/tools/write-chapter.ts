import { z } from "zod"
import { writeMarkdownFile, createFile } from "@/lib/project-fs"
import { ToolResult } from "./types"

// Schema parametri
export const writeChapterSchema = z.object({
  projectId: z.string().describe("ID del progetto"),
  path: z.string().describe("Percorso relativo, es: 'chapters/01-inizio.md'"),
  content: z.string().describe("Contenuto Markdown del capitolo"),
  frontmatter: z.object({
    title: z.string().optional().describe("Titolo del capitolo"),
    order: z.number().optional().describe("Ordine numerico del capitolo"),
    status: z.enum(["draft", "review", "final"]).optional().describe("Stato: draft, review, final"),
    tags: z.array(z.string()).optional().describe("Tag aggiuntivi")
  }).optional().describe("Metadati del capitolo"),
  createIfNotExists: z.boolean().default(true).describe("Crea il file se non esiste")
})

export type WriteChapterParams = z.infer<typeof writeChapterSchema>

// Factory function
export function createWriteChapterTool(userId: string) {
  return {
    description: "Scrive o aggiorna un capitolo del romanzo. Crea il file se non esiste. Supporta frontmatter (title, order, status).",
    inputSchema: writeChapterSchema,
    execute: async (args: WriteChapterParams): Promise<ToolResult> => {
      const { projectId, path, content, frontmatter, createIfNotExists } = args
      try {
        // Aggiungi timestamp di ultima modifica
        const fm = {
          ...frontmatter,
          updatedAt: new Date().toISOString()
        }

        let result
        if (createIfNotExists) {
          result = await writeMarkdownFile(userId, projectId, path, content, fm)
        } else {
          result = await createFile(userId, projectId, path, content, fm)
        }
        
        return { 
          success: true, 
          message: `Capitolo salvato: ${path}`, 
          data: { path: result.path }
        }
      } catch (error: any) {
        if (error.message?.includes("already exists")) {
          return { 
            success: false, 
            message: `Il file ${path} esiste già. Usa writeChapter per aggiornarlo.` 
          }
        }
        return { 
          success: false, 
          message: error.message || `Errore nella scrittura di ${path}` 
        }
      }
    }
  }
}
