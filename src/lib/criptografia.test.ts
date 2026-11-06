import { cifrarValor, decifrarValor } from "@/lib/criptografia";
import { describe, expect, it } from "vitest";

describe("cifra autenticada AES-256-GCM", () => {
  it("cifra e decifra o payload", () => {
    const secret = "segredo-de-teste-com-32-bytes-ok!";
    const pacote = cifrarValor('{"token":"abc"}', secret);
    expect(pacote.startsWith("v1.")).toBe(true);
    expect(pacote).not.toContain("abc");
    expect(decifrarValor(pacote, secret)).toBe('{"token":"abc"}');
  });

  it("rejeita pacote adulterado ou com outra chave", () => {
    const secret = "segredo-de-teste-com-32-bytes-ok!";
    const pacote = cifrarValor("ola", secret);
    expect(decifrarValor(pacote, "outra-chave-com-32-bytes-ok!!!!")).toBeNull();
    expect(decifrarValor(pacote.slice(0, -2) + "xx", secret)).toBeNull();
    expect(decifrarValor("hmac.payload-antigo", secret)).toBeNull();
  });
});
