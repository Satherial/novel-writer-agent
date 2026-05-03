import { auth } from "@/lib/auth"
import { prisma } from "../../../../../prisma/config"
import { NextResponse } from "next/server"

// GET /api/chat/history?projectId=xxx - Get chat history
export async function GET(request: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId") || null

  try {
    // Get all messages for this user and project (or dashboard if projectId is null)
    const messages = await prisma.chatMessage.findMany({
      where: {
        userId,
        projectId: projectId || null, // null for dashboard chat
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Format messages for the frontend
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content || "",
      createdAt: msg.createdAt.toISOString(),
    }))

    return NextResponse.json({ messages: formattedMessages })
  } catch (error: any) {
    console.error("[Chat History] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to load chat history" },
      { status: 500 }
    )
  }
}
