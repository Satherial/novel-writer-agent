import path from "path"
import fs from "fs/promises"
import matter from "gray-matter"

// Root directory per tutti i progetti utente
const DATA_ROOT = path.resolve(process.cwd(), "data/projects")

// Errori custom
export class PathTraversalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PathTraversalError"
  }
}

export class FileLockedError extends Error {
  constructor(filePath: string) {
    super(`File is locked: ${filePath}`)
    this.name = "FileLockedError"
  }
}

// Ottieni il percorso base per un utente
export function getUserPath(userId: string): string {
  return path.join(DATA_ROOT, userId)
}

// Ottieni il percorso per un progetto specifico
export function getProjectPath(userId: string, projectId: string): string {
  return path.join(DATA_ROOT, userId, projectId)
}

// Validazione anti-path-traversal CRITICA
export async function safeResolve(
  userId: string, 
  projectId: string, 
  ...segments: string[]
): Promise<string> {
  const basePath = getProjectPath(userId, projectId)
  const targetPath = path.resolve(basePath, ...segments)
  const normalized = path.normalize(targetPath)
  
  // Verifica che il percorso canonico inizi con il percorso base del progetto
  if (!normalized.startsWith(basePath)) {
    throw new PathTraversalError(`Access denied: ${normalized} is outside project directory`)
  }
  
  return normalized
}

// Verifica che un percorso sia dentro il progetto (sincrona)
export function safeResolveSync(
  userId: string, 
  projectId: string, 
  ...segments: string[]
): string {
  const basePath = getProjectPath(userId, projectId)
  const targetPath = path.resolve(basePath, ...segments)
  const normalized = path.normalize(targetPath)
  
  if (!normalized.startsWith(basePath)) {
    throw new PathTraversalError(`Access denied: ${normalized} is outside project directory`)
  }
  
  return normalized
}

// Assicura che la directory esista
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (error) {
    throw new Error(`Failed to create directory: ${dirPath}`)
  }
}

// Crea la struttura di un nuovo progetto
export async function createProjectStructure(
  userId: string, 
  projectId: string
): Promise<void> {
  try {
    const projectPath = getProjectPath(userId, projectId)
    console.log(`[FS] Creating project structure at: ${projectPath}`)
    
    // Crea directory principale del progetto
    await ensureDir(projectPath)
    console.log(`[FS] Created main directory: ${projectPath}`)
    
    // Crea le directory base
    await ensureDir(path.join(projectPath, "chapters"))
    await ensureDir(path.join(projectPath, "characters"))
    await ensureDir(path.join(projectPath, "notes"))
    console.log(`[FS] Created subdirectories for project: ${projectId}`)
    
    // Crea outline.md vuoto
    const outlinePath = path.join(projectPath, "outline.md")
    try {
      await fs.access(outlinePath)
      console.log(`[FS] outline.md already exists: ${outlinePath}`)
    } catch {
      // File non esiste, crealo
      await fs.writeFile(
        outlinePath, 
        `---\ntitle: "Outline del Romanzo"\ncreated: ${new Date().toISOString()}\n---\n\n# Outline\n\nAggiungi qui la struttura del tuo romanzo.\n`,
        "utf-8"
      )
      console.log(`[FS] Created outline.md: ${outlinePath}`)
    }
    
    console.log(`[FS] Project structure created successfully: ${projectId}`)
  } catch (error) {
    console.error(`[FS] Error creating project structure:`, error)
    throw error
  }
}

// Legge un file Markdown con frontmatter
export async function readMarkdownFile(
  userId: string, 
  projectId: string, 
  relativePath: string
): Promise<{ content: string; data: Record<string, any>; path: string }> {
  const safePath = await safeResolve(userId, projectId, relativePath)
  
  try {
    const fileContent = await fs.readFile(safePath, "utf-8")
    const parsed = matter(fileContent)
    
    return {
      content: parsed.content,
      data: parsed.data,
      path: relativePath,
    }
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(`File not found: ${relativePath}`)
    }
    throw error
  }
}

