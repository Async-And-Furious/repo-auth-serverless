import jwt from "jsonwebtoken";
import { getPrivateKey, getPublicKey } from "./keys.js";

export interface CustomerTokenPayload {
  sub: string;
  documento: string;
  role: "CLIENTE";
}

export interface VerifiedTokenPayload extends CustomerTokenPayload {
  iat: number;
  exp: number;
}

const ALGORITHM = "RS256" as const;

function getJwtConfig(): { issuer: string; audience: string; expiresIn: number } {
  const issuer = process.env.JWT_ISSUER;
  const audience = process.env.JWT_AUDIENCE;
  const expiresIn = Number(process.env.JWT_EXPIRES_IN);
  if (!issuer || !audience || !Number.isInteger(expiresIn) || expiresIn <= 0 || expiresIn > 86400) {
    throw new Error("invalid JWT configuration");
  }
  return { issuer, audience, expiresIn };
}

export async function signCustomerToken(payload: { sub: string; documento: string }): Promise<{
  token: string;
  expiresIn: number;
}> {
  const config = getJwtConfig();
  const tokenPayload: CustomerTokenPayload = {
    sub: payload.sub,
    documento: payload.documento,
    role: "CLIENTE",
  };

  const token = jwt.sign(tokenPayload, await getPrivateKey(), {
    algorithm: ALGORITHM,
    expiresIn: config.expiresIn,
    issuer: config.issuer,
    audience: config.audience,
  });

  return { token, expiresIn: config.expiresIn };
}

export async function verifyToken(token: string): Promise<VerifiedTokenPayload> {
  const config = getJwtConfig();
  const decoded = jwt.verify(token, await getPublicKey(), {
    algorithms: [ALGORITHM], issuer: config.issuer, audience: config.audience,
  });
  if (typeof decoded === "string" || decoded.role !== "CLIENTE" ||
      typeof decoded.sub !== "string" || typeof decoded.documento !== "string" ||
      typeof decoded.iat !== "number" || typeof decoded.exp !== "number") {
    throw new Error("invalid JWT claims");
  }
  return decoded as VerifiedTokenPayload;
}
