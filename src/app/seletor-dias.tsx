"use client";

import { FUSO_DONO, NOMES_MESES_PT } from "@/domain/fuso";
import {
  aplicarToqueNoDia,
  celulasDoMes,
  diaEstaNoIntervalo,
  extremosDaSelecao,
  mensagemDoIntervalo,
  type SelecaoDias,
} from "@/lib/seletor-dias";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

type Props = {
  diaSugerido?: string;
  onConfirmar: (mensagem: string) => void;
};

export function SeletorDiasPeriodo({ diaSugerido, onConfirmar }: Props) {
  const inicial = DateTime.fromISO(
    diaSugerido ?? DateTime.now().setZone(FUSO_DONO).toISODate()!,
    { zone: FUSO_DONO },
  );
  const [cursor, setCursor] = useState({ year: inicial.year, month: inicial.month });
  const [selecao, setSelecao] = useState<SelecaoDias | null>(
    diaSugerido ? { inicio: diaSugerido } : null,
  );

  const celulas = useMemo(
    () => celulasDoMes(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );
  const extremos = selecao ? extremosDaSelecao(selecao) : null;

  return (
    <div className="seletor-dias" role="group" aria-label="Escolher dias da viagem">
      <div className="seletor-dias-topo">
        <button
          type="button"
          className="seletor-dias-nav"
          onClick={() =>
            setCursor((atual) => {
              const d = DateTime.fromObject(atual, { zone: FUSO_DONO }).minus({
                months: 1,
              });
              return { year: d.year, month: d.month };
            })
          }
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <p className="seletor-dias-mes">
          {NOMES_MESES_PT[cursor.month].replace(/^./u, (l) =>
            l.toLocaleUpperCase("pt-BR"),
          )}{" "}
          de {cursor.year}
        </p>
        <button
          type="button"
          className="seletor-dias-nav"
          onClick={() =>
            setCursor((atual) => {
              const d = DateTime.fromObject(atual, { zone: FUSO_DONO }).plus({
                months: 1,
              });
              return { year: d.year, month: d.month };
            })
          }
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>
      <div className="seletor-dias-semana">
        {DIAS_SEMANA.map((rotulo, i) => (
          <span key={`${rotulo}-${i}`}>{rotulo}</span>
        ))}
      </div>
      <div className="seletor-dias-grade">
        {celulas.map((celula) => {
          const escolhido = extremos
            ? diaEstaNoIntervalo(celula.iso, extremos.primeiroDia, extremos.ultimoDia)
            : false;
          const ponta =
            extremos &&
            (celula.iso === extremos.primeiroDia || celula.iso === extremos.ultimoDia);
          return (
            <button
              key={celula.iso}
              type="button"
              className={[
                "seletor-dias-dia",
                celula.foraDoMes ? "seletor-dias-fora" : "",
                escolhido ? "seletor-dias-escolhido" : "",
                ponta ? "seletor-dias-ponta" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setSelecao((atual) => aplicarToqueNoDia(atual, celula.iso))}
            >
              {celula.diaDoMes}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="conversa-sim seletor-dias-usar"
        disabled={!selecao}
        onClick={() => {
          if (!selecao) return;
          const { primeiroDia, ultimoDia } = extremosDaSelecao(selecao);
          onConfirmar(mensagemDoIntervalo(primeiroDia, ultimoDia));
        }}
      >
        Usar estes dias
      </button>
    </div>
  );
}