// Scrive un file Markdown con frontmatter
export async function writeMarkdownFile(
  userId: string, 
  projectId: string, 
  relativePath: string,
  content: string,
  frontmatter?: Record<string, any>
): Promise<{ path: string; success: true }> {
  const safePath = await safeResolve(userId, projectId, relativePath)
  
  // Assicura che la directory esista
  const dir = path.dirname(safePath)
  await ensureDir(dir)
  
  // Prepara il contenuto con frontmatter
  let fileContent: string
  if (frontmatter && Object.keys(frontmatter).length > 0) {
    const fm = matter.stringify(content, frontmatter)
    fileContent = fm
  } else {
    fileContent = content
  }
  
  await fs.writeFile(safePath, fileContent, "utf-8")
  
  return { path: relativePath, success: true }
}

// Crea un nuovo file
export async function createFile(
  userId: string, 
  projectId: string, 
  relativePath: string,
  content: string = "",
  frontmatter?: Record<string, any>
): Promise<{ path: string; created: true }> {
  const safePath = await safeResolve(userId, projectId, relativePath)
  
  // Verifica che non esista già
  try {
    await fs.access(safePath)
    throw new Error(`File already exists: ${relativePath}`)
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error
    // ENOINT = file non esiste, possiamo crearlo
  }
  
  const dir = path.dirname(safePath)
  await ensureDir(dir)
  
  let fileContent = content
  if (frontmatter && Object.keys(frontmatter).length > 0) {
    fileContent = matter.stringify(content, frontmatter)
  }
  
  await fs.writeFile(safePath, fileContent, "utf-8")
  
  return { path: relativePath, created: true }
}

// Elimina un file
export async function deleteFile(
  userId: string, 
  projectId: string, 
  relativePath: string
): Promise<{ path: string; deleted: true }> {
  const safePath = await safeResolve(userId, projectId, relativePath)
  
  await fs.unlink(safePath)
  
  return { path: relativePath, deleted: true }
}

// Lista file in una directory
export async function listFiles(
  userId: string, 
  projectId: string, 
  subdir: string = "."
): Promise<Array<{ name: string; path: string; isDirectory: boolean }>> {
  const safePath = await safeResolve(userId, projectId, subdir)
  
  try {
    const entries = await fs.readdir(safePath, { withFileTypes: true })
    
    return entries.map(entry => ({
      name: entry.name,
      path: path.join(subdir, entry.name).replace(/\\/g, "/"),
      isDirectory: entry.isDirectory(),
    }))
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return [] // Directory non esiste, ritorna vuoto
    }
    throw error
  }
}

// Verifica se un file esiste
export async function fileExists(
  userId: string, 
  projectId: string, 
  relativePath: string
): Promise<boolean> {
  try {
    const safePath = await safeResolve(userId, projectId, relativePath)
    await fs.access(safePath)
    return true
  } catch {
    return false
  }
}

// Legge contenuto raw di un file (per indexing)
export async function readFileRaw(
  userId: string, 
  projectId: string, 
  relativePath: string
): Promise<string> {
  const safePath = await safeResolve(userId, projectId, relativePath)
  return fs.readFile(safePath, "utf-8")
}

// Ottieni tutti i file Markdown ricorsivamente (per search/indexing)
export async function getAllMarkdownFiles(
  userId: string, 
  projectId: string,
  subdir: string = "."
): Promise<string[]> {
  const safePath = await safeResolve(userId, projectId, subdir)
  const results: string[] = []
  
  async function walk(dir: string, baseRelPath: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relPath = path.join(baseRelPath, entry.name).replace(/\\/g, "/")
      
      if (entry.isDirectory()) {
        await walk(fullPath, relPath)
      } else if (entry.name.endsWith(".md")) {
        results.push(relPath)
      }
    }
  }
  
  await walk(safePath, subdir === "." ? "" : subdir)
  return results
}

// Verifica accesso progetto (usato dalle API)
export async function verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const { prisma } = await import("../../prisma/config")
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
  })
  return project !== null
}
