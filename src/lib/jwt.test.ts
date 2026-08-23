import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./jwt.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "pkcs1", format: "pem" },
});

process.env.JWT_ISSUER = "test-issuer";
process.env.JWT_AUDIENCE = "test-audience";
process.env.JWT_EXPIRES_IN = "1800";

const claims = { sub: "customer-123", documento: "52998224725", role: "CLIENTE" as const };

describe("signToken / verifyToken", () => {
  it("round-trips claims through sign and verify", () => {
    const token = signToken(claims, privateKey);
    const verified = verifyToken(token, publicKey);
    expect(verified.sub).toBe("customer-123");
  });

  it("rejects an expired token", () => {
    const token = signToken(claims, privateKey, -1);
    expect(() => verifyToken(token, publicKey)).toThrow();
  });

  it("rejects a token signed with a different key pair", () => {
    const { privateKey: otherKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
      publicKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    const token = signToken(claims, otherKey);
    expect(() => verifyToken(token, publicKey)).toThrow();
  });

  it("rejects wrong issuer, audience, role, or algorithm", () => {
    const token = jwt.sign(claims, privateKey, { algorithm: "RS256", issuer: "wrong", audience: "test-audience" });
    expect(() => verifyToken(token, publicKey)).toThrow();
    const differentAlgorithm = jwt.sign(claims, privateKey, { algorithm: "RS256", issuer: "test-issuer", audience: "test-audience" });
    expect(() => verifyToken(differentAlgorithm.replace(/^eyJhbGciOiJSUzI1NiIs/, "eyJhbGciOiJIUzI1NiIs"), publicKey)).toThrow();
  });

  it("fails closed when JWT configuration is missing", () => {
    delete process.env.JWT_AUDIENCE;
    expect(() => signToken(claims, privateKey)).toThrow();
    process.env.JWT_AUDIENCE = "test-audience";
  });
});
