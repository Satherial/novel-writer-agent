import { z } from "zod"
import { readMarkdownFile } from "@/lib/project-fs"
import { ToolResult } from "./types"

// Schema parametri
export const getCharacterProfileSchema = z.object({
  projectId: z.string().describe("ID del progetto"),
  name: z.string().describe("Nome del personaggio (senza estensione .md)")
})

export type GetCharacterProfileParams = z.infer<typeof getCharacterProfileSchema>

// Factory function
export function createGetCharacterProfileTool(userId: string) {
  return {
    description: "Legge il profilo completo di un personaggio dalla cartella 'characters/'.",
    inputSchema: getCharacterProfileSchema,
    execute: async (args: GetCharacterProfileParams): Promise<ToolResult> => {
      const { projectId, name } = args
      const path = `characters/${name}.md`
      
      try {
        const result = await readMarkdownFile(userId, projectId, path)
        
        return { 
          success: true, 
          message: `Profilo caricato: ${name}`, 
          data: {
            name,
            content: result.content,
            frontmatter: result.data,
            path: result.path
          }
        }
      } catch (error: any) {
        return { 
          success: false, 
          message: error.message || `Personaggio non trovato: ${name}` 
        }
      }
    }
  }
}
