/** @vitest-environment jsdom */

import { CabecalhoConversa } from "@/app/cabecalho-conversa";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("cabeçalho compacto da Conversa", () => {
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

  it("começa numa linha e expande a conta ao tocar; Recolher e Esc fecham", () => {
    const onDesconectar = vi.fn();
    act(() => {
      root.render(
        <CabecalhoConversa
          conectado
          email="nilshow@gmail.com"
          credencialConfigurada
          desconectando={false}
          onDesconectar={onDesconectar}
          ajuda={<button type="button">?</button>}
        />,
      );
    });

    const topo = container.querySelector(".conversa-topo");
    expect(topo).not.toBeNull();
    expect(container.querySelector(".conversa-sub")).toBeNull();

    const botao = container.querySelector<HTMLButtonElement>(
      "[data-conta-indicador]",
    );
    const painel = container.querySelector<HTMLElement>("[data-conta-painel]");
    expect(botao).not.toBeNull();
    expect(botao?.getAttribute("aria-expanded")).toBe("false");
    expect(botao?.textContent).toMatch(/nilshow/i);
    expect(painel?.hasAttribute("hidden")).toBe(true);
    expect(botao?.getAttribute("aria-controls")).toBe(painel?.id);
    expect(painel?.textContent).toMatch(/Consulta lê as agendas visíveis/i);
    expect(painel?.textContent).toMatch(/Desconectar/i);
    expect(painel?.textContent).toMatch(/Privacidade/i);

    act(() => {
      botao?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(botao?.getAttribute("aria-expanded")).toBe("true");
    expect(painel?.hasAttribute("hidden")).toBe(false);

    act(() => {
      botao?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(botao?.getAttribute("aria-expanded")).toBe("false");
    expect(painel?.hasAttribute("hidden")).toBe(true);

    act(() => {
      botao?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(botao?.getAttribute("aria-expanded")).toBe("false");
    expect(painel?.hasAttribute("hidden")).toBe(true);
    expect(onDesconectar).not.toHaveBeenCalled();
  });

  it("na demonstração o indicador abre Conectar Google e Privacidade", () => {
    act(() => {
      root.render(
        <CabecalhoConversa
          conectado={false}
          email={null}
          credencialConfigurada
          desconectando={false}
          onDesconectar={() => undefined}
          ajuda={<span>?</span>}
        />,
      );
    });

    const botao = container.querySelector<HTMLButtonElement>(
      "[data-conta-indicador]",
    );
    const painel = container.querySelector<HTMLElement>("[data-conta-painel]");
    expect(botao?.textContent).toMatch(/Demo/i);
    expect(botao?.getAttribute("aria-expanded")).toBe("false");
    expect(painel?.textContent).toMatch(/somente leitura/i);
    expect(painel?.textContent).toMatch(/Conectar Google/i);

    act(() => {
      botao?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(botao?.getAttribute("aria-expanded")).toBe("true");
    expect(painel?.hasAttribute("hidden")).toBe(false);
  });
});
