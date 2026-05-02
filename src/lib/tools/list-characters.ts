import { z } from "zod"
import { listFiles } from "@/lib/project-fs"
import { ToolResult } from "./types"

// Schema parametri
export const listCharactersSchema = z.object({
  projectId: z.string().describe("ID del progetto")
})

export type ListCharactersParams = z.infer<typeof listCharactersSchema>

// Factory function
export function createListCharactersTool(userId: string) {
  return {
    description: "Elenca tutti i personaggi presenti nella cartella 'characters/' del progetto.",
    inputSchema: listCharactersSchema,
    execute: async (args: ListCharactersParams): Promise<ToolResult> => {
      const { projectId } = args
      try {
        const files = await listFiles(userId, projectId, "characters")
        
        // Filtra solo i file Markdown
        const characters = files
          .filter(f => f.name.endsWith(".md"))
          .map(f => ({
            name: f.name.replace(".md", ""),
            path: f.path
          }))
        
        return { 
          success: true, 
          message: `${characters.length} personaggi trovati`, 
          data: { characters }
        }
      } catch (error: any) {
        // Se la directory non esiste, ritorna array vuoto
        if (error.message?.includes("ENOENT") || error.message?.includes("not found")) {
          return { 
            success: true, 
            message: "Nessun personaggio trovato (cartella characters vuota)", 
            data: { characters: [] }
          }
        }
        return { 
          success: false, 
          message: error.message || "Errore nel listare i personaggi" 
        }
      }
    }
  }
}
