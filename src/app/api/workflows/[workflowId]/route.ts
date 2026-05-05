import { auth } from "@/lib/auth"
import { prisma } from "../../../../../prisma/config"
import { NextResponse } from "next/server"

// POST /api/workflows/[workflowId] - Execute workflow
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workflowId } = await params
  const userId = session.user.id

  try {
    const body = await request.json()
    const { projectId, filePath, options } = body

    // Verify project access
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Execute workflow based on type
    switch (workflowId) {
      case "chapter-generation":
        return await executeChapterGenerationWorkflow(userId, projectId, filePath, options)
      
      case "character-generation":
        return await executeCharacterGenerationWorkflow(userId, projectId, options)
      
      case "dialog-generation":
        return await executeDialogGenerationWorkflow(userId, projectId, options)
      
      case "scene-description":
        return await executeSceneDescriptionWorkflow(userId, projectId, options)
      
      case "text-review":
        return await executeTextReviewWorkflow(userId, projectId, filePath, options)
      
      default:
        return NextResponse.json({ error: "Unknown workflow" }, { status: 400 })
    }

  } catch (error: any) {
    console.error(`[Workflow ${workflowId}] Error:`, error)
    return NextResponse.json(
      { error: error.message || "Workflow execution failed" },
      { status: 500 }
    )
  }
}

// Chapter Generation Workflow - Agentic: Creates chapter file and returns prompt
async function executeChapterGenerationWorkflow(
  userId: string,
  projectId: string,
  filePath: string,
  options?: any
) {
  const { readMarkdownFile, writeMarkdownFile, fileExists } = await import("@/lib/project-fs")
  
  // Read outline for context
  let outlineContent = ""
  try {
    const outlineResult = await readMarkdownFile(userId, projectId, "outline.md")
    outlineContent = outlineResult.content
  } catch {
    // Outline might not exist
  }

  // Determine chapter file path
  const chapterNum = options?.chapterNum || 1
  const chapterTitle = options?.title || `Capitolo ${chapterNum}`
  const chapterFileName = `chapters/capitolo_${chapterNum.toString().padStart(2, '0')}_${chapterTitle.toLowerCase().replace(/\s+/g, '_')}.md`
  
  // Check if file already exists
  const exists = await fileExists(userId, projectId, chapterFileName)
  
  // Create chapter with template
  const chapterTemplate = `# ${chapterTitle}

<!-- Generato da workflow AI - Tono: ${options?.tone || 'drammatico'} -->

${options?.keyPoints ? `## Punti chiave da sviluppare\n${options.keyPoints}\n\n` : ''}
## Contenuto

_In attesa di generazione AI..._
`

  if (!exists) {
    await writeMarkdownFile(userId, projectId, chapterFileName, chapterTemplate)
  }

  return NextResponse.json({
    success: true,
    message: "Chapter workflow ready",
    workflow: "chapter-generation",
    data: {
      chapterFile: chapterFileName,
      chapterNum,
      chapterTitle,
      tone: options?.tone,
      outlinePresent: !!outlineContent,
      message: `File capitolo creato: ${chapterFileName}. L'AI può ora generare il contenuto basandosi sull'outline e i punti chiave indicati.`
    }
  })
}

// Character Generation Workflow - Agentic: Creates character file
async function executeCharacterGenerationWorkflow(
  userId: string,
  projectId: string,
  options?: any
) {
  const { readMarkdownFile, writeMarkdownFile } = await import("@/lib/project-fs")
  
  // Read outline for context
  let outlineContent = ""
  try {
    const outlineResult = await readMarkdownFile(userId, projectId, "outline.md")
    outlineContent = outlineResult.content
  } catch {
    // Outline might not exist
  }

  const charName = options?.name || "Nuovo Personaggio"
  const safeFileName = charName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  const charFileName = `characters/${safeFileName}.md`

  // Create character template
  const charTemplate = `---
nome: "${charName}"
ruolo: "${options?.role || 'secondario'}"
${options?.age ? `eta: "${options.age}"\n` : ''}${options?.gender ? `sesso: "${options.gender}"\n` : ''}creato: "${new Date().toISOString()}"
---

# ${charName}

## Informazioni Base
- **Ruolo**: ${options?.role || 'Secondario'}
${options?.age ? `- **Età**: ${options.age}\n` : ''}${options?.gender ? `- **Sesso/Genere**: ${options.gender}\n` : ''}

## Caratteristiche
${options?.traits || '_Da definire..._'}

## Descrizione Dettagliata

### Aspetto Fisico
_Da sviluppare con AI..._

### Personalità
_Da sviluppare con AI..._

### Background
_Da sviluppare con AI..._

### Motivazioni e Obiettivi
_Da sviluppare con AI..._

### Relazioni
_Da sviluppare con AI..._

## Arco Narrativo
_Da sviluppare con AI..._
`

  await writeMarkdownFile(userId, projectId, charFileName, charTemplate)

  return NextResponse.json({
    success: true,
    message: "Character workflow completed",
    workflow: "character-generation",
    data: {
      characterFile: charFileName,
      characterName: charName,
      outlinePresent: !!outlineContent,
      message: `Scheda personaggio creata: ${charFileName}. L'AI può ora completare i dettagli basandosi sull'outline e le caratteristiche indicate.`
    }
  })
}

// Dialog Generation Workflow - Returns dialog config for chat
async function executeDialogGenerationWorkflow(
  userId: string,
  projectId: string,
  options?: any
) {
  const { readMarkdownFile } = await import("@/lib/project-fs")
  
  // Try to read character profiles if they exist
  let char1Profile = ""
  let char2Profile = ""
  
  try {
    const char1File = await readMarkdownFile(userId, projectId, `characters/${options?.char1?.toLowerCase().replace(/\s+/g, '_')}.md`)
    char1Profile = char1File.content
  } catch {
    // Character file might not exist
  }
  
  try {
    const char2File = await readMarkdownFile(userId, projectId, `characters/${options?.char2?.toLowerCase().replace(/\s+/g, '_')}.md`)
    char2Profile = char2File.content
  } catch {
    // Character file might not exist
  }

  return NextResponse.json({
    success: true,
    message: "Dialog generation ready",
    workflow: "dialog-generation",
    data: {
      char1: options?.char1,
      char2: options?.char2,
      topic: options?.topic,
      tension: options?.tension,
      location: options?.location,
      char1ProfilePresent: !!char1Profile,
      char2ProfilePresent: !!char2Profile,
      message: `Configurazione dialogo pronta tra ${options?.char1} e ${options?.char2}. L'AI genererà il dialogo basandosi sul tema "${options?.topic}" con tono ${options?.tension}.`
    }
  })
}

