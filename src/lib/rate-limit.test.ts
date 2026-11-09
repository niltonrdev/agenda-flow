import {
  consumirRateLimit,
  resetarRateLimitParaTestes,
} from "@/lib/rate-limit";
import { describe, expect, it } from "vitest";

describe("rate limit em memória", () => {
  it("libera até o limite e depois responde 429 lógico", () => {
    resetarRateLimitParaTestes();
    const agora = 1_000;
    expect(consumirRateLimit("ip-a", 2, 60_000, agora).ok).toBe(true);
    expect(consumirRateLimit("ip-a", 2, 60_000, agora + 10).ok).toBe(true);
    const estouro = consumirRateLimit("ip-a", 2, 60_000, agora + 20);
    expect(estouro.ok).toBe(false);
    expect(estouro.retryAfterS).toBeGreaterThan(0);
    expect(consumirRateLimit("ip-b", 2, 60_000, agora + 20).ok).toBe(true);
  });

  it("renova a janela depois do prazo", () => {
    resetarRateLimitParaTestes();
    const agora = 1_000;
    consumirRateLimit("ip", 1, 1_000, agora);
    expect(consumirRateLimit("ip", 1, 1_000, agora + 10).ok).toBe(false);
    expect(consumirRateLimit("ip", 1, 1_000, agora + 1_001).ok).toBe(true);
  });
});
