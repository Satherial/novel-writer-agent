import { NextResponse } from "next/server"

export async function GET() {
  console.log("[TEST] Test API endpoint hit")
  return NextResponse.json({ message: "Test API working", timestamp: new Date().toISOString() })
}

export async function POST(request: Request) {
  console.log("[TEST] Test POST endpoint hit")
  const body = await request.text()
  console.log("[TEST] Request body:", body)
  
  return NextResponse.json({ 
    message: "Test POST working", 
    body: body,
    timestamp: new Date().toISOString() 
  })
}
