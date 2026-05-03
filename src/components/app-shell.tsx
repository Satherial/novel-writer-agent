"use client"

import type { ReactNode } from "react"
import Navbar from "@/components/navbar"
import PrelineProvider from "@/components/preline-provider"
import { ChatPanelProvider } from "@/contexts/chat-panel-context"

type SessionUserLike = {
  id?: string
  email?: string | null
  name?: string | null
} | null

export default function AppShell({
  user,
  children,
}: {
  user: SessionUserLike
  children: ReactNode
}) {
  return (
    <ChatPanelProvider>
      <PrelineProvider />
      <Navbar user={user} />
      <main className="h-[calc(100vh-64px)] overflow-hidden">{children}</main>
    </ChatPanelProvider>
  )
}
