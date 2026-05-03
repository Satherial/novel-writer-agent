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

// Chapter Generation Workflow
async function executeChapterGenerationWorkflow(
  userId: string,
  projectId: string,
  filePath: string,
  options?: any
) {
  // Step 1: Verify file exists
  const { fileExists } = await import("@/lib/project-fs")
  const exists = await fileExists(userId, projectId, filePath)
  
  if (!exists) {
    return NextResponse.json({ error: "Source file not found" }, { status: 404 })
  }

  // Create AI version filename
  const baseName = filePath.replace('.md', '')
  const aiFilePath = `${baseName}_AI.md`

  return NextResponse.json({
    success: true,
    message: "Chapter generation workflow started",
    workflow: "chapter-generation",
    steps: [
      { step: 1, name: "duplicate", status: "pending", output: aiFilePath },
      { step: 2, name: "analyze", status: "pending" },
      { step: 3, name: "split", status: "pending" },
      { step: 4, name: "write_sections", status: "pending" },
      { step: 5, name: "compare_merge", status: "pending" }
    ],
    data: {
      sourceFile: filePath,
      targetFile: aiFilePath,
      message: "Il workflow di generazione capitolo è stato avviato. L'AI analizzerà il tuo abbozzo e genererà una versione in bella."
    }
  })
}

// Character Generation Workflow
async function executeCharacterGenerationWorkflow(
  userId: string,
  projectId: string,
  options?: any
) {
  const notesFile = "characters/appunti_personaggi.txt"

  return NextResponse.json({
    success: true,
    message: "Character generation workflow started",
    workflow: "character-generation",
    steps: [
      { step: 1, name: "read_outline", status: "pending" },
      { step: 2, name: "read_characters", status: "pending" },
      { step: 3, name: "create_notes", status: "pending", output: notesFile },
      { step: 4, name: "generate_new", status: "pending" },
      { step: 5, name: "cleanup", status: "pending" }
    ],
    data: {
      notesFile,
      message: "Il workflow di generazione personaggi è stato avviato. L'AI analizzerà l'outline e i personaggi esistenti per crearne di nuovi."
    }
  })
}

// Dialog Generation Workflow
async function executeDialogGenerationWorkflow(
  userId: string,
  projectId: string,
  options?: any
) {
  return NextResponse.json({
    success: true,
    message: "Dialog generation prompt ready",
    workflow: "dialog-generation",
    prompt: "Genera un dialogo realistico tra i personaggi del progetto. Considera le personalità, le motivazioni e le relazioni tra i personaggi. Il dialogo deve essere naturale e rivelare qualcosa di importante sulla trama o sui personaggi.",
    data: {
      message: "Prompt per generazione dialogo pronto. Usa questo prompt nella chat per generare un dialogo."
    }
  })
}

// Scene Description Workflow
async function executeSceneDescriptionWorkflow(
  userId: string,
  projectId: string,
  options?: any
) {
  return NextResponse.json({
    success: true,
    message: "Scene description prompt ready",
    workflow: "scene-description",
    prompt: "Descrivi una scena vivida e immersiva per il romanzo. Considera l'ambientazione, l'atmosfera, i sensi (vista, udito, olfatto, tatto, gusto) e come la scena contribuisce alla trama o allo sviluppo dei personaggi.",
    data: {
      message: "Prompt per descrizione scena pronto. Usa questo prompt nella chat per descrivere una scena."
    }
  })
}

// Text Review Workflow
async function executeTextReviewWorkflow(
  userId: string,
  projectId: string,
  filePath: string,
  options?: any
) {
  if (!filePath) {
    return NextResponse.json({ error: "File path required" }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    message: "Text review workflow ready",
    workflow: "text-review",
    prompt: `Revisiona e migliora il testo del file "${filePath}". Correggi errori grammaticali, migliora lo stile, rendi il testo più scorrevole e coinvolgente, mantenendo intatto il significato originale.`,
    data: {
      filePath,
      message: "Prompt per revisione testo pronto. Usa questo prompt nella chat per revisionare il testo selezionato."
    }
  })
}
