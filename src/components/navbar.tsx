"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useChatPanel } from "@/contexts/chat-panel-context"

interface NavbarProps {
  user?: {
    email?: string | null
    name?: string | null
  } | null
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const { chatOpen, toggleChat } = useChatPanel()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  const showChatToggle =
    Boolean(user) &&
    Boolean(pathname) &&
    (pathname === "/dashboard" || pathname.startsWith("/projects/"))

  return (
    <header className="sticky top-0 inset-x-0 flex flex-wrap md:justify-start md:flex-nowrap z-[100] w-full bg-white border-b border-gray-200 text-sm py-2.5">
      <nav className="max-w-[85rem] w-full mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex-none rounded-xl text-xl inline-block font-semibold focus:outline-none focus:opacity-80"
          >
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-gray-800">NovelCraft AI</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user && (
              <>
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex items-center gap-x-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 focus:outline-none"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>

                {showChatToggle && (
                  <button
                    type="button"
                    onClick={() => toggleChat()}
                    aria-pressed={chatOpen}
                    aria-label={chatOpen ? "Nascondi pannello chat" : "Mostra pannello chat"}
                    title={chatOpen ? "Nascondi chat" : "Mostra chat"}
                    className={`inline-flex items-center justify-center size-10 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      chatOpen
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                )}

                <div className="hs-dropdown relative inline-flex [--placement:bottom-end]">
                  <button
                    type="button"
                    className="hs-dropdown-toggle inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                    id="user-dropdown"
                    aria-haspopup="menu"
                    aria-expanded="false"
                  >
                    <span className="px-3 py-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                        {user.name?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                      </span>
                      <span className="hidden sm:inline-block max-w-[140px] truncate">
                        {user.name || user.email}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>

                  <div
                    id="user-dropdown-menu"
                    className="hs-dropdown-menu transition-[opacity,margin] duration-[0.1ms] ease-out hidden min-w-60 max-w-[min(320px,calc(100vw-32px))] z-50 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 divide-y divide-gray-100 py-2"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-dropdown"
                  >
                    <div className="px-3 py-2 text-xs text-gray-500 truncate">{user.email}</div>
                    <div className="p-2">
                      <button
                        type="button"
                        onClick={() => handleSignOut()}
                        className="w-full flex items-center gap-x-3 py-2 px-3 rounded-lg text-sm text-red-600 hover:bg-red-50 focus:outline-none"
                        role="menuitem"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
