import { auth } from "@/lib/auth"
import { prisma } from "../../../../../prisma/config"
import { NextResponse } from "next/server"

// POST /api/chat/message - Save a chat message
export async function POST(request: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const body = await request.json()
    const { projectId, role, content, toolCalls, toolResults } = body

    // Validate required fields
    if (!role || !content) {
      return NextResponse.json(
        { error: "Missing required fields: role and content" },
        { status: 400 }
      )
    }

    // Save message to database
    const message = await prisma.chatMessage.create({
      data: {
        userId,
        projectId: projectId || null, // null for dashboard chat
        role,
        content,
        toolCalls: toolCalls || null,
        toolResults: toolResults || null,
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      }
    })
  } catch (error: any) {
    console.error("[Chat Message] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save message" },
      { status: 500 }
    )
  }
}
