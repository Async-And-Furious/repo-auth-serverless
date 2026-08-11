import { describe, it, expect, beforeEach } from "vitest";
import type { APIGatewayRequestAuthorizerEvent } from "aws-lambda";
import jwt from "jsonwebtoken";
import { handler } from "./handler.js";

function buildEvent(authHeader?: string): APIGatewayRequestAuthorizerEvent {
  return {
    headers: authHeader ? { Authorization: authHeader } : {},
  } as unknown as APIGatewayRequestAuthorizerEvent;
}

describe("authorize-request handler", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("denies when no Authorization header is present", async () => {
    const result = await handler(buildEvent());
    expect(result.isAuthorized).toBe(false);
  });

  it("denies when scheme is not Bearer", async () => {
    const result = await handler(buildEvent("Basic abc123"));
    expect(result.isAuthorized).toBe(false);
  });

  it("denies an invalid token", async () => {
    const result = await handler(buildEvent("Bearer not-a-real-token"));
    expect(result.isAuthorized).toBe(false);
  });

  it("denies an expired token", async () => {
    const expiredToken = jwt.sign(
      { sub: "cliente-1", documento: "52998224725", role: "CLIENTE" },
      "test-secret",
      { expiresIn: -10 }
    );
    const result = await handler(buildEvent(`Bearer ${expiredToken}`));
    expect(result.isAuthorized).toBe(false);
  });

  it("authorizes a valid token", async () => {
    const token = jwt.sign(
      { sub: "cliente-1", documento: "52998224725", role: "CLIENTE" },
      "test-secret",
      { expiresIn: 3600 }
    );
    const result = await handler(buildEvent(`Bearer ${token}`));
    expect(result.isAuthorized).toBe(true);
  });
});
