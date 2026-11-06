import { ehConfirmacaoPendente } from "@/domain/confirmacao";
import { processarTurno } from "@/domain/entrada-conversa";
import {
  FalhaDoCalendario,
  RESPOSTA_NAO_GRAVADO,
} from "@/domain/falha-calendario";
import { FUSO_DONO } from "@/domain/fuso";
import { obterCalendario } from "@/lib/calendario-app";
import {
  cookiesOAuth,
  credencialGoogleConfigurada,
  desserializarSessao,
  opcoesCookieApagado,
  opcoesCookieSessaoAgora,
  segredoDaSessao,
  serializarSessao,
  type TokensGoogle,
} from "@/lib/google-oauth";
import { DateTime } from "luxon";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function httpDaFalha(codigo: string | null | undefined): number {
  if (codigo === "reconectar") return 401;
  if (codigo === "permissao") return 403;
  if (codigo === "configuracao") return 503;
  return 200;
}

export async function POST(request: Request) {
  try {
    const corpo = (await request.json()) as {
      mensagem?: unknown;
      confirmacaoPendente?: unknown;
      ultimoDiaConsultado?: unknown;
    };

    if (typeof corpo.mensagem !== "string" || corpo.mensagem.trim() === "") {
      return NextResponse.json(
        { erro: "Envie uma Mensagem em texto." },
        { status: 400 },
      );
    }

    const agora = DateTime.now().setZone(FUSO_DONO);
    const jar = await cookies();
    const tokens = credencialGoogleConfigurada()
      ? desserializarSessao(
          jar.get(cookiesOAuth.sessao)?.value,
          segredoDaSessao(),
        )
      : null;

    let tokensAtualizados: TokensGoogle | null = null;
    const calendario = obterCalendario({
      agora,
      tokens,
      aoRenovarTokens: (renovados) => {
        tokensAtualizados = { ...renovados, email: tokens?.email ?? null };
      },
    });

    const saida = await processarTurno(
      {
        mensagem: corpo.mensagem,
        agora,
        confirmacaoPendente: ehConfirmacaoPendente(corpo.confirmacaoPendente)
          ? corpo.confirmacaoPendente
          : null,
        ultimoDiaConsultado:
          typeof corpo.ultimoDiaConsultado === "string"
            ? corpo.ultimoDiaConsultado
            : null,
      },
      calendario,
    );

    let texto = saida.texto;
    if (
      !tokens &&
      /^Marquei\b/u.test(texto) &&
      !/demonstra/iu.test(texto)
    ) {
      texto = texto.replace(
        /\.\s*$/u,
        " no calendário de demonstração.",
      );
    }

    const status = httpDaFalha(saida.falha);
    const corpoResposta =
      status === 200
        ? {
            texto,
            confirmacaoPendente: saida.confirmacaoPendente,
            ultimoDiaConsultado: saida.ultimoDiaConsultado ?? null,
            diaParaCalendario: saida.diaParaCalendario ?? null,
            falha: saida.falha ?? null,
          }
        : { erro: texto, falha: saida.falha };

    const resposta = NextResponse.json(corpoResposta, { status });

    if (saida.falha === "reconectar") {
      resposta.cookies.set(
        cookiesOAuth.sessao,
        "",
        opcoesCookieApagado(cookiesOAuth.opcoesSessao),
      );
    } else if (tokensAtualizados) {
      resposta.cookies.set(
        cookiesOAuth.sessao,
        serializarSessao(tokensAtualizados, segredoDaSessao()),
        opcoesCookieSessaoAgora(),
      );
    }

    return resposta;
  } catch (erro) {
    const falha =
      erro instanceof FalhaDoCalendario ? erro.codigo : "temporaria";
    const mensagem =
      erro instanceof FalhaDoCalendario ? erro.message : RESPOSTA_NAO_GRAVADO;
    const status = falha === "temporaria" ? 500 : httpDaFalha(falha);
    const resposta = NextResponse.json(
      { erro: mensagem, falha },
      { status: status === 200 ? 500 : status },
    );
    if (falha === "reconectar") {
      resposta.cookies.set(
        cookiesOAuth.sessao,
        "",
        opcoesCookieApagado(cookiesOAuth.opcoesSessao),
      );
    }
    return resposta;
  }
}
