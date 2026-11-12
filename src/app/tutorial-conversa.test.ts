import {
  CHAVE_TUTORIAL_VISTO,
  PASSOS_TUTORIAL,
  deveMostrarTutorialAutomatico,
  ehUltimoPasso,
  gravarTutorialVisto,
  indiceAposProximo,
  indiceAposVoltar,
  textoProgresso,
  tutorialJaVisto,
} from "@/app/tutorial-conversa";
import { describe, expect, it } from "vitest";

function storageMemoria(inicial: Record<string, string> = {}) {
  const dados = { ...inicial };
  return {
    getItem(chave: string) {
      return dados[chave] ?? null;
    },
    setItem(chave: string, valor: string) {
      dados[chave] = valor;
    },
  };
}

describe("tutorial de primeiro acesso", () => {
  it("abre no primeiro acesso e some depois de concluído ou pulado", () => {
    const storage = storageMemoria();
    expect(deveMostrarTutorialAutomatico(storage)).toBe(true);
    expect(tutorialJaVisto(storage)).toBe(false);

    gravarTutorialVisto(storage);

    expect(storage.getItem(CHAVE_TUTORIAL_VISTO)).toBe("1");
    expect(deveMostrarTutorialAutomatico(storage)).toBe(false);
    expect(tutorialJaVisto(storage)).toBe(true);
  });

  it("navega entre os passos com progresso 1 de 5 até 5 de 5", () => {
    expect(PASSOS_TUTORIAL).toHaveLength(5);
    expect(PASSOS_TUTORIAL[0]?.exemplo).toBe("Dentista amanhã às 15h");
    expect(PASSOS_TUTORIAL[1]?.texto).toMatch(/Toque no microfone/i);
    expect(PASSOS_TUTORIAL[1]?.texto).toMatch(/mãos livres/i);
    expect(PASSOS_TUTORIAL[1]?.texto).toMatch(/Segure para gravar/i);
    expect(PASSOS_TUTORIAL[1]?.texto).toMatch(/Arraste para cima/i);
    expect(PASSOS_TUTORIAL[1]?.texto).toMatch(/esquerda/i);
    expect(PASSOS_TUTORIAL[1]?.texto).not.toMatch(/solte para enviar/i);
    expect(PASSOS_TUTORIAL[0]?.texto).toMatch(/seta de enviar/i);

    expect(textoProgresso(0)).toBe("1 de 5");
    expect(indiceAposProximo(0)).toBe(1);
    expect(textoProgresso(1)).toBe("2 de 5");
    expect(indiceAposVoltar(1)).toBe(0);
    expect(indiceAposVoltar(0)).toBe(0);
    expect(indiceAposProximo(4)).toBe(4);
    expect(ehUltimoPasso(4)).toBe(true);
    expect(ehUltimoPasso(3)).toBe(false);
  });

  it("descreve só o que o app faz: Sim na Confirmação, alterar/cancelar falando, Google e demonstração só consulta", () => {
    const textos = PASSOS_TUTORIAL.map((p) => `${p.titulo} ${p.texto}`).join(" ");
    expect(textos).toMatch(/Sim para gravar/i);
    expect(textos).toMatch(/cancela a reunião da Ana/i);
    expect(textos).toMatch(/muda a reunião da Ana/i);
    expect(textos).toMatch(/Continuar com Google/i);
    expect(textos).toMatch(/demonstração isso não grava/i);
  });
});
