import { RESPOSTA_DEMONSTRACAO_SOMENTE_LEITURA } from "@/adapters/calendario-em-memoria";
import { processarTurno } from "@/domain/entrada-conversa";
import { FalhaDoCalendario, RESPOSTA_NAO_GRAVADO } from "@/domain/falha-calendario";
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

function respostaJson(
  corpo: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): NextResponse {
  const resposta = NextResponse.json(corpo, init);
  return comCachePrivado(resposta);
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

    const agora = DateTime.now().setZone(FUSO_DONO);
    const jar = await cookies();
    const secret = segredoDaSessao();
    const tokens = credencialGoogleConfigurada()
      ? desserializarSessao(jar.get(cookiesOAuth.sessao)?.value, secret)
      : null;

    let tokensAtualizados: TokensGoogle | null = null;
    const calendario = obterCalendario({
      agora,
      tokens,
      aoRenovarTokens: (renovados) => {
        tokensAtualizados = renovados;
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

    const resposta = respostaJson({
      texto: saida.texto,
      confirmacaoPendente: saida.confirmacaoPendente,
      ultimoDiaConsultado: saida.ultimoDiaConsultado ?? null,
      diaParaCalendario: saida.diaParaCalendario ?? null,
    });

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
      const status = credencialGoogleConfigurada() ? 401 : 403;
      return respostaJson({ erro: erro.message }, { status });
    }
    const mensagem =
      erro instanceof FalhaDoCalendario ? erro.message : RESPOSTA_NAO_GRAVADO;
    return respostaJson({ erro: mensagem }, { status: 500 });
  }
}
