/** @vitest-environment jsdom */

import PaginaInicial from "@/app/page";
import PaginaPrivacidade from "@/app/privacidade/page";
import PaginaTermos from "@/app/termos/page";
import { CONTATO_EMAIL } from "@/lib/contato";
import { ESCOPOS_OAUTH } from "@/lib/google-oauth";
import {
  CAMINHO_CONVERSA,
  CAMINHO_PRIVACIDADE,
  CAMINHO_TERMOS,
  DATA_VIGENCIA_LEGAL,
  DECLARACAO_LIMITED_USE,
  NOME_DO_APP,
  URL_POLITICA_DADOS_GOOGLE,
  URL_REVOGAR_ACESSO_GOOGLE,
} from "@/lib/urls-app";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("páginas públicas sem sessão", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({
          credencialConfigurada: true,
          conectado: false,
          email: null,
          motivo: null,
        }),
      })),
    );
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("a homepage é enxuta, mostra o propósito e os botões de entrar", () => {
    act(() => {
      root.render(<PaginaInicial />);
    });
    const texto = container.textContent ?? "";
    expect(texto).toContain(NOME_DO_APP);
    expect(texto).not.toMatch(/rascunho/i);
    expect(texto).toMatch(/Google Agenda/i);
    expect(texto).toMatch(/Confirmação/i);
    expect(texto).not.toContain("calendar.events");
    expect(texto).not.toContain("calendar.calendarlist.readonly");
    expect(texto).toContain(CONTATO_EMAIL);
    expect(texto).not.toContain("[PREENCHER-EMAIL-DE-CONTATO]");
    expect(CAMINHO_PRIVACIDADE).toBe("/privacidade");
    expect(CAMINHO_TERMOS).toBe("/termos");
    const hrefs = [...container.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/privacidade");
    expect(hrefs).toContain("/termos");
    expect(hrefs).toContain(`${CAMINHO_CONVERSA}?demo=1`);
    expect(hrefs).toContain("/api/auth/google");
    expect(hrefs).toContain(`mailto:${CONTATO_EMAIL}`);
    expect(texto).toMatch(/Continuar com Google/);
    expect(texto).toMatch(/Continuar em demonstração/);
    const botaoGoogle = container.querySelector("a.entrada-botao-google");
    expect(botaoGoogle?.textContent).toMatch(/Continuar com Google/);
    expect(container.querySelector("img.marca-cartao")?.getAttribute("src")).toBe(
      "/logo-agenda.svg",
    );
  });

  it("privacidade e termos descrevem o escopo real, Limited Use e a revogação", () => {
    act(() => {
      root.render(<PaginaPrivacidade />);
    });
    const privacidade = container.textContent ?? "";
    expect(privacidade).not.toMatch(/rascunho/i);
    expect(privacidade).toContain(DATA_VIGENCIA_LEGAL);
    expect(privacidade).toContain(DECLARACAO_LIMITED_USE);
    expect(privacidade).toContain(CONTATO_EMAIL);
    expect(privacidade).toMatch(/não é armazenada/i);
    for (const escopo of ESCOPOS_OAUTH) {
      expect(privacidade).toContain(escopo);
    }
    const linksPriv = [...container.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(linksPriv).toContain(URL_POLITICA_DADOS_GOOGLE);
    expect(linksPriv).toContain(URL_REVOGAR_ACESSO_GOOGLE);
    expect(linksPriv).toContain("/termos");
    expect(linksPriv).toContain(`mailto:${CONTATO_EMAIL}`);

    act(() => {
      root.render(<PaginaTermos />);
    });
    const termos = container.textContent ?? "";
    expect(termos).not.toMatch(/rascunho/i);
    expect(termos).toContain(DATA_VIGENCIA_LEGAL);
    expect(termos).toContain(DECLARACAO_LIMITED_USE);
    expect(termos).toMatch(/«Sim»|Sim/i);
    expect(termos).toContain(CONTATO_EMAIL);
    const linksTermos = [...container.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(linksTermos).toContain("/privacidade");
    expect(linksTermos).toContain(URL_POLITICA_DADOS_GOOGLE);
    expect(linksTermos).toContain(`mailto:${CONTATO_EMAIL}`);
  });
});
