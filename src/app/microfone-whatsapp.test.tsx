/** @vitest-environment jsdom */

import { ROTULO_PARAR_MICROFONE } from "@/app/conversa-campo";
import { MicrofoneWhatsApp } from "@/app/microfone-whatsapp";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: ((ev: Event) => void) | null = null;
  onresult: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onend: ((ev: Event) => void) | null = null;

  start() {
    this.onstart?.(new Event("start"));
  }

  stop() {
    this.onend?.(new Event("end"));
  }

  abort() {
    this.onend?.(new Event("end"));
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

describe("microfone no compositor", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
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
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
  });

  it("ao soltar deixa o texto na caixa e não mostra Cancelar/Enviar da gravação", () => {
    const onTranscricao = vi.fn();
    const onErro = vi.fn();
    const onDica = vi.fn();

    act(() => {
      root.render(
        <MicrofoneWhatsApp
          textoBase=""
          onTranscricao={onTranscricao}
          onErro={onErro}
          onDica={onDica}
        />,
      );
    });

    const botao = container.querySelector("button");
    expect(botao).not.toBeNull();

    act(() => {
      dispararPonteiro(botao!, "pointerdown", { x: 200, y: 400 });
    });
    act(() => {
      dispararPonteiro(botao!, "pointerup", { x: 200, y: 400 });
    });

    expect(container.textContent).not.toMatch(/Cancelar/);
    expect(container.querySelector(".microfone-whatsapp-travado")).toBeNull();
    expect(botao?.getAttribute("aria-pressed")).toBe("false");
  });

  it("gravação travada fica no microfone; o segundo toque para", () => {
    const onTranscricao = vi.fn();
    const onErro = vi.fn();
    const onDica = vi.fn();

    act(() => {
      root.render(
        <MicrofoneWhatsApp
          textoBase=""
          onTranscricao={onTranscricao}
          onErro={onErro}
          onDica={onDica}
        />,
      );
    });

    const botao = container.querySelector("button");
    expect(botao).not.toBeNull();

    act(() => {
      dispararPonteiro(botao!, "pointerdown", { x: 200, y: 400 });
    });
    act(() => {
      dispararPonteiro(botao!, "pointermove", { x: 200, y: 330 });
    });
    act(() => {
      dispararPonteiro(botao!, "pointerup", { x: 200, y: 330 });
    });

    expect(container.textContent).not.toMatch(/Cancelar/);
    expect(container.textContent).not.toMatch(/Enviar/);
    expect(container.textContent).not.toContain(
      "Pode falar sem segurar. Toque em enviar ou cancele.",
    );
    expect(container.querySelector(".conversa-ditado-ativo")).not.toBeNull();
    expect(botao?.getAttribute("aria-pressed")).toBe("true");
    expect(botao?.getAttribute("aria-label")).toBe(ROTULO_PARAR_MICROFONE);

    act(() => {
      dispararPonteiro(botao!, "pointerdown", { x: 200, y: 400 });
    });

    expect(botao?.getAttribute("aria-pressed")).toBe("false");
  });
});
