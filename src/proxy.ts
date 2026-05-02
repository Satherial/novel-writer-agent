import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(req: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  
  return NextResponse.next()
}

// Configurazione per Next.js 16 - runtime Node.js
export const config = {
  matcher: ["/dashboard/:path*", "/api/projects/:path*", "/api/chat/:path*"],
}
