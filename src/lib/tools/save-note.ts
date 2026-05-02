import { z } from "zod"
import { writeMarkdownFile, createFile } from "@/lib/project-fs"
import { ToolResult } from "./types"

// Schema parametri
export const saveNoteSchema = z.object({
  projectId: z.string().describe("ID del progetto"),
  filename: z.string().describe("Nome del file nota (senza estensione)"),
  content: z.string().describe("Contenuto della nota in Markdown"),
  category: z.enum(["idea", "research", "todo", "other"]).default("other").describe("Categoria della nota"),
  tags: z.array(z.string()).optional().describe("Tag aggiuntivi")
})

export type SaveNoteParams = z.infer<typeof saveNoteSchema>

// Factory function
export function createSaveNoteTool(userId: string) {
  return {
    description: "Salva una nota nella cartella 'notes/' del progetto con timestamp e categoria.",
    inputSchema: saveNoteSchema,
    execute: async (args: SaveNoteParams): Promise<ToolResult> => {
      const { projectId, filename, content, category, tags } = args
      const path = `notes/${filename}.md`
      
      try {
        const frontmatter = {
          category,
          tags: tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Crea o aggiorna il file
        const result = await writeMarkdownFile(userId, projectId, path, content, frontmatter)
        
        return { 
          success: true, 
          message: `Nota salvata: ${filename}.md`, 
          data: { path: result.path, category }
        }
      } catch (error: any) {
        return { 
          success: false, 
          message: error.message || `Errore nel salvare la nota: ${filename}` 
        }
      }
    }
  }
}
