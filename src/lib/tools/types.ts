import { z } from "zod"

// Tipo base per tutti i tool NovelCraft AI
export interface ToolResult {
  success: boolean
  message: string
  data?: unknown
}

// Tipo per le funzioni tool create dal server
export interface ToolConfig<TParams, TResult> {
  description: string
  parameters: z.ZodSchema<TParams>
  execute: (args: TParams) => Promise<TResult>
}

// Factory type per creare tool con context
export type ToolFactory<TParams, TResult> = (userId: string) => ToolConfig<TParams, TResult>
