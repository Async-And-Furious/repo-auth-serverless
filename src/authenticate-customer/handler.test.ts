import { describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { authenticateCustomer, normalizeCpf } from "./handler.js";

describe("CPF authentication", () => {
  it("validates and normalizes CPF", () => expect(normalizeCpf("529.982.247-25")).toBe("52998224725"));
  it("issues an RS256 JWT for an active customer", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs1", format: "pem" }, publicKeyEncoding: { type: "pkcs1", format: "pem" } });
    process.env.JWT_ISSUER = "test-issuer";
    process.env.JWT_AUDIENCE = "test-audience";
    process.env.JWT_EXPIRES_IN = "1800";
    const result = await authenticateCustomer({ body: JSON.stringify({ cpf: "529.982.247-25" }), headers: {}, requestContext: { requestId: "corr-success" } as never }, async () => ({ id: "c-1", active: true }), async () => privateKey);
    const body = JSON.parse(result.body) as { token: string };
    expect(result.statusCode).toBe(200);
    expect(jwt.verify(body.token, privateKey, { algorithms: ["RS256"], issuer: "test-issuer", audience: "test-audience" })).toMatchObject({ sub: "c-1", iss: "test-issuer", aud: "test-audience" });
  });
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
