import {
  LIMIAR_TOQUE_MS,
  acaoAoSoltarMicrofone,
  destinoDoGestoMicrofone,
  mostraAcoesGravacaoTravada,
} from "@/lib/gesto-microfone";
import { describe, expect, it } from "vitest";

const ORIGEM = { x: 200, y: 400 };

describe("gesto do microfone no estilo WhatsApp", () => {
  it("perto da origem continua segurando", () => {
    expect(destinoDoGestoMicrofone(ORIGEM, { x: 210, y: 390 })).toBe("segurar");
  });

  it("arrastar para cima trava a gravação", () => {
    expect(destinoDoGestoMicrofone(ORIGEM, { x: 200, y: 330 })).toBe("trava");
  });

  it("arrastar para a esquerda cancela; para a direita não", () => {
    expect(destinoDoGestoMicrofone(ORIGEM, { x: 120, y: 400 })).toBe("cancela");
    expect(destinoDoGestoMicrofone(ORIGEM, { x: 280, y: 405 })).toBe("segurar");
  });

  it("o eixo dominante ganha quando o dedo sobe na diagonal", () => {
    expect(destinoDoGestoMicrofone(ORIGEM, { x: 170, y: 320 })).toBe("trava");
  });

  it("toque curto sem arraste deixa a gravação em mãos livres", () => {
    expect(acaoAoSoltarMicrofone("segurar", 80)).toBe("manter");
    expect(acaoAoSoltarMicrofone("segurar", LIMIAR_TOQUE_MS - 1)).toBe("manter");
  });

  it("segurar além do limiar e soltar sem arraste finaliza", () => {
    expect(acaoAoSoltarMicrofone("segurar", LIMIAR_TOQUE_MS)).toBe("parar");
    expect(acaoAoSoltarMicrofone("segurar", 800)).toBe("parar");
  });

  it("arrastar para cima trava mesmo num toque rápido; esquerda cancela", () => {
    expect(acaoAoSoltarMicrofone("trava", 50)).toBe("manter");
    expect(acaoAoSoltarMicrofone("trava", 800)).toBe("manter");
    expect(acaoAoSoltarMicrofone("cancela", 50)).toBe("cancelar");
    expect(acaoAoSoltarMicrofone("cancela", 800)).toBe("cancelar");
  });

  it("gravação travada mostra Cancelar e Enviar", () => {
    expect(mostraAcoesGravacaoTravada("travado")).toBe(true);
    expect(mostraAcoesGravacaoTravada("segurando")).toBe(false);
    expect(mostraAcoesGravacaoTravada("idle")).toBe(false);
  });
});
