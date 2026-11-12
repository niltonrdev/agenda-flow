import {
  AVISO_VOZ_COMPLETO,
  AVISO_VOZ_RESUMO,
  DICA_DITADO_TECLADO,
  DICA_OUVINDO,
  PLACEHOLDER_MENSAGEM,
  ROTULO_CANCELAR_GRAVACAO,
  ROTULO_ENVIAR,
  ROTULO_MICROFONE,
  acaoDoCompositor,
} from "@/app/conversa-campo";
import { describe, expect, it } from "vitest";

describe("textos do compositor", () => {
  it("placeholder curto cabe numa linha no iPhone", () => {
    expect(PLACEHOLDER_MENSAGEM).toBe("Fale ou escreva...");
    expect(PLACEHOLDER_MENSAGEM).not.toMatch(/\n/);
    expect(PLACEHOLDER_MENSAGEM.length).toBeLessThan(24);
  });

  it("mantém o aviso de ditado e descreve toque e segurar", () => {
    expect(AVISO_VOZ_RESUMO).toMatch(/ditado/i);
    expect(AVISO_VOZ_COMPLETO).toMatch(/reconhecimento de voz do navegador/i);
    expect(AVISO_VOZ_COMPLETO).toMatch(/Toque no microfone/i);
    expect(AVISO_VOZ_COMPLETO).toMatch(/segure para gravar/i);
  });

  it("campo vazio mostra o microfone; com texto, a seta de enviar", () => {
    expect(acaoDoCompositor("", "idle")).toBe("microfone");
    expect(acaoDoCompositor("   ", "idle")).toBe("microfone");
    expect(acaoDoCompositor("Dentista amanhã", "idle")).toBe("enviar");
    expect(acaoDoCompositor("Dentista amanhã", "segurando")).toBe("microfone");
    expect(acaoDoCompositor("Dentista amanhã", "travado")).toBe("microfone");
    expect(ROTULO_ENVIAR).toBe("Enviar");
    expect(ROTULO_CANCELAR_GRAVACAO).toBe("Cancelar");
    expect(ROTULO_MICROFONE).toMatch(/Toque/i);
    expect(DICA_OUVINDO).toBe("Ouvindo");
    expect(DICA_DITADO_TECLADO).toMatch(/teclado do iPhone/i);
  });
});
