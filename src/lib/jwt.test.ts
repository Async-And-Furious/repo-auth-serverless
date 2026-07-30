import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./jwt.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "pkcs1", format: "pem" },
});

describe("signToken / verifyToken", () => {
  it("round-trips claims through sign and verify", () => {
    const token = signToken({ sub: "customer-123" }, privateKey);
    const claims = verifyToken(token, publicKey);
    expect(claims.sub).toBe("customer-123");
  });

  it("rejects an expired token", () => {
    const token = signToken({ sub: "customer-123" }, privateKey, -1);
    expect(() => verifyToken(token, publicKey)).toThrow();
  });

  it("rejects a token signed with a different key pair", () => {
    const { privateKey: otherKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
      publicKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    const token = signToken({ sub: "customer-123" }, otherKey);
    expect(() => verifyToken(token, publicKey)).toThrow();
  });
});
