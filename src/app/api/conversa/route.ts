import { ehConfirmacaoPendente } from "@/domain/confirmacao";
import { processarTurno } from "@/domain/entrada-conversa";
import { FalhaDoCalendario, RESPOSTA_NAO_GRAVADO } from "@/domain/falha-calendario";
import { FUSO_DONO } from "@/domain/fuso";
import { obterCalendario } from "@/lib/calendario-app";
import {
  cookiesOAuth,
  credencialGoogleConfigurada,
  desserializarSessao,
  segredoDaSessao,
  serializarSessao,
  type TokensGoogle,
} from "@/lib/google-oauth";
import { DateTime } from "luxon";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const corpo = (await request.json()) as {
      mensagem?: unknown;
      confirmacaoPendente?: unknown;
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
        tokensAtualizados = renovados;
      },
    });

    const saida = await processarTurno(
      {
        mensagem: corpo.mensagem,
        agora,
        confirmacaoPendente: ehConfirmacaoPendente(corpo.confirmacaoPendente)
          ? corpo.confirmacaoPendente
          : null,
      },
      calendario,
    );

    const resposta = NextResponse.json({
      texto: saida.texto,
      confirmacaoPendente: saida.confirmacaoPendente,
    });

    if (tokensAtualizados) {
      resposta.cookies.set(
        cookiesOAuth.sessao,
        serializarSessao(tokensAtualizados, segredoDaSessao()),
        cookiesOAuth.opcoesSessao,
      );
    }

    return resposta;
  } catch (erro) {
    const mensagem =
      erro instanceof FalhaDoCalendario ? erro.message : RESPOSTA_NAO_GRAVADO;
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
