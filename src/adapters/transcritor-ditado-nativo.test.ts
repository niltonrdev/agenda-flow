import { criarTranscritorDitadoNativo } from "@/adapters/transcritor-ditado-nativo";
import { mensagemAPartirDoCampo } from "@/domain/transcritor";
import { describe, expect, it } from "vitest";

describe("porta Transcritor — adaptador de ditado nativo", () => {
  it("devolve o texto que o ditado nativo já deixou no campo", async () => {
    const transcritor = criarTranscritorDitadoNativo();

    const texto = await transcritor.transcrever({
      origem: "ditado_nativo",
      textoDoCampo: "  reunião com a Ana amanhã às 15h  ",
    });

    expect(texto).toBe("reunião com a Ana amanhã às 15h");
  });

  it("recusa Áudio de servidor, para um adaptador de servidor entrar sem misturar contratos", async () => {
    const transcritor = criarTranscritorDitadoNativo();

    await expect(
      transcritor.transcrever({
        origem: "servidor",
        bytes: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toThrow(/ditado nativo/i);
  });

  it("mensagemAPartirDoCampo usa a porta e não o núcleo", async () => {
    const transcritor = criarTranscritorDitadoNativo();
    const mensagem = await mensagemAPartirDoCampo(
      transcritor,
      "15 de novembro",
    );
    expect(mensagem).toBe("15 de novembro");
  });
});
