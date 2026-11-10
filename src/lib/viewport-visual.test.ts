import { cssAlturaViewportVisual } from "@/lib/viewport-visual";
import { describe, expect, it } from "vitest";

describe("altura do viewport visual", () => {
  it("usa a altura do visualViewport quando existe", () => {
    expect(cssAlturaViewportVisual({ height: 390.4 }, 800)).toBe("390px");
  });

  it("cai no fallback se o visualViewport não estiver disponível", () => {
    expect(cssAlturaViewportVisual(null, 800)).toBe("800px");
  });
});
