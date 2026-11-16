import {
  DICA_DITADO_TECLADO,
  PLACEHOLDER_MENSAGEM,
  ROTULO_MICROFONE,
  ROTULO_VER_NO_CALENDARIO,
} from "@/app/conversa-campo";
import manifest from "@/app/manifest";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("app na tela inicial", () => {
  it("o manifest instala com nome, ícones e abre direto na Conversa", () => {
    const web = manifest();

    expect(web.name).toBe("Agenda Inteligente");
    expect(web.short_name).toBe("Agenda");
    expect(web.start_url).toBe("/conversa");
    expect(web.display).toBe("standalone");
    expect(web.icons?.length).toBeGreaterThanOrEqual(4);
    expect(web.icons?.some((i) => i.sizes === "192x192" && i.purpose === "any")).toBe(
      true,
    );
    expect(web.icons?.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(
      true,
    );
    expect(
      web.icons?.some((i) => i.sizes === "192x192" && i.purpose === "maskable"),
    ).toBe(true);
    expect(
      web.icons?.some((i) => i.sizes === "512x512" && i.purpose === "maskable"),
    ).toBe(true);
    const raiz = path.resolve(__dirname, "../../public");
    const appDir = path.resolve(__dirname);
    expect(existsSync(path.join(raiz, "logo-agenda.svg"))).toBe(true);
    expect(existsSync(path.join(raiz, "logo-agenda-pequeno.svg"))).toBe(true);
    expect(existsSync(path.join(raiz, "logo-google-120.png"))).toBe(true);
    expect(statSync(path.join(raiz, "logo-google-120.png")).size).toBeLessThan(
      1024 * 1024,
    );
    const svgCompleto = readFileSync(path.join(raiz, "logo-agenda.svg"), "utf8");
    const svgPequeno = readFileSync(
      path.join(raiz, "logo-agenda-pequeno.svg"),
      "utf8",
    );
    expect(svgCompleto).not.toMatch(/image\/png|<image|xlink:href/i);
    expect(svgPequeno).not.toMatch(/image\/png|<image|xlink:href/i);
    expect(svgCompleto).toContain("#E0ECE1");
    expect(svgCompleto).toContain("#2C6B4E");
    expect(svgPequeno).toContain("#2C6B4E");
    expect(existsSync(path.join(appDir, "favicon.ico"))).toBe(true);
    expect(existsSync(path.join(raiz, "favicon-16x16.png"))).toBe(true);
    expect(existsSync(path.join(raiz, "favicon-32x32.png"))).toBe(true);
    expect(existsSync(path.join(raiz, "icon-48.png"))).toBe(true);
    expect(existsSync(path.join(raiz, "icon-192.png"))).toBe(true);
    expect(existsSync(path.join(raiz, "icon-512.png"))).toBe(true);
    expect(existsSync(path.join(raiz, "icon-192-maskable.png"))).toBe(true);
    expect(existsSync(path.join(raiz, "icon-512-maskable.png"))).toBe(true);
    expect(existsSync(path.join(raiz, "apple-touch-icon.png"))).toBe(true);
  });

  it("o campo da Conversa deixa claro que dá para ditar", () => {
    expect(PLACEHOLDER_MENSAGEM).toMatch(/fale/i);
    expect(ROTULO_MICROFONE).toMatch(/falar|mensagem/i);
    expect(DICA_DITADO_TECLADO).toMatch(/teclado do iPhone/i);
    expect(ROTULO_VER_NO_CALENDARIO).toMatch(/calendário/i);
  });
});
