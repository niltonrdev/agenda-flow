import { caminhoExigeSessao, decidirRedirectCanonico } from "@/lib/urls-app";
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (caminhoExigeSessao(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const decisao = decidirRedirectCanonico(
    {
      host: request.nextUrl.host,
      pathname,
      search: request.nextUrl.search,
      method: request.method,
    },
    process.env as Record<string, string | undefined>,
  );
  if (decisao.ok) {
    return NextResponse.redirect(decisao.destino, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|webmanifest)$).*)",
  ],
};
