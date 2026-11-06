import {
  contentTypeEhJson,
  origemDaApiPermitida,
  pedidoDeEscritaSeguro,
} from "@/lib/csrf";
import { describe, expect, it } from "vitest";

function pedido(
  headers: Record<string, string>,
  url = "https://agenda.example/api/conversa",
): Request {
  return new Request(url, { method: "POST", headers });
}

describe("proteção CSRF da API de escrita", () => {
  it("exige JSON e Origin da mesma origem", () => {
    expect(
      pedidoDeEscritaSeguro(
        pedido({
          "content-type": "application/json",
          origin: "https://agenda.example",
        }),
      ),
    ).toBe(true);
    expect(
      pedidoDeEscritaSeguro(
        pedido({
          "content-type": "text/plain",
          origin: "https://agenda.example",
        }),
      ),
    ).toBe(false);
    expect(
      pedidoDeEscritaSeguro(
        pedido({
          "content-type": "application/json",
          origin: "https://evil.example",
        }),
      ),
    ).toBe(false);
  });

  it("rejeita Sec-Fetch-Site cruzado mesmo sem Origin", () => {
    expect(
      origemDaApiPermitida(
        pedido({ "sec-fetch-site": "cross-site" }),
      ),
    ).toBe(false);
    expect(contentTypeEhJson(pedido({ "content-type": "application/json; charset=UTF-8" }))).toBe(
      true,
    );
  });
});
