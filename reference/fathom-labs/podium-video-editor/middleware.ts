import { NextRequest, NextResponse } from 'next/server'

const isAuthenticated = (request: NextRequest)  => {
  if (request.method === "OPTIONS") return true // Don't authenticate OPTIONS requests, for CORS preflight
  return request.headers.get("x-api-key") == process.env.API_KEY
}

// Limit the middleware to paths starting with `/api/`
export const config = {
  matcher: '/api/:function*',
}
 
export async function middleware(request: NextRequest) {
  // Call our authentication function to check the request
  if (!isAuthenticated(request)) {
    // Respond with JSON indicating an error message
    return new NextResponse(
      JSON.stringify({ success: false, message: 'authentication failed' }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    )
  }
}