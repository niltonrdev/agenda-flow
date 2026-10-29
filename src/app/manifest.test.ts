import {
  DICA_DITADO_TECLADO,
  PLACEHOLDER_MENSAGEM,
  ROTULO_MICROFONE,
  ROTULO_VER_NO_CALENDARIO,
} from "@/app/conversa-campo";
import manifest from "@/app/manifest";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("app na tela inicial", () => {
  it("o manifest instala com nome, ícones e abre direto na Conversa", () => {
    const web = manifest();

    expect(web.name).toBe("Agenda Inteligente");
    expect(web.short_name).toBe("Agenda");
    expect(web.start_url).toBe("/");
    expect(web.display).toBe("standalone");
    expect(web.icons?.length).toBeGreaterThanOrEqual(2);
    expect(web.icons?.some((i) => i.sizes === "192x192")).toBe(true);
    expect(web.icons?.some((i) => i.sizes === "512x512")).toBe(true);
    const raiz = path.resolve(__dirname, "../../public");
    expect(existsSync(path.join(raiz, "icon-192.png"))).toBe(true);
    expect(existsSync(path.join(raiz, "icon-512.png"))).toBe(true);
    expect(existsSync(path.join(raiz, "apple-touch-icon.png"))).toBe(true);
  });

  it("o campo da Conversa deixa claro que dá para ditar", () => {
    expect(PLACEHOLDER_MENSAGEM).toMatch(/fale/i);
    expect(ROTULO_MICROFONE).toMatch(/falar|mensagem/i);
    expect(DICA_DITADO_TECLADO).toMatch(/teclado do iPhone/i);
    expect(ROTULO_VER_NO_CALENDARIO).toMatch(/calendário/i);
  });
});
