import type { ConfirmacaoPendente } from "@/domain/confirmacao";
import { processarTurno } from "@/domain/entrada-conversa";
import { FUSO_DONO } from "@/domain/fuso";
import { obterCalendario } from "@/lib/calendario-app";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";

function lerProposta(valor: unknown): ConfirmacaoPendente | null {
  if (!valor || typeof valor !== "object") return null;
  const proposta = valor as Partial<ConfirmacaoPendente>;
  if (proposta.tipo === "periodo") {
    if (
      typeof proposta.titulo !== "string" ||
      typeof proposta.primeiroDia !== "string" ||
      typeof proposta.ultimoDia !== "string"
    ) {
      return null;
    }
    return {
      tipo: "periodo",
      titulo: proposta.titulo,
      primeiroDia: proposta.primeiroDia,
      ultimoDia: proposta.ultimoDia,
    };
  }
  if (proposta.tipo === "pontual") {
    if (
      typeof proposta.titulo !== "string" ||
      typeof proposta.inicio !== "string" ||
      typeof proposta.fim !== "string"
    ) {
      return null;
    }
    return {
      tipo: "pontual",
      titulo: proposta.titulo,
      inicio: proposta.inicio,
      fim: proposta.fim,
    };
  }
  return null;
}

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
        confirmacaoPendente: lerProposta(corpo.confirmacaoPendente),
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
