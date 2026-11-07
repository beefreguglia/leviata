import { NextResponse, type NextRequest } from "next/server";

// Checagem otimista: sem cookie de sessão → manda para /login.
// A verificação real (sessão válida + permissões) acontece no layout do painel.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // tudo menos login, api, arquivos estáticos e a identidade visual (ícones, manifest e a
  // imagem da prévia de link precisam abrir sem login para o Discord/celular conseguirem ler)
  matcher: [
    "/((?!login|sem-acesso|api|_next/static|_next/image|favicon.ico|manifest.webmanifest|opengraph-image|apple-icon|icon|brand/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
