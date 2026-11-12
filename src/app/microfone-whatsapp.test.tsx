/** @vitest-environment jsdom */

import {
  DICA_OUVINDO,
  ROTULO_CANCELAR_GRAVACAO,
  ROTULO_ENVIAR,
} from "@/app/conversa-campo";
import { MicrofoneWhatsApp } from "@/app/microfone-whatsapp";
import { LIMIAR_TOQUE_MS } from "@/lib/gesto-microfone";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeRecognition {
  static ultimo: FakeRecognition | null = null;
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: ((ev: Event) => void) | null = null;
  onresult: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
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

function dispararPonteiro(
  alvo: Element,
  tipo: "pointerdown" | "pointermove" | "pointerup",
  ponto: { x: number; y: number },
) {
  alvo.dispatchEvent(
    new PointerEvent(tipo, {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      clientX: ponto.x,
      clientY: ponto.y,
    }),
  );
}

function botaoMicrofone(container: HTMLElement) {
  return container.querySelector("button[aria-pressed]");
}

describe("microfone no compositor", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T10:00:00Z"));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    FakeRecognition.ultimo = null;
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      writable: true,
      value: FakeRecognition,
    });
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
  });

  function renderizar(
    extras: Partial<{
      textoBase: string;
      geracaoCampo: number;
      onTranscricao: (t: string) => void;
      onEnviar: (t: string) => void;
      onFase: (f: string) => void;
    }> = {},
  ) {
    const onTranscricao = extras.onTranscricao ?? vi.fn();
    const onErro = vi.fn();
    const onDica = vi.fn();
    const onEnviar = extras.onEnviar ?? vi.fn();
    act(() => {
      root.render(
        <MicrofoneWhatsApp
          textoBase={extras.textoBase ?? ""}
          geracaoCampo={extras.geracaoCampo ?? 0}
          onTranscricao={onTranscricao}
          onErro={onErro}
          onDica={onDica}
          onEnviar={onEnviar}
        />,
      );
    });
    return { onTranscricao, onEnviar, onErro, onDica };
  }

  it("toque inicia a gravação e continua com Enviar e Cancelar depois de soltar", () => {
    renderizar();
    const botao = botaoMicrofone(container);
    expect(botao).not.toBeNull();

    act(() => {
      dispararPonteiro(botao!, "pointerdown", { x: 200, y: 400 });
    });
    expect(botao?.getAttribute("aria-pressed")).toBe("true");

    act(() => {
      dispararPonteiro(botao!, "pointerup", { x: 200, y: 400 });
    });

    expect(container.textContent).toContain(ROTULO_CANCELAR_GRAVACAO);
    expect(container.textContent).toContain(DICA_OUVINDO);
    expect(
      container.querySelector(`button[aria-label="${ROTULO_ENVIAR}"]`),
    ).not.toBeNull();
  });

  it("segurar grava e soltar finaliza, sem controles de mãos livres", () => {
    renderizar();
    const botao = botaoMicrofone(container)!;

    act(() => {
      dispararPonteiro(botao, "pointerdown", { x: 200, y: 400 });
    });
    act(() => {
      vi.advanceTimersByTime(LIMIAR_TOQUE_MS + 40);
    });
    act(() => {
      dispararPonteiro(botao, "pointerup", { x: 200, y: 400 });
    });

    expect(container.textContent).not.toContain(ROTULO_CANCELAR_GRAVACAO);
    expect(botaoMicrofone(container)?.getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("arrastar para cima trava e continua depois de soltar, com Enviar e Cancelar", () => {
    renderizar();
    const botao = botaoMicrofone(container)!;

    act(() => {
      dispararPonteiro(botao, "pointerdown", { x: 200, y: 400 });
    });
    act(() => {
      vi.advanceTimersByTime(LIMIAR_TOQUE_MS + 40);
      dispararPonteiro(botao, "pointermove", { x: 200, y: 330 });
    });
    act(() => {
      dispararPonteiro(botao, "pointerup", { x: 200, y: 330 });
    });

    expect(container.textContent).toContain(ROTULO_CANCELAR_GRAVACAO);
    expect(container.textContent).toContain(DICA_OUVINDO);
    expect(
      container.querySelector(`button[aria-label="${ROTULO_ENVIAR}"]`),
    ).not.toBeNull();
  });

  it("arrastar para a esquerda cancela e devolve o texto anterior", () => {
    const { onTranscricao } = renderizar({ textoBase: "já escrito" });
    const botao = botaoMicrofone(container)!;

    act(() => {
      dispararPonteiro(botao, "pointerdown", { x: 200, y: 400 });
    });
    act(() => {
      FakeRecognition.ultimo?.emitir("jogo do vasco");
      dispararPonteiro(botao, "pointermove", { x: 120, y: 400 });
    });
    act(() => {
      dispararPonteiro(botao, "pointerup", { x: 120, y: 400 });
    });

    expect(onTranscricao).toHaveBeenCalledWith("já escrito");
    expect(container.textContent).not.toContain(ROTULO_CANCELAR_GRAVACAO);
    expect(botaoMicrofone(container)?.getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("Enviar e Cancelar no modo travado funcionam", () => {
    const onEnviar = vi.fn();
    const onTranscricao = vi.fn();
    renderizar({ onEnviar, onTranscricao });
    const botao = botaoMicrofone(container)!;

    act(() => {
      dispararPonteiro(botao, "pointerdown", { x: 200, y: 400 });
      dispararPonteiro(botao, "pointerup", { x: 200, y: 400 });
    });
    act(() => {
      FakeRecognition.ultimo?.emitir("Marcar viagem");
    });

    const enviar = container.querySelector(
      `button[aria-label="${ROTULO_ENVIAR}"]`,
    );
    expect(enviar).not.toBeNull();
    expect((enviar as HTMLButtonElement).disabled).toBe(false);

    act(() => {
      enviar?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onEnviar).toHaveBeenCalledWith("Marcar viagem");
    expect(botaoMicrofone(container)?.getAttribute("aria-pressed")).toBe(
      "false",
    );

    act(() => {
      root.render(
        <MicrofoneWhatsApp
          textoBase=""
          onTranscricao={onTranscricao}
          onErro={vi.fn()}
          onDica={vi.fn()}
          onEnviar={onEnviar}
        />,
      );
    });
    const botao2 = botaoMicrofone(container)!;
    act(() => {
      dispararPonteiro(botao2, "pointerdown", { x: 200, y: 400 });
      dispararPonteiro(botao2, "pointerup", { x: 200, y: 400 });
    });
    act(() => {
      FakeRecognition.ultimo?.emitir("texto a cancelar");
    });
    const cancelar = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === ROTULO_CANCELAR_GRAVACAO,
    );
    act(() => {
      cancelar?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onTranscricao).toHaveBeenCalledWith("");
    expect(botaoMicrofone(container)?.getAttribute("aria-pressed")).toBe(
      "false",
    );
  });
});
