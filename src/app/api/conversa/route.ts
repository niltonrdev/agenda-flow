import { ehConfirmacaoPendente } from "@/domain/confirmacao";
import { processarTurno } from "@/domain/entrada-conversa";
import { FUSO_DONO } from "@/domain/fuso";
import { obterCalendario } from "@/lib/calendario-app";
import { DateTime } from "luxon";
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
    const saida = await processarTurno(
      {
        mensagem: corpo.mensagem,
        agora,
        confirmacaoPendente: ehConfirmacaoPendente(corpo.confirmacaoPendente)
          ? corpo.confirmacaoPendente
          : null,
      },
      obterCalendario(agora),
    );

    return NextResponse.json({
      texto: saida.texto,
      confirmacaoPendente: saida.confirmacaoPendente,
    });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível consultar o Calendário. Tente de novo." },
      { status: 500 },
    );
  }
}
