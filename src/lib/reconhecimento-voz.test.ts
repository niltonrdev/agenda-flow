import {
  mensagemErroReconhecimento,
  suportaReconhecimentoVoz,
  textoDoResultado,
} from "@/lib/reconhecimento-voz";
import { describe, expect, it } from "vitest";

describe("reconhecimento de voz", () => {
  it("detecta ausência da API", () => {
    expect(
      suportaReconhecimentoVoz({} as Window & typeof globalThis),
    ).toBe(false);
  });

  it("detecta webkitSpeechRecognition", () => {
    const win = {
      webkitSpeechRecognition: class {},
    } as unknown as Window & typeof globalThis;
    expect(suportaReconhecimentoVoz(win)).toBe(true);
  });

  it("separa texto final e parcial do resultado", () => {
    expect(
      textoDoResultado({
        resultIndex: 0,
        results: [
          { isFinal: true, 0: { transcript: "reunião com a Ana " } },
          { isFinal: false, 0: { transcript: "amanhã às " } },
        ],
      }),
    ).toEqual({
      final: "reunião com a Ana",
      parcial: "amanhã às",
    });
  });

  it("explica permissão negada em português", () => {
    expect(mensagemErroReconhecimento("not-allowed")).toMatch(/microfone/i);
  });
});
