import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { stripDiscordIssuer } from "@/lib/oauth-issuer";

export const { POST } = handlers;

export function GET(req: NextRequest) {
  const fixed = stripDiscordIssuer(req.nextUrl.href);
  return handlers.GET(fixed ? new NextRequest(fixed, req) : req);
}
