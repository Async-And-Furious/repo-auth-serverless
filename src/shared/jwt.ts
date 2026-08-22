import jwt from "jsonwebtoken";

export interface CustomerTokenPayload {
  sub: string;
  documento: string;
  role: "CLIENTE";
}

export interface VerifiedTokenPayload extends CustomerTokenPayload {
  iat: number;
  exp: number;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export function signCustomerToken(payload: { sub: string; documento: string }): {
  token: string;
  expiresIn: number;
} {
  const expiresIn = Number(process.env.JWT_EXPIRES_IN ?? "3600");
  const tokenPayload: CustomerTokenPayload = {
    sub: payload.sub,
    documento: payload.documento,
    role: "CLIENTE",
  };

  const token = jwt.sign(tokenPayload, getJwtSecret(), { expiresIn });

  return { token, expiresIn };
}

export function verifyToken(token: string): VerifiedTokenPayload {
  return jwt.verify(token, getJwtSecret()) as VerifiedTokenPayload;
}
