import { RESPOSTA_DEMONSTRACAO_SOMENTE_LEITURA } from "@/adapters/calendario-em-memoria";
import { processarTurno } from "@/domain/entrada-conversa";
import {
  FalhaDoCalendario,
  RESPOSTA_NAO_GRAVADO,
  falhaDoCalendario,
} from "@/domain/falha-calendario";
import { FUSO_DONO } from "@/domain/fuso";
import { comCachePrivado } from "@/lib/cabecalhos-privados";
import { obterCalendario } from "@/lib/calendario-app";
import { pedidoDeEscritaSeguro } from "@/lib/csrf";
import {
  cookiesOAuth,
  credencialGoogleConfigurada,
  desserializarSessao,
  opcoesCookieApagado,
  opcoesCookiePropostaAgora,
  opcoesCookieSessaoAgora,
  segredoDaSessao,
  serializarSessao,
  type TokensGoogle,
} from "@/lib/google-oauth";
import {
  LIMITE_CORPO_BYTES,
  LIMITE_MENSAGEM_CARACTERES,
  RATE_CONVERSA_POR_MINUTO,
} from "@/lib/limites";
import {
  digitalSessao,
  emitirProposta,
  resolverConfirmacaoPendente,
} from "@/lib/proposta-servidor";
import { chaveCliente, consumirRateLimit } from "@/lib/rate-limit";
import { DateTime } from "luxon";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function httpDaFalha(codigo: string | null | undefined): number {
  if (codigo === "reconectar") return 401;
  if (codigo === "permissao") return 403;
  if (codigo === "configuracao") return 503;
  return 200;
}

function respostaJson(
  corpo: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): NextResponse {
  const resposta = NextResponse.json(corpo, init);
  return comCachePrivado(resposta);
}

function apagarSessaoEProposta(resposta: NextResponse) {
  resposta.cookies.set(
    cookiesOAuth.sessao,
    "",
    opcoesCookieApagado(cookiesOAuth.opcoesSessao),
  );
  resposta.cookies.set(
    cookiesOAuth.proposta,
    "",
    opcoesCookieApagado(cookiesOAuth.opcoesProposta),
  );
}

export async function POST(request: Request) {
  try {
    if (!pedidoDeEscritaSeguro(request)) {
      return respostaJson({ erro: "Pedido rejeitado." }, { status: 403 });
    }

    const limite = consumirRateLimit(
      `conversa:${chaveCliente(request)}`,
      RATE_CONVERSA_POR_MINUTO,
    );
    if (!limite.ok) {
      return respostaJson(
        { erro: "Muitas tentativas. Espere um pouco e tente de novo." },
        {
          status: 429,
          headers: { "Retry-After": String(limite.retryAfterS) },
        },
      );
    }

    const bruto = await request.text();
    if (bruto.length > LIMITE_CORPO_BYTES) {
      return respostaJson({ erro: "Pedido grande demais." }, { status: 413 });
    }

    let corpo: {
      mensagem?: unknown;
      confirmacaoPendente?: unknown;
      ultimoDiaConsultado?: unknown;
    };
    try {
      corpo = JSON.parse(bruto) as typeof corpo;
    } catch {
      return respostaJson({ erro: "JSON inválido." }, { status: 400 });
    }

    if (typeof corpo.mensagem !== "string" || corpo.mensagem.trim() === "") {
      return respostaJson(
        { erro: "Envie uma Mensagem em texto." },
        { status: 400 },
      );
    }
    if (corpo.mensagem.length > LIMITE_MENSAGEM_CARACTERES) {
      return respostaJson({ erro: "Mensagem longa demais." }, { status: 400 });
    }

    let secret: string;
    try {
      secret = segredoDaSessao();
    } catch {
      const falha = falhaDoCalendario("configuracao");
      return respostaJson(
        { erro: falha.message, falha: falha.codigo },
        { status: 503 },
      );
    }

    const agora = DateTime.now().setZone(FUSO_DONO);
    const jar = await cookies();
    const tokens = credencialGoogleConfigurada()
      ? desserializarSessao(jar.get(cookiesOAuth.sessao)?.value, secret)
      : null;

    let tokensAtualizados: TokensGoogle | null = null;
    const calendario = obterCalendario({
      agora,
      tokens,
      aoRenovarTokens: (renovados) => {
        tokensAtualizados = {
          ...renovados,
          iat: tokens?.iat,
          exp: tokens?.exp,
          email: tokens?.email ?? null,
        };
      },
    });

    const digital = digitalSessao(tokens?.refreshToken);
    const confirmacaoPendente = resolverConfirmacaoPendente(
      jar.get(cookiesOAuth.proposta)?.value,
      corpo.confirmacaoPendente,
      digital,
      secret,
    );

    const saida = await processarTurno(
      {
        mensagem: corpo.mensagem,
        agora,
        confirmacaoPendente,
        ultimoDiaConsultado:
          typeof corpo.ultimoDiaConsultado === "string"
            ? corpo.ultimoDiaConsultado
            : null,
      },
      calendario,
    );

    const status = httpDaFalha(saida.falha);
    const corpoResposta =
      status === 200
        ? {
            texto: saida.texto,
            confirmacaoPendente: saida.confirmacaoPendente,
            ultimoDiaConsultado: saida.ultimoDiaConsultado ?? null,
            diaParaCalendario: saida.diaParaCalendario ?? null,
            falha: saida.falha ?? null,
          }
        : { erro: saida.texto, falha: saida.falha };

    const resposta = respostaJson(corpoResposta, { status });

    if (saida.falha === "reconectar") {
      apagarSessaoEProposta(resposta);
      return resposta;
    }

    if (saida.confirmacaoPendente) {
      resposta.cookies.set(
        cookiesOAuth.proposta,
        emitirProposta(saida.confirmacaoPendente, digital, secret),
        opcoesCookiePropostaAgora(),
      );
    } else {
      resposta.cookies.set(
        cookiesOAuth.proposta,
        "",
        opcoesCookieApagado(cookiesOAuth.opcoesProposta),
      );
    }

    if (tokens) {
      const vigentes = tokensAtualizados ?? tokens;
      resposta.cookies.set(
        cookiesOAuth.sessao,
        serializarSessao(
          {
            ...vigentes,
            iat: tokens.iat,
            exp: tokens.exp,
            email: vigentes.email ?? tokens.email ?? null,
          },
          secret,
        ),
        opcoesCookieSessaoAgora(),
      );
    }

    return resposta;
  } catch (erro) {
    if (
      erro instanceof FalhaDoCalendario &&
      erro.message === RESPOSTA_DEMONSTRACAO_SOMENTE_LEITURA
    ) {
      const comCredencial = credencialGoogleConfigurada();
      return respostaJson(
        {
          erro: erro.message,
          falha: comCredencial ? "reconectar" : "permissao",
        },
        { status: comCredencial ? 401 : 403 },
      );
    }
    const falha =
      erro instanceof FalhaDoCalendario ? erro.codigo : "temporaria";
    const mensagem =
      erro instanceof FalhaDoCalendario ? erro.message : RESPOSTA_NAO_GRAVADO;
    const status = falha === "temporaria" ? 500 : httpDaFalha(falha);
    const resposta = respostaJson(
      { erro: mensagem, falha },
      { status: status === 200 ? 500 : status },
    );
    if (falha === "reconectar") {
      apagarSessaoEProposta(resposta);
    }
    return resposta;
  }
}
