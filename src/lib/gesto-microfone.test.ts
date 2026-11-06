import {
  acaoAoSoltarMicrofone,
  destinoDoGestoMicrofone,
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

  it("arrastar para a esquerda ou para a direita cancela", () => {
    expect(destinoDoGestoMicrofone(ORIGEM, { x: 120, y: 400 })).toBe("cancela");
    expect(destinoDoGestoMicrofone(ORIGEM, { x: 280, y: 405 })).toBe("cancela");
  });

  it("o eixo dominante ganha quando o dedo sobe na diagonal", () => {
    expect(destinoDoGestoMicrofone(ORIGEM, { x: 170, y: 320 })).toBe("trava");
  });

  it("soltar sem gesto envia; travado mantém; cancelado descarta", () => {
    expect(acaoAoSoltarMicrofone("segurar")).toBe("enviar");
    expect(acaoAoSoltarMicrofone("trava")).toBe("manter");
    expect(acaoAoSoltarMicrofone("cancela")).toBe("cancelar");
  });
});
