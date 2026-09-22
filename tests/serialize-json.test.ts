import { describe, expect, it } from "vitest";

import { serializeJsonForScript } from "../src/utils/serializeJson";

describe("serializeJsonForScript", () => {
  it("cannot terminate a script element", () => {
    const output = serializeJsonForScript({ title: "</script><script>alert(1)</script>&" });
    expect(output).not.toContain("</script>");
    expect(output).not.toContain("<script>");
    expect(JSON.parse(output)).toEqual({ title: "</script><script>alert(1)</script>&" });
  });
});
