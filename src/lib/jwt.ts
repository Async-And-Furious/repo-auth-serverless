import jwt from "jsonwebtoken";

export const JWT_ALGORITHM = "RS256" as const;
export const JWT_EXPIRES_IN_SECONDS = 1800;

/** Contract consumed by the monolith when verifying an authentication token. */
export interface JwtContract {
  algorithm: typeof JWT_ALGORITHM;
  issuer: string;
  audience: string;
  expiresIn: typeof JWT_EXPIRES_IN_SECONDS;
  subject: "Cliente.id";
}

export interface JwtClaims {
  sub: string;
}

interface VerifiedJwtClaims extends JwtClaims {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export function jwtContract(): JwtContract {
  const issuer = process.env.JWT_ISSUER?.trim();
  const audience = process.env.JWT_AUDIENCE?.trim();
  const expiresIn = Number(process.env.JWT_EXPIRES_IN);
  if (!issuer || !audience || expiresIn !== JWT_EXPIRES_IN_SECONDS) {
    throw new Error("JWT_ISSUER, JWT_AUDIENCE, and JWT_EXPIRES_IN=1800 are required");
  }
  return { algorithm: JWT_ALGORITHM, issuer, audience, expiresIn, subject: "Cliente.id" };
}

export function signToken(
  claims: JwtClaims,
  privateKey: string,
): string {
  const config = jwtContract();
  if (typeof claims.sub !== "string" || claims.sub.trim() === "") {
    throw new Error("JWT subject must be the non-empty Cliente.id customer identity");
  }
  return jwt.sign(claims, privateKey, {
    algorithm: JWT_ALGORITHM,
    expiresIn: config.expiresIn,
    issuer: config.issuer,
    audience: config.audience,
  });
}

export function verifyToken(token: string, publicKey: string): VerifiedJwtClaims {
  const config = jwtContract();
  const decoded = jwt.verify(token, publicKey, {
    algorithms: [JWT_ALGORITHM],
    issuer: config.issuer,
    audience: config.audience,
  });

  if (typeof decoded === "string" || typeof decoded.sub !== "string" ||
    typeof decoded.iat !== "number" || typeof decoded.exp !== "number" ||
    decoded.iss !== config.issuer || decoded.aud !== config.audience ||
    decoded.sub.trim() === "") {
    throw new Error("token claims are invalid");
  }

  return { sub: decoded.sub, iat: decoded.iat, exp: decoded.exp, iss: decoded.iss, aud: decoded.aud };
}
