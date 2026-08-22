import { describe, it, expect, beforeEach } from "vitest";
import type { APIGatewayRequestAuthorizerEvent } from "aws-lambda";
import jwt from "jsonwebtoken";
import { generateKeyPairSync } from "node:crypto";
import { handler } from "./handler.js";

function buildEvent(authHeader?: string, correlationId?: string, requestId?: string): APIGatewayRequestAuthorizerEvent {
  return {
    headers: { ...(authHeader ? { Authorization: authHeader } : {}), ...(correlationId ? { "x-correlation-id": correlationId } : {}) },
    requestContext: requestId ? { requestId } : {},
  } as unknown as APIGatewayRequestAuthorizerEvent;
}

describe("authorize-request handler", () => {
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKey = keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicKey = keys.publicKey.export({ type: "spki", format: "pem" }).toString();
  beforeEach(() => {
    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.JWT_PUBLIC_KEY = publicKey;
    process.env.JWT_ISSUER = "test-issuer";
    process.env.JWT_AUDIENCE = "test-audience";
    process.env.JWT_EXPIRES_IN = "1800";
  });

  it("denies when no Authorization header is present", async () => {
    const result = await handler(buildEvent());
    expect(result.isAuthorized).toBe(false);
  });

  it("denies when scheme is not Bearer", async () => {
    const result = await handler(buildEvent("Basic abc123"));
    expect(result.isAuthorized).toBe(false);
  });

  it.each(["Bearer", "Bearer ", "Bearer a b", "bearer a b", "Basic abc123"])("denies malformed authorization: %s", async (header) => {
    const result = await handler(buildEvent(header));
    expect(result.isAuthorized).toBe(false);
  });

  it("denies an invalid token", async () => {
    const result = await handler(buildEvent("Bearer not-a-real-token"));
    expect(result.isAuthorized).toBe(false);
  });

  it("denies an expired token", async () => {
    const expiredToken = jwt.sign(
      { sub: "cliente-1", documento: "52998224725", role: "CLIENTE" },
      privateKey,
      { algorithm: "RS256", expiresIn: -10, issuer: "test-issuer", audience: "test-audience" }
    );
    const result = await handler(buildEvent(`Bearer ${expiredToken}`));
    expect(result.isAuthorized).toBe(false);
  });

  it("authorizes a valid token", async () => {
    const token = jwt.sign(
      { sub: "cliente-1", documento: "52998224725", role: "CLIENTE" },
      privateKey,
      { algorithm: "RS256", expiresIn: 3600, issuer: "test-issuer", audience: "test-audience" }
    );
    const result = await handler(buildEvent(`Bearer ${token}`));
    expect(result.isAuthorized).toBe(true);
  });

  it("returns the incoming correlation ID in authorizer context", async () => {
    const result = await handler(buildEvent(undefined, "corr-123", "request-123"));
    expect(result.context).toEqual({ correlation_id: "corr-123" });
  });

  it("falls back to the API Gateway request ID", async () => {
    const result = await handler(buildEvent(undefined, undefined, "request-123"));
    expect(result.context).toEqual({ correlation_id: "request-123" });
  });

  it("denies a token without the required documento claim", async () => {
    const token = jwt.sign(
      { sub: "cliente-1", role: "CLIENTE" },
      privateKey,
      { algorithm: "RS256", expiresIn: 3600, issuer: "test-issuer", audience: "test-audience" }
    );
    const result = await handler(buildEvent(`Bearer ${token}`));
    expect(result.isAuthorized).toBe(false);
  });
});
