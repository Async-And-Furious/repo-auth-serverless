import { describe, expect, it, vi } from "vitest";
import { authenticateCustomer, normalizeCpf } from "./handler.js";

describe("CPF authentication", () => {
  it("validates and normalizes CPF", () => expect(normalizeCpf("529.982.247-25")).toBe("52998224725"));
  it("rejects invalid CPF", () => expect(normalizeCpf("52998224724")).toBeNull());
  it("rejects an inactive customer without issuing a token", async () => {
    const result = await authenticateCustomer({ body: JSON.stringify({ cpf: "529.982.247-25" }), headers: {}, requestContext: { requestId: "corr-1" } as never }, async () => ({ id: "c-1", active: false }));
    expect(result.statusCode).toBe(401);
  });
  it("rejects malformed input before lookup", async () => {
    const lookup = vi.fn();
    const result = await authenticateCustomer({ body: "{}", headers: {}, requestContext: { requestId: "corr-1" } as never }, lookup);
    expect(result.statusCode).toBe(400);
    expect(lookup).not.toHaveBeenCalled();
  });
});
