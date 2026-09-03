import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { authorizeRequest, extractBearerToken } from "./handler.js";

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

  it("rejects headers containing more than one token", () => {
    expect(extractBearerToken("Bearer abc extra")).toBeNull();
  });
});

describe("authorizer decisions", () => {
  it("allows a valid RS256 token and denies an invalid one", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs1", format: "pem" }, publicKeyEncoding: { type: "pkcs1", format: "pem" } });
    process.env.JWT_ISSUER = "test-issuer";
    process.env.JWT_AUDIENCE = "test-audience";
    process.env.JWT_EXPIRES_IN = "1800";
    const token = jwt.sign({ sub: "c-1" }, privateKey, { algorithm: "RS256", issuer: "test-issuer", audience: "test-audience", expiresIn: 1800 });
    const key = async () => publicKey;
    expect((await authorizeRequest({ headers: { authorization: `Bearer ${token}` }, requestContext: { requestId: "corr-authz" } }, key)).isAuthorized).toBe(true);
    expect((await authorizeRequest({ headers: { authorization: "Bearer not-a-token" }, requestContext: { requestId: "corr-authz" } }, key)).isAuthorized).toBe(false);
  });
});
