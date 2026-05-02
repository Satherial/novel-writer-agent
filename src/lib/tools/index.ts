// NovelCraft AI Tools - AI SDK v4
// Tutti i tool con iniezione sicura di userId dal server

import { createReadChapterTool } from "./read-chapter"
import { createWriteChapterTool } from "./write-chapter"
import { createListCharactersTool } from "./list-characters"
import { createGetCharacterProfileTool } from "./get-character-profile"
import { createSaveNoteTool } from "./save-note"
import { createSearchProjectTool } from "./search-project"

// Esporta le factory functions individuali
export {
  createReadChapterTool,
  createWriteChapterTool,
  createListCharactersTool,
  createGetCharacterProfileTool,
  createSaveNoteTool,
  createSearchProjectTool
}

// Esporta gli schema per uso esterno se necessario
export { readChapterSchema } from "./read-chapter"
export { writeChapterSchema } from "./write-chapter"
export { listCharactersSchema } from "./list-characters"
export { getCharacterProfileSchema } from "./get-character-profile"
export { saveNoteSchema } from "./save-note"
export { searchProjectSchema } from "./search-project"

// Esporta i tipi
export type { ReadChapterParams } from "./read-chapter"
export type { WriteChapterParams } from "./write-chapter"
export type { ListCharactersParams } from "./list-characters"
export type { GetCharacterProfileParams } from "./get-character-profile"
export type { SaveNoteParams } from "./save-note"
export type { SearchProjectParams } from "./search-project"
export type { ToolResult } from "./types"

// Funzione principale: crea tutti i tool configurati per un userId
// Usata nel server per iniettare il contesto utente in modo sicuro
export function createTools(userId: string) {
  return {
    readChapter: createReadChapterTool(userId),
    writeChapter: createWriteChapterTool(userId),
    listCharacters: createListCharactersTool(userId),
    getCharacterProfile: createGetCharacterProfileTool(userId),
    saveNote: createSaveNoteTool(userId),
    searchProject: createSearchProjectTool(userId)
  }
}

// Tipo aggregato per i tool
export type NovelCraftTools = ReturnType<typeof createTools>
