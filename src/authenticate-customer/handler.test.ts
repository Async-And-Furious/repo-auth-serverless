import { describe, expect, it, vi } from "vitest";
import { authenticateCustomer, normalizeCpf } from "./handler.js";

describe("CPF authentication", () => {
  it("validates and normalizes CPF", () => expect(normalizeCpf("529.982.247-25")).toBe("52998224725"));
  it("rejects invalid CPF", () => expect(normalizeCpf("52998224724")).toBeNull());
  it("rejects an inactive customer without issuing a token", async () => {
    const result = await authenticateCustomer({ body: JSON.stringify({ cpf: "529.982.247-25" }), headers: {}, requestContext: { requestId: "corr-1" } as never }, async () => ({ id: "c-1", active: false }));
    expect(result.statusCode).toBe(401);
  });
  it("rejects a nonexistent customer without issuing a token", async () => {
    const result = await authenticateCustomer({ body: JSON.stringify({ cpf: "529.982.247-25" }), headers: {}, requestContext: { requestId: "corr-1" } as never }, async () => null);
    expect(result.statusCode).toBe(401);
  });
  it("rejects malformed input before lookup", async () => {
    const lookup = vi.fn();
    const result = await authenticateCustomer({ body: "{}", headers: {}, requestContext: { requestId: "corr-1" } as never }, lookup);
    expect(result.statusCode).toBe(400);
    expect(lookup).not.toHaveBeenCalled();
  });
  it("rejects a JSON null body as an invalid request", async () => {
    const lookup = vi.fn();
    const result = await authenticateCustomer({ body: "null", headers: {}, requestContext: { requestId: "corr-1" } as never }, lookup);
    expect(result.statusCode).toBe(400);
    expect(lookup).not.toHaveBeenCalled();
  });
  it("returns the generic unauthorized response for an invalid CPF", async () => {
    const result = await authenticateCustomer({ body: JSON.stringify({ cpf: "529.982.247-24" }), headers: {}, requestContext: { requestId: "corr-1" } as never }, vi.fn());
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toEqual({ error: "unauthorized", message: "Invalid customer credentials" });
  });

  it("falls back from a blank correlation header", async () => {
    const result = await authenticateCustomer({ body: "{}", headers: { "x-correlation-id": "   " }, requestContext: { requestId: "api-request-1" } as never }, vi.fn());
    expect(result.headers?.["x-correlation-id"]).toBe("api-request-1");
  });
});
