import {
  CONTATO_EMAIL,
  emailDeContato,
  emailDeContatoEhPlaceholder,
} from "@/lib/contato";
import { describe, expect, it } from "vitest";

describe("e-mail de contato público", () => {
  it("usa a constante única até existir NEXT_PUBLIC_CONTATO_EMAIL", () => {
    expect(CONTATO_EMAIL).toBe("niltonrdonascimento@gmail.com");
    expect(emailDeContato({})).toBe(CONTATO_EMAIL);
    expect(emailDeContatoEhPlaceholder(CONTATO_EMAIL)).toBe(false);
    expect(emailDeContato({ NEXT_PUBLIC_CONTATO_EMAIL: "  " })).toBe(
      CONTATO_EMAIL,
    );
  });

  it("prefere a variável de ambiente pública quando preenchida", () => {
    expect(
      emailDeContato({ NEXT_PUBLIC_CONTATO_EMAIL: " outro@example.com " }),
    ).toBe("outro@example.com");
    expect(emailDeContatoEhPlaceholder("outro@example.com")).toBe(false);
    expect(emailDeContatoEhPlaceholder("[PREENCHER-EMAIL-DE-CONTATO]")).toBe(
      true,
    );
  });
});
