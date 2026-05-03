"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type ChatPanelContextValue = {
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  toggleChat: () => void
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null)

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(true)
  const toggleChat = useCallback(() => {
    setChatOpen((v) => !v)
  }, [])

  const value = useMemo(
    () => ({ chatOpen, setChatOpen, toggleChat }),
    [chatOpen, toggleChat]
  )

  return (
    <ChatPanelContext.Provider value={value}>
      {children}
    </ChatPanelContext.Provider>
  )
}

export function useChatPanel(): ChatPanelContextValue {
  const ctx = useContext(ChatPanelContext)
  if (!ctx) {
    throw new Error("useChatPanel must be used within ChatPanelProvider")
  }
  return ctx
}
