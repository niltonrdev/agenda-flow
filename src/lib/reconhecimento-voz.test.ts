import {
  criarSessaoReconhecimento,
  mensagemErroReconhecimento,
  suportaReconhecimentoVoz,
  textoDoResultado,
  type SpeechRecognitionLike,
} from "@/lib/reconhecimento-voz";
import { describe, expect, it, vi } from "vitest";

class FakeRecognition implements SpeechRecognitionLike {
  static ultimo: FakeRecognition | null = null;
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: ((ev: Event) => void) | null = null;
  onresult: SpeechRecognitionLike["onresult"] = null;
  onerror: SpeechRecognitionLike["onerror"] = null;
  onend: ((ev: Event) => void) | null = null;

  constructor() {
    FakeRecognition.ultimo = this;
  }

  start() {
    this.onstart?.(new Event("start"));
  }

  stop() {
    this.onend?.(new Event("end"));
  }

  abort() {
    this.onend?.(new Event("end"));
  }

  emitir(transcript: string, isFinal = true) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal, 0: { transcript } }],
    });
  }
}

function janelaComReconhecimento() {
  FakeRecognition.ultimo = null;
  return {
    webkitSpeechRecognition: FakeRecognition,
  } as unknown as Window & typeof globalThis;
}

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

  it("entrega o texto enquanto a sessão está viva", () => {
    const aoFinal = vi.fn();
    const sessao = criarSessaoReconhecimento({
      win: janelaComReconhecimento(),
      aoFinal,
    });
    sessao!.iniciar();
    FakeRecognition.ultimo!.emitir("reunião amanhã");
    expect(aoFinal).toHaveBeenCalledWith("reunião amanhã");
  });

  it("ignora onresult depois de parar a sessão", () => {
    const aoParcial = vi.fn();
    const aoFinal = vi.fn();
    const sessao = criarSessaoReconhecimento({
      win: janelaComReconhecimento(),
      aoParcial,
      aoFinal,
    });
    expect(sessao).not.toBeNull();

    sessao!.iniciar();
    const idAtiva = sessao!.id();
    expect(idAtiva).toBeGreaterThan(0);
    FakeRecognition.ultimo!.emitir("texto na hora");
    expect(aoFinal).toHaveBeenCalledWith("texto na hora");

    sessao!.parar();
    aoFinal.mockClear();
    aoParcial.mockClear();
    FakeRecognition.ultimo!.emitir("texto atrasado");
    FakeRecognition.ultimo!.emitir("parcial atrasado", false);

    expect(aoFinal).not.toHaveBeenCalled();
    expect(aoParcial).not.toHaveBeenCalled();
    expect(sessao!.id()).toBe(idAtiva);
  });
});
