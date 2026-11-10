/** @vitest-environment jsdom */

import {
  PASSOS_TUTORIAL,
  ROTULO_AJUDA,
  ROTULO_CONCLUIR,
  ROTULO_PROXIMO,
  ROTULO_PULAR,
  ROTULO_VOLTAR,
} from "@/app/tutorial-conversa";
import { ControleTutorial, TutorialConversa } from "@/app/tutorial-painel";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function dialogAberto() {
  return document.querySelector("[role='dialog']");
}

function clicar(nome: string) {
  const botao = [...document.querySelectorAll("button")].find(
    (b) => b.textContent === nome || b.getAttribute("aria-label") === nome,
  );
  expect(botao).toBeTruthy();
  act(() => {
    botao?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("tutorial na tela", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("mostra o primeiro passo e navega com Próximo e Voltar", () => {
    const onFechar = vi.fn();
    act(() => {
      root.render(<TutorialConversa aberto onFechar={onFechar} />);
    });

    expect(dialogAberto()).not.toBeNull();
    expect(dialogAberto()?.textContent).toContain(PASSOS_TUTORIAL[0]?.titulo);
    expect(dialogAberto()?.textContent).toContain("1 de 5");
    expect(dialogAberto()?.textContent).toContain("Dentista amanhã às 15h");

    clicar(ROTULO_PROXIMO);
    expect(dialogAberto()?.textContent).toContain(PASSOS_TUTORIAL[1]?.titulo);
    expect(dialogAberto()?.textContent).toContain("2 de 5");

    clicar(ROTULO_VOLTAR);
    expect(dialogAberto()?.textContent).toContain(PASSOS_TUTORIAL[0]?.titulo);
    expect(dialogAberto()?.textContent).toContain("1 de 5");
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("Pular e Esc fecham; Concluir no último passo também", () => {
    const onFechar = vi.fn();
    act(() => {
      root.render(<TutorialConversa aberto onFechar={onFechar} />);
    });

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(onFechar).toHaveBeenCalledTimes(1);

    onFechar.mockClear();
    act(() => {
      root.render(<TutorialConversa aberto onFechar={onFechar} />);
    });
    clicar(ROTULO_PULAR);
    expect(onFechar).toHaveBeenCalledTimes(1);

    onFechar.mockClear();
    act(() => {
      root.render(<TutorialConversa aberto onFechar={onFechar} />);
    });
    for (let i = 0; i < PASSOS_TUTORIAL.length - 1; i++) {
      clicar(ROTULO_PROXIMO);
    }
    expect(dialogAberto()?.textContent).toContain("5 de 5");
    clicar(ROTULO_CONCLUIR);
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it("abre sozinho no primeiro acesso, não reabre depois de pular, e o botão de ajuda reabre", () => {
    const storage = storageMemoria();
    act(() => {
      root.render(<ControleTutorial storage={storage} abrirAutomatico />);
    });

    expect(dialogAberto()).not.toBeNull();
    expect(dialogAberto()?.textContent).toContain("1 de 5");

    clicar(ROTULO_PULAR);
    expect(dialogAberto()).toBeNull();
    expect(storage.getItem("agenda-tutorial-visto")).toBe("1");

    act(() => {
      root.render(<ControleTutorial storage={storage} abrirAutomatico />);
    });
    expect(dialogAberto()).toBeNull();

    clicar(ROTULO_AJUDA);
    expect(dialogAberto()).not.toBeNull();
    expect(dialogAberto()?.textContent).toContain(PASSOS_TUTORIAL[0]?.titulo);
  });
});
