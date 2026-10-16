import { authServer, configured } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
async function handle(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!configured())
    return NextResponse.json(
      { message: "O acesso ainda não foi configurado." },
      { status: 503 },
    );
  const handlers = authServer().handler();
  return req.method === "GET"
    ? handlers.GET(req, context)
    : handlers.POST(req, context);
}
export { handle as GET, handle as POST };
