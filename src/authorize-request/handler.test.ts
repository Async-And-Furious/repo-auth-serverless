import { describe, expect, it } from "vitest";
import { extractBearerToken } from "./handler.js";

describe("extractBearerToken", () => {
  it("extracts the token from a well-formed Bearer header", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("returns null when there is no header", () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it("returns null for a non-Bearer scheme", () => {
    expect(extractBearerToken("Basic abc")).toBeNull();
  });

  it("returns null when the header has no token", () => {
    expect(extractBearerToken("Bearer")).toBeNull();
  });
});
