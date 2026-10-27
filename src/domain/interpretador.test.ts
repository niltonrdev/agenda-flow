import { FUSO_DONO } from "@/domain/fuso";
import {
  interpretarDestinoAlteracao,
  interpretarMensagem,
} from "@/domain/interpretador";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

const AGORA = DateTime.fromObject(
  { year: 2025, month: 8, day: 1, hour: 10, minute: 0 },
  { zone: FUSO_DONO },
);

const AGORA_SETEMBRO = DateTime.fromObject(
  { year: 2025, month: 9, day: 1, hour: 10, minute: 0 },
  { zone: FUSO_DONO },
);

describe("interpretador — Consulta de intervalo", () => {
  it("do dia 4 ao 7, no mês corrente futuro, cobre os quatro dias inclusive", () => {
    const intencao = interpretarMensagem("do dia 4 ao 7", AGORA_SETEMBRO);

    expect(intencao).toEqual({
      tipo: "consulta_intervalo",
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-07",
    });
  });

  it("do dia 4 ao 7 sem mês, em agosto, não salta para setembro", () => {
    const intencao = interpretarMensagem("do dia 4 ao 7", AGORA);

    expect(intencao).toEqual({
      tipo: "consulta_intervalo",
      primeiroDia: "2025-08-04",
      ultimoDia: "2025-08-07",
    });
  });

  it("4 a 7 de setembro usa o mês dito", () => {
    const intencao = interpretarMensagem(
      "pescaria do dia 4 ao 7 de setembro",
      AGORA,
    );

    expect(intencao).toEqual({
      tipo: "consulta_intervalo",
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-07",
    });
  });

  it("intervalo atravessando o mês resolve os dois extremos", () => {
    const intencao = interpretarMensagem(
      "de 30 de agosto a 2 de setembro",
      AGORA,
    );

    expect(intencao).toEqual({
      tipo: "consulta_intervalo",
      primeiroDia: "2025-08-30",
      ultimoDia: "2025-09-02",
    });
  });

  it("feriado num domingo recorta o sábado e o domingo", () => {
    const intencao = interpretarMensagem("feriado de 7 de setembro", AGORA);

    expect(intencao).toEqual({
      tipo: "consulta_intervalo",
      primeiroDia: "2025-09-06",
      ultimoDia: "2025-09-07",
    });
  });

  it("feriado numa quinta recorta até o domingo (emenda)", () => {
    const intencao = interpretarMensagem("feriado de 20 de novembro", AGORA);

    expect(intencao).toEqual({
      tipo: "consulta_intervalo",
      primeiroDia: "2025-11-20",
      ultimoDia: "2025-11-23",
    });
  });

  it("feriado numa quarta não alarga", () => {
    const intencao = interpretarMensagem("feriado de 1 de outubro", AGORA);

    expect(intencao).toEqual({
      tipo: "consulta_intervalo",
      primeiroDia: "2025-10-01",
      ultimoDia: "2025-10-01",
    });
  });

  it("esse fim de semana numa sexta é sábado e domingo seguintes", () => {
    const sexta = DateTime.fromObject(
      { year: 2025, month: 8, day: 1, hour: 10, minute: 0 },
      { zone: FUSO_DONO },
    );

    expect(interpretarMensagem("esse fim de semana", sexta)).toEqual({
      tipo: "consulta_intervalo",
      primeiroDia: "2025-08-02",
      ultimoDia: "2025-08-03",
    });
  });

  it("fim de semana num sábado é o recorte corrente", () => {
    const sabado = DateTime.fromObject(
      { year: 2025, month: 8, day: 2, hour: 16, minute: 0 },
      { zone: FUSO_DONO },
    );

    expect(interpretarMensagem("fim de semana", sabado)).toEqual({
      tipo: "consulta_intervalo",
      primeiroDia: "2025-08-02",
      ultimoDia: "2025-08-03",
    });
  });

  it("data solta segue consulta de um dia, mesmo num sábado", () => {
    const sexta = DateTime.fromObject(
      { year: 2025, month: 11, day: 14, hour: 10, minute: 0 },
      { zone: FUSO_DONO },
    );

    expect(interpretarMensagem("15 de novembro", sexta)).toEqual({
      tipo: "consulta_dia",
      dia: "2025-11-15",
    });
  });
});

describe("interpretador — Consulta de um dia (formatos)", () => {
  it("15/10 sem ano usa a próxima ocorrência futura", () => {
    const outubro = DateTime.fromObject(
      { year: 2025, month: 10, day: 27, hour: 10, minute: 0 },
      { zone: FUSO_DONO },
    );

    expect(interpretarMensagem("15/10", outubro)).toEqual({
      tipo: "consulta_dia",
      dia: "2026-10-15",
    });
  });

  it("dia 15/10 aceita prefixo dia", () => {
    const outubro = DateTime.fromObject(
      { year: 2025, month: 10, day: 27, hour: 10, minute: 0 },
      { zone: FUSO_DONO },
    );

    expect(interpretarMensagem("dia 15/10", outubro)).toEqual({
      tipo: "consulta_dia",
      dia: "2026-10-15",
    });
  });

  it("15 de novembro de 2027 usa o ano dito", () => {
    expect(interpretarMensagem("15 de novembro de 2027", AGORA)).toEqual({
      tipo: "consulta_dia",
      dia: "2027-11-15",
    });
  });
});

