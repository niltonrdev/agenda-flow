/** @vitest-environment jsdom */

import { CompositorMensagem } from "@/app/compositor-mensagem";
import {
  PLACEHOLDER_MENSAGEM,
  ROTULO_CANCELAR_GRAVACAO,
  ROTULO_ENVIAR,
  ROTULO_MICROFONE,
} from "@/app/conversa-campo";
import { act, useState } from "react";
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

function Harness({
  inicial = "",
  onEnviarExterno,
}: {
  inicial?: string;
  onEnviarExterno?: (texto?: string) => void;
}) {
  const [rascunho, setRascunho] = useState(inicial);
  const [geracaoCampo, setGeracaoCampo] = useState(0);
  const [dicaVoz, setDicaVoz] = useState<string | null>(null);
  return (
    <CompositorMensagem
      rascunho={rascunho}
      onRascunho={setRascunho}
      onEnviar={(texto) => {
        onEnviarExterno?.(texto);
        setRascunho("");
        setGeracaoCampo((atual) => atual + 1);
      }}
      dicaVoz={dicaVoz}
      onDica={setDicaVoz}
      onErro={() => {}}
      geracaoCampo={geracaoCampo}
    />
  );
}

describe("compositor no estilo WhatsApp", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
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
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
  });

  it("campo vazio mostra só o microfone, sem botão Enviar separado", () => {
    act(() => {
      root.render(<Harness />);
    });
    const campo = container.querySelector("textarea");
    expect(campo?.getAttribute("placeholder")).toBe(PLACEHOLDER_MENSAGEM);
    expect(
      container.querySelector(`button[aria-label="${ROTULO_MICROFONE}"]`),
    ).not.toBeNull();
    expect(
      container.querySelector(`button[aria-label="${ROTULO_ENVIAR}"]`),
    ).toBeNull();
    expect(container.textContent).not.toContain("Enviar");
  });

  it("com texto o microfone vira a seta de enviar", () => {
    act(() => {
      root.render(<Harness inicial="Dentista amanhã às 15h" />);
    });
    expect(
      container.querySelector(`button[aria-label="${ROTULO_ENVIAR}"]`),
    ).not.toBeNull();
    expect(
      container.querySelector(`button[aria-label="${ROTULO_MICROFONE}"]`),
    ).toBeNull();
  });

  it("depois do envio o campo fica limpo e um onresult atrasado não volta", () => {
    const onEnviarExterno = vi.fn();
    act(() => {
      root.render(<Harness onEnviarExterno={onEnviarExterno} />);
    });

    const mic = container.querySelector(
      `button[aria-label="${ROTULO_MICROFONE}"]`,
    );
    expect(mic).not.toBeNull();

    act(() => {
      dispararPonteiro(mic!, "pointerdown", { x: 200, y: 400 });
      dispararPonteiro(mic!, "pointerup", { x: 200, y: 400 });
    });
    act(() => {
      FakeRecognition.ultimo?.emitir(
        "Marcar viagem do dia 15 de novembro ao dia 22 de novembro",
      );
    });

    const campo = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(campo.value).toMatch(/Marcar viagem/);

    const enviar = container.querySelector(
      `button[aria-label="${ROTULO_ENVIAR}"]`,
    );
    act(() => {
      enviar?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onEnviarExterno).toHaveBeenCalled();
    expect(campo.value).toBe("");
    expect(container.textContent).not.toContain(ROTULO_CANCELAR_GRAVACAO);

    act(() => {
      FakeRecognition.ultimo?.emitir(
        "Marcar viagem do dia 15 de novembro ao dia 22 de novembro",
      );
    });
    expect(campo.value).toBe("");
  });
});
