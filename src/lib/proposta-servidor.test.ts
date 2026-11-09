import { emitirProposta, lerProposta, resolverConfirmacaoPendente } from "@/lib/proposta-servidor";
import type { ConfirmacaoPendente } from "@/domain/confirmacao";
import { describe, expect, it } from "vitest";

const SECRET = "segredo-de-teste-com-32-bytes-ok!";
const PROPOSTA: ConfirmacaoPendente = {
  acao: "cancelar_pontual",
  id: "primary:evt-secreto",
  titulo: "Reunião",
  inicio: "2025-11-15T15:00:00.000-03:00",
  fim: "2025-11-15T16:00:00.000-03:00",
};

describe("proposta pendente no servidor", () => {
  it("emite e lê de volta a proposta da sessão", () => {
    const pacote = emitirProposta(PROPOSTA, "sessao-a", SECRET, 1_000);
    expect(lerProposta(pacote, "sessao-a", SECRET, 2_000)).toEqual(PROPOSTA);
  });

  it("rejeita proposta de outra sessão, expirada ou adulterada", () => {
    const agora = 1_000;
    const pacote = emitirProposta(PROPOSTA, "sessao-a", SECRET, agora);
    expect(lerProposta(pacote, "sessao-b", SECRET, agora + 1)).toBeNull();
    expect(lerProposta(pacote, "sessao-a", SECRET, agora + 16 * 60 * 1000)).toBeNull();
    expect(lerProposta(pacote.slice(0, -3) + "zzz", "sessao-a", SECRET, agora + 1)).toBeNull();
  });

  it("ignora confirmação forjada no corpo do cliente", () => {
    const pacote = emitirProposta(PROPOSTA, "demo", SECRET, 1_000);
    const forjada: ConfirmacaoPendente = {
      ...PROPOSTA,
      id: "escondida:evento-alheio",
    };
    expect(
      resolverConfirmacaoPendente(pacote, forjada, "demo", SECRET, 2_000),
    ).toEqual(PROPOSTA);
    expect(
      resolverConfirmacaoPendente(undefined, forjada, "demo", SECRET, 2_000),
    ).toBeNull();
  });
});
