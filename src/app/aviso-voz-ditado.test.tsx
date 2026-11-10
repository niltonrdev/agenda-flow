/** @vitest-environment jsdom */

import { AVISO_VOZ_COMPLETO, AVISO_VOZ_RESUMO } from "@/app/conversa-campo";
import { AvisoVozDitado } from "@/app/aviso-voz-ditado";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("aviso compacto do ditado", () => {
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

  it("começa compacto e abre o texto completo no toque ou teclado", () => {
    act(() => {
      root.render(<AvisoVozDitado />);
    });

    const botao = container.querySelector("button");
    const texto = container.querySelector(".conversa-aviso-voz-texto");
    expect(botao).not.toBeNull();
    expect(botao?.getAttribute("aria-expanded")).toBe("false");
    expect(botao?.textContent).toContain(AVISO_VOZ_RESUMO);
    expect(texto?.getAttribute("hidden")).not.toBeNull();
    expect(texto?.textContent).toBe(AVISO_VOZ_COMPLETO);
    expect(botao?.getAttribute("aria-controls")).toBe(texto?.id);

    act(() => {
      botao?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(botao?.getAttribute("aria-expanded")).toBe("true");
    expect(texto?.hasAttribute("hidden")).toBe(false);
  });
});
