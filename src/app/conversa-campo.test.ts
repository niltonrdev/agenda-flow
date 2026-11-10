import {
  AVISO_VOZ_COMPLETO,
  AVISO_VOZ_RESUMO,
  DICA_DITADO_TECLADO,
  DICA_OUVINDO,
  ROTULO_ENVIAR,
  ROTULO_PARAR_MICROFONE,
} from "@/app/conversa-campo";
import { describe, expect, it } from "vitest";

describe("textos do compositor", () => {
  it("mantém o aviso de ditado completo para o disclosure", () => {
    expect(AVISO_VOZ_RESUMO).toMatch(/ditado/i);
    expect(AVISO_VOZ_COMPLETO).toBe(
      "O ditado usa o reconhecimento de voz do navegador; o áudio pode ser processado fora deste aparelho.",
    );
  });

  it("gravação usa o Enviar normal e o microfone para parar", () => {
    expect(ROTULO_ENVIAR).toBe("Enviar");
    expect(ROTULO_PARAR_MICROFONE).toMatch(/parar/i);
    expect(DICA_OUVINDO).toBe("Ouvindo");
    expect(DICA_DITADO_TECLADO).toMatch(/teclado do iPhone/i);
  });
});