describe("interpretador — Marcação sem horário", () => {
  it("marcar com dia e sem horário pede completar, não consulta", () => {
    expect(
      interpretarMensagem(
        "marcar reunião dia 20 de dezembro com o nilton",
        AGORA,
      ),
    ).toEqual({
      tipo: "marcar_pontual_sem_hora",
      titulo: "Reunião com o nilton",
      dia: "2025-12-20",
    });
  });

  it("Marque com maiúscula também inicia Marcação", () => {
    expect(
      interpretarMensagem("Marque uma reunião dia 20 de dezembro", AGORA),
    ).toEqual({
      tipo: "marcar_pontual_sem_hora",
      titulo: "Reunião",
      dia: "2025-12-20",
    });
  });

  it("marcar sem dia fica incompleta", () => {
    expect(interpretarMensagem("marcar reunião então", AGORA)).toEqual({
      tipo: "marcar_incompleta",
      titulo: "Reunião",
    });
  });

  it("marcar com dia e horário produz Pontual direto", () => {
    const intencao = interpretarMensagem(
      "marcar reunião dia 20 de dezembro às 15h",
      AGORA,
    );
    expect(intencao).toMatchObject({
      tipo: "marcar_pontual",
      titulo: "Reunião",
    });
    if (intencao.tipo !== "marcar_pontual") {
      throw new Error("esperava marcar_pontual");
    }
    expect(intencao.inicio).toContain("2025-12-20T15:00");
  });

  it("29/11 a 01/12 não interpreta o 11 do meio como dia inicial", () => {
    const outubro = DateTime.fromObject(
      { year: 2026, month: 10, day: 27, hour: 16 },
      { zone: FUSO_DONO },
    );
    expect(
      interpretarMensagem(
        "marcar viagem a praia para os dias 29/11 a 01/12",
        outubro,
      ),
    ).toEqual({
      tipo: "marcar_periodo",
      titulo: "Viagem a praia",
      primeiroDia: "2026-11-29",
      ultimoDia: "2026-12-01",
    });
  });

  it("alterar viagem do dia 29/11 sem destino pede completar", () => {
    const outubro = DateTime.fromObject(
      { year: 2026, month: 10, day: 27, hour: 16 },
      { zone: FUSO_DONO },
    );
    expect(interpretarMensagem("alterar viagem do dia 29/11", outubro)).toEqual({
      tipo: "alterar_sem_destino",
      termo: "viagem",
      dia: { dia: 29, mes: 11 },
    });
  });

  it("apagar é Cancelamento", () => {
    expect(interpretarMensagem("apagar viagem 29/11", AGORA)).toEqual({
      tipo: "cancelar",
      termo: "viagem",
      dia: { dia: 29, mes: 11 },
    });
  });

  it.each([
    ["às 5:30", "T05:30"],
    ["as 5:30h", "T05:30"],
    ["às 5 horas", "T05:00"],
    ["às 5 da manhã", "T05:00"],
    ["às 5h", "T05:00"],
  ])("aceita horário %s", (horario, trechoIso) => {
    const intencao = interpretarMensagem(
      `marcar viagem com Nilton 29 de novembro ${horario}`,
      AGORA,
    );
    expect(intencao.tipo).toBe("marcar_pontual");
    if (intencao.tipo !== "marcar_pontual") {
      throw new Error("esperava marcar_pontual");
    }
    expect(intencao.titulo).toBe("Viagem com Nilton");
    expect(intencao.inicio).toContain("2025-11-29");
    expect(intencao.inicio).toContain(trechoIso);
  });
});

describe("interpretador — Alteração", () => {
  it("muda a pescaria para o dia 5 aponta o termo e o novo primeiro dia", () => {
    expect(interpretarMensagem("muda a pescaria para o dia 5", AGORA_SETEMBRO)).toEqual({
      tipo: "alterar",
      termo: "pescaria",
      destino: { tipo: "dia", dia: 5 },
    });
  });

  it("muda um Pontual para outro horário", () => {
    expect(
      interpretarMensagem("muda a reunião com a Ana para as 10h", AGORA),
    ).toEqual({
      tipo: "alterar",
      termo: "reunião com a ana",
      destino: { tipo: "hora", hora: 10, minuto: 0 },
    });
  });

  it("não isolado é recusa da Confirmação", () => {
    expect(interpretarMensagem("não", AGORA)).toEqual({ tipo: "recusar" });
  });

  it("até o dia 8 é o último dia, não um deslocamento", () => {
    expect(interpretarDestinoAlteracao("até o dia 8", AGORA_SETEMBRO)).toEqual({
      tipo: "ultimo_dia",
      ultimoDia: "2025-09-08",
    });
  });
});

describe("interpretador — Cancelamento", () => {
  it("cancela a reunião da Ana aponta o termo, sem recortar dia", () => {
    expect(interpretarMensagem("cancela a reunião da Ana", AGORA)).toEqual({
      tipo: "cancelar",
      termo: "reunião da ana",
    });
  });

  it("tira o dia 5 da pescaria é recorte de um dia, não Cancelamento do Compromisso", () => {
    expect(
      interpretarMensagem("tira o dia 5 da pescaria", AGORA_SETEMBRO),
    ).toEqual({
      tipo: "cancelar",
      termo: "pescaria",
      dia: { dia: 5 },
    });
  });
});
