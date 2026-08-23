import jwt from "jsonwebtoken";

const ALGORITHM = "RS256";

export interface JwtClaims {
  sub: string;
  documento: string;
  role: "CLIENTE";
}

interface VerifiedJwtClaims extends JwtClaims {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

function configuration(): { issuer: string; audience: string; expiresIn: number } {
  const issuer = process.env.JWT_ISSUER?.trim();
  const audience = process.env.JWT_AUDIENCE?.trim();
  const expiresIn = Number(process.env.JWT_EXPIRES_IN);
  if (!issuer || !audience || !Number.isInteger(expiresIn) || expiresIn <= 0) {
    throw new Error("JWT_ISSUER, JWT_AUDIENCE, and positive JWT_EXPIRES_IN are required");
  }
  return { issuer, audience, expiresIn };
}

export function signToken(
  claims: JwtClaims,
  privateKey: string,
  expiresInSeconds?: number,
): string {
  const config = configuration();
  return jwt.sign(claims, privateKey, {
    algorithm: ALGORITHM,
    expiresIn: expiresInSeconds ?? config.expiresIn,
    issuer: config.issuer,
    audience: config.audience,
  });
}

export function verifyToken(token: string, publicKey: string): VerifiedJwtClaims {
  const config = configuration();
  const decoded = jwt.verify(token, publicKey, {
    algorithms: [ALGORITHM],
    issuer: config.issuer,
    audience: config.audience,
  });

  if (typeof decoded === "string" || typeof decoded.sub !== "string" ||
    typeof decoded.documento !== "string" || decoded.role !== "CLIENTE" ||
    typeof decoded.iat !== "number" || typeof decoded.exp !== "number" ||
    decoded.iss !== config.issuer || decoded.aud !== config.audience) {
    throw new Error("token claims are invalid");
  }

  return { sub: decoded.sub, documento: decoded.documento, role: "CLIENTE", iat: decoded.iat, exp: decoded.exp, iss: decoded.iss, aud: decoded.aud };
}