// Scene Description Workflow - Simple prompt-based
async function executeSceneDescriptionWorkflow(
  userId: string,
  projectId: string,
  options?: any
) {
  const { readMarkdownFile } = await import("@/lib/project-fs")
  
  // Read outline for context
  let outlineContent = ""
  try {
    const outlineResult = await readMarkdownFile(userId, projectId, "outline.md")
    outlineContent = outlineResult.content
  } catch {
    // Outline might not exist
  }

  return NextResponse.json({
    success: true,
    message: "Scene description ready",
    workflow: "scene-description",
    data: {
      outlinePresent: !!outlineContent,
      message: "Pronto per descrivere una scena. L'AI creerà una descrizione vivida considerando l'ambientazione e l'atmosfera del romanzo."
    }
  })
}

// Text Review Workflow - Agentic: Reads file and prepares review
async function executeTextReviewWorkflow(
  userId: string,
  projectId: string,
  filePath: string,
  options?: any
) {
  if (!filePath) {
    return NextResponse.json({ error: "File path required" }, { status: 400 })
  }

  const { readMarkdownFile } = await import("@/lib/project-fs")
  
  // Read the file to be reviewed
  let fileContent = ""
  try {
    const fileResult = await readMarkdownFile(userId, projectId, filePath)
    fileContent = fileResult.content
  } catch (error: any) {
    return NextResponse.json({ 
      error: `Cannot read file: ${error.message}` 
    }, { status: 404 })
  }

  // Get focus areas
  const focusAreas = options?.focus || {
    grammar: true,
    style: true,
    flow: true,
    dialogue: false
  }

  const activeFocus = Object.entries(focusAreas)
    .filter(([_, v]) => v)
    .map(([k]) => k)

  return NextResponse.json({
    success: true,
    message: "Text review ready",
    workflow: "text-review",
    data: {
      filePath,
      fileSize: fileContent.length,
      focusAreas: activeFocus,
      intensity: options?.intensity || 2,
      message: `File "${filePath}" caricato (${fileContent.length} caratteri). L'AI eseguirà la revisione con focus su: ${activeFocus.join(', ')}.`
    }
  })
}
